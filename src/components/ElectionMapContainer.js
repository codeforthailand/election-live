import React, { useCallback, useContext, useMemo, useState } from "react"
import {
  checkFilter,
  filters,
  zones,
  zonePath,
  getZoneByProvinceIdAndZoneNo,
} from "../models/information"
import { useSummaryData } from "../models/LiveDataSubscription"
import {
  isZoneFinished,
  shouldDisplayZoneData,
  nationwidePartyStatsFromSummaryJSON,
} from "../models/PartyStats"
import ElectionMap, { electionMapLoadingData } from "./ElectionMap"
import ElectionMapTooltip from "./ElectionMapTooltip"
import ZoneMark from "./ZoneMark"
import { ZoneFilterContext } from "./ZoneFilterPanel"
import { navigate } from "gatsby"
import { trackEvent } from "../util/analytics"
import { media, WIDE_NAV_MIN_WIDTH } from "../styles"
import { createSelector } from "reselect"
import ErrorBoundary from "./ErrorBoundary"

/**
 * @param {import('../models/LiveDataSubscription').DataState<ElectionDataSource.SummaryJSON>} summaryState
 * @param {IZoneFilter} filter
 */
function getMapData(summaryState, filter) {
  if (!summaryState.completed) {
    return electionMapLoadingData
  } else {
    /** @type {ElectionDataSource.SummaryJSON} */
    const summary = summaryState.data
    const partyStats = nationwidePartyStatsFromSummaryJSON(summary)
    const partylist = []
    for (const row of partyStats) {
      for (let i = 0; i < row.partyListSeats; i++) {
        partylist.push({
          id: `pl-${partylist.length + 1}`,
          partyId: row.party.id,
          complete: true,
          show: true,
        })
      }
    }
    while (partylist.length < 150) {
      partylist.push({
        id: `pl-${partylist.length + 1}`,
        partyId: "nope",
        complete: true,
        show: false,
      })
    }
    return [
      ...zones.map((zone, i) => {
        // @todo #1 This logic is now available in getSeatDisplayModel. Refactor this component to use it.
        const winningCandidate = (summary.zoneWinningCandidateMap[
          zone.provinceId
        ] || {})[zone.no]
        const stats = (summary.zoneStatsMap[zone.provinceId] || {})[zone.no]
        const candidate =
          shouldDisplayZoneData(stats) &&
          winningCandidate &&
          winningCandidate.score > stats.noVotes
            ? winningCandidate
            : null
        return {
          id: `${zone.provinceId}-${zone.no}`,
          partyId: candidate ? candidate.partyId : "nope",
          complete: isZoneFinished(stats),
          show: checkFilter(filter, zone),
        }
      }),
      ...partylist,
    ]
  }
}

const createMapData = createSelector(
  ({ zones }) => zones,
  ({ selectedZone }) =>
    selectedZone
      ? `${selectedZone.provinceId}-${selectedZone.zoneNo}`
      : selectedZone,
  (zones, selectedZone) => ({ zones, selectedZone })
)

export default function ElectionMapContainer({ currentZone }) {
  const summaryState = useSummaryData()
  const currentFilterName = useContext(ZoneFilterContext)
  const currentFilter = filters[currentFilterName]
  const [mapTip, setMapTip] = useState(null)
  const mapZones = useMemo(() => getMapData(summaryState, currentFilter), [
    summaryState,
    currentFilter,
  ])

  const onInit = useCallback(map => {}, [])
  const onZoneMouseenter = useCallback((zone, mouseEvent) => {
    setMapTip({ zone, mouseEvent })
  }, [])
  const onZoneMousemove = useCallback((zone, mouseEvent) => {
    setMapTip({ zone, mouseEvent })
  }, [])
  const onZoneMouseleave = useCallback((zone, mouseEvent) => {
    setMapTip(null)
  }, [])
  const onZoneClick = useCallback(zone => {
    if (zone) {
      const match = zone.data.id.match(/^(\d+)-(\d+)$/)
      if (match) {
        trackEvent("View zone", { via: "Map" })
        navigate(zonePath(getZoneByProvinceIdAndZoneNo(+match[1], +match[2])))
      }
    } else {
      trackEvent("Clear zone", { via: "Map" })
      navigate("")
    }
  }, [])

  return (
    <div
      css={{
        margin: "0 -16px",
        [media(WIDE_NAV_MIN_WIDTH)]: {
          marginLeft: "0 0",
        },
      }}
    >
      {mapTip && (
        <div
          css={{
            position: "absolute",
            zIndex: 10,
            padding: 6,
            backgroundColor: "#fff",
            pointerEvents: "none",
            maxWidth: 220,
            boxShadow: "0 0 4px 0 rgba(0, 0, 0, 0.3)",
            top: mapTip.mouseEvent.clientY + 10,
            left: mapTip.mouseEvent.clientX + 10,
          }}
        >
          <ErrorBoundary name="Election map tooltip">
            <ElectionMapTooltip
              positionId={mapTip.zone.data.id}
              positions={mapZones}
            />
          </ErrorBoundary>
        </div>
      )}
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        <ZoneMark color="#777" isCompleted />
        นับถึง 95% &nbsp;
        <ZoneMark color="#777" />
        นับแล้วน้อยกว่า 95%
      </div>
      <div style={{ textAlign: "center" }}>
        <ElectionMap
          data={createMapData({
            zones: mapZones,
            selectedZone: currentZone,
          })}
          onInit={onInit}
          onZoneMouseenter={onZoneMouseenter}
          onZoneMousemove={onZoneMousemove}
          onZoneMouseleave={onZoneMouseleave}
          onZoneClick={onZoneClick}
        />
      </div>
    </div>
  )
}
