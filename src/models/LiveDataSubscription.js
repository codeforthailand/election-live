import axios from "axios"
import _ from "lodash"
import { observable, onBecomeObserved, runInAction } from "mobx"
import { useEffect, useMemo, useRef } from "react"
import { Debug } from "../util/Debug"
import { overrideDirectory } from "./TimeTraveling"
import { performOverrideOnSummaryJSON } from "./ResultOverride"
import { useComputed } from "./MobXHooks"

const LATEST_FILE_URL = "/data/latest.json"
const DATA_FILE_URL_BASE = "/data"

/**
 * @template T
 * @typedef {object} DataState
 * @prop {boolean} loading
 * @prop {boolean} failed
 * @prop {boolean} completed
 * @prop {T} data
 * @prop {Error} error
 */

const latestFileResource = createResource("latestFile")
onBecomeObserved(
  latestFileResource,
  "state",
  _.once(() => {
    latestFileResource.debug("Become observed")
    fetchLatestFile()
    setInterval(fetchLatestFile, 60000)
  })
)
async function fetchLatestFile() {
  return latestFileResource.fetch(async () => {
    const url = LATEST_FILE_URL + "?cachebust=" + Math.floor(Date.now() / 30000)
    const response = await axios.get(url)
    return response.data
  })
}
const getDataFileResource = _.memoize(path => {
  const dataFileResource = createResource("dataFile:" + path)
  onBecomeObserved(
    dataFileResource,
    "state",
    _.once(() => {
      dataFileResource.debug("Become observed")
      fetchFile()
    })
  )
  async function fetchFile() {
    return dataFileResource.fetch(async () => {
      const url = DATA_FILE_URL_BASE + path
      const response = await axios.get(url)
      return response.data
    })
  }
  return dataFileResource
})

/**
 * @param {*} name
 * @param {*} fetcher
 * @param {object} options
 */
function createResource(name) {
  const debug = Debug("elect:resource:" + name)
  const state = observable.box(
    {
      loading: true,
      failed: false,
      completed: false,
      data: null,
    },
    { deep: false }
  )
  return observable({
    debug,
    get state() {
      return state.get()
    },
    async fetch(fetcher) {
      debug("Fetching...")
      runInAction(`fetch ${name} start`, () => {
        state.set({ ...state.get(), loading: true })
      })
      try {
        const data = await fetcher()
        debug("Fetching success", data)
        runInAction(`fetch ${name} success`, () => {
          state.set({
            ...state.get(),
            failed: false,
            completed: true,
            loading: false,
            data: data,
            error: null,
          })
        })
      } catch (error) {
        debug("Fetching failed", error)
        runInAction(`fetch ${name} failed`, () => {
          state.set({
            ...state.get(),
            failed: true,
            loading: false,
            error: error,
          })
        })
      }
    },
  })
}

function getLatestDirectoryState() {
  if (overrideDirectory.get()) {
    return {
      completed: true,
      data: overrideDirectory.get(),
    }
  }
  const latestState = latestFileResource.state
  if (!latestState.completed) return latestState
  const latestPointer = _.maxBy(latestState.data.pointers, "timestamp")
  if (!latestPointer) {
    return {
      error: new Error("No latest pointer found"),
      failed: true,
    }
  }
  const curtainDisabled = () => {
    try {
      return (
        typeof localStorage === "object" &&
        localStorage &&
        !!localStorage.ELECT_DISABLE_CURTAIN
      )
    } catch (e) {
      return false
    }
  }
  if (!curtainDisabled && (latestState.data.control || {}).locked === "TRUE") {
    return {
      error: new Error("ยังไม่พร้อมแสดงข้อมูล"),
      failed: true,
    }
  }
  return {
    completed: true,
    data: latestPointer.directory,
  }
}

function getLatestDataFileState(fileName) {
  const latestDirectoryState = getLatestDirectoryState()
  if (!latestDirectoryState.completed) return latestDirectoryState
  const latestDirectory = latestDirectoryState.data
  const dataFileState = getDataFileResource(`/${latestDirectory}${fileName}`)
    .state
  return dataFileState
}

export function useLockedState() {
  return useComputed(() => {
    const latestState = latestFileResource.state
    if (!latestState.completed) return false
    return (latestState.data.control || {}).locked === "TRUE"
  }, [])
}

export function useStatus() {
  return useComputed(() => {
    const latestState = latestFileResource.state
    if (!latestState.completed) return false
    const status = (latestState.data.control || {}).status
    if (status === "null") return null
    if (status === ".") return null
    return status
  }, [])
}

/**
 * @template T
 * @param {DataState<T>} state
 */
function useInertState(state) {
  const ref = useRef(state)
  const combine = (previous, current) => {
    if (
      (!current.completed && previous.completed) ||
      (!current.data && previous.data)
    ) {
      return {
        ...previous,
        ...current,
        completed: current.completed || previous.completed,
        data: current.data || previous.data,
      }
    }
    return current
  }
  const result = combine(ref.current, state)
  useEffect(() => {
    ref.current = result
  })
  return result
}

/** @return {DataState<string>} */
export function useLatestDirectoryState() {
  return useComputed(() => getLatestDirectoryState(), [])
}

/** @return {DataState<ElectionDataSource.SummaryJSON>} */
export function useSummaryData() {
  const state = useComputed(
    () => getLatestDataFileState("/SummaryJSON.json"),
    []
  )
  return useMappedDataState(useInertState(state), performOverrideOnSummaryJSON)
}

/** @return {DataState<ElectionDataSource.PerProvinceJSON>} */
export function usePerProvinceData(provinceId) {
  const state = useComputed(
    () => getLatestDataFileState(`/PerProvinceJSON/${provinceId}.json`),
    [provinceId]
  )
  return useInertState(state)
}

/** @return {DataState<ElectionDataSource.PerZoneData>} */
export function usePerZoneData(provinceId, zoneNo) {
  const perProvinceData = usePerProvinceData(provinceId)
  return useMemo(
    () => ({
      ...perProvinceData,
      data:
        perProvinceData.data && perProvinceData.data.zoneInformationMap[zoneNo],
    }),
    [perProvinceData, zoneNo]
  )
}

/** @return {DataState<ElectionDataSource.PerPartyJSON>} */
export function usePerPartyData(partyId) {
  const state = useComputed(
    () => getLatestDataFileState(`/PerPartyJSON/${partyId}.json`),
    [partyId]
  )
  return useInertState(state)
}

function useMappedDataState(state, mapper) {
  return useMemo(
    () => (state.data ? { ...state, data: mapper(state.data) } : state),
    [state, mapper]
  )
}
