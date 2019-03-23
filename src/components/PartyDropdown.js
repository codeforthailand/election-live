import React from "react"
import { parties, partyLogo, partyPath } from "../models/information"
import { labelColor, DISPLAY_FONT } from "../styles"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faSearch } from "@fortawesome/free-solid-svg-icons"
import { Link } from "gatsby"

export default ({ open }) => {
  function partyItem(p) {
    return (
      <div
        css={{
          display: "grid",
          gridTemplateColumns: "30px auto",
        }}
      >
        <img
          alt=""
          src={partyLogo(p.name)}
          css={{
            maxHeight: "100%",
            maxWidth: "100%",
            width: "auto",
            height: "auto",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            margin: "auto",
          }}
        />
        <div
          css={{ fontSize: "2em", paddingLeft: 15, fontFamily: DISPLAY_FONT }}
        >
          <b>{p.name}</b>
        </div>
      </div>
    )
  }

  function renderDefaultDropdown() {
    return (
      <div
        css={{
          cursor: "pointer",
        }}
        // @todo #1 toggle open dropdown
        onClick={() => {
          // open = true
        }}
      >
        {partyItem(parties[0])}
      </div>
    )
  }

  function renderDropdown() {
    return (
      <div
        css={{
          overflowX: "hidden",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          position: "relative",
          height: "calc(100vh - 200px)",
        }}
      >
        <div css={{ position: "relative" }}>
          <input
            css={{
              border: `1px solid ${labelColor}`,
              width: "100%",
              boxSizing: "border-box",
              padding: 10,
              fontSize: 16,
              marginTop: 20,
              ["&:focus"]: { outline: 0 },
            }}
            placeholder="ชื่อพรรคการเมือง"
            onChange={v => {
              // @todo #1 search party: implement onChange
            }}
          />
          <div
            css={{
              top: 30,
              position: "absolute",
              right: 10,
              color: labelColor,
            }}
          >
            <FontAwesomeIcon icon={faSearch} />
          </div>
        </div>
        <ul css={{ listStyle: "none", padding: 0 }}>
          {parties.map(p => {
            return (
              <Link
                to={partyPath(p)}
                style={{ textDecoration: "none", color: "black" }}
              >
                <li
                  // @todo #1 toggle close dropdown
                  onClick={() => {
                    // open = false
                  }}
                  key={`${p.name}`}
                  css={{
                    padding: "12px 0px",
                    borderBottom: "1px solid gray",
                    position: "relative",
                  }}
                >
                  {partyItem(p)}
                </li>
              </Link>
            )
          })}
        </ul>
      </div>
    )
  }

  return (
    <div
      css={{
        position: "relative",
        zIndex: 1,
        margin: "0 auto",
        width: "285px",
        marginTop: 30,
      }}
    >
      <div
        css={{
          padding: "10px",
          width: "283px",
          border: "2px solid #e4e4e4",
          alignItems: "center",
          position: "relative",
          boxShadow:
            "0 2px 4px 0 rgba(0,0,0,0.05),0 2px 10px 0 rgba(0,0,0,0.12)!important",
        }}
      >
        {open ? renderDropdown() : renderDefaultDropdown()}
      </div>
      {open ? null : (
        <div
          css={{
            position: "absolute",
            right: "4px",
            top: "calc(50% - 3px)",
            border: "solid #212121",
            borderWidth: "0 2px 2px 0",
            padding: "4px",
            transform: "rotate(45deg)",
          }}
        />
      )}
    </div>
  )
}
