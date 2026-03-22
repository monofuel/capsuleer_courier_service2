## Player stats component — shows connected wallet info.

import
  std/dom,
  nimponents,
  ./wallet_connect

type PlayerStats* = ref object of WebComponent

var
  packageId*: cstring = nil
  configId*: cstring = nil
  adminCapId*: cstring = nil

proc render(self: PlayerStats) =
  ## Render player stats panel.
  if connectedAddress == nil:
    self.innerHTML = "<div class=\"stats-panel\"><p>Connect wallet to view stats</p></div>"
    return

  self.innerHTML = cstring(
    "<div class=\"stats-panel\">" &
    "<h3>Player Stats</h3>" &
    "<div class=\"stat\"><span class=\"stat-label\">Address</span><span class=\"stat-value\">" & $connectedAddress & "</span></div>" &
    "<p class=\"stat-note\">On-chain metrics query coming soon</p>" &
    "</div>"
  )

proc connectedCallback(self: PlayerStats) =
  ## Called when element is added to DOM.
  self.render()

setupNimponent[PlayerStats]("player-stats", nil, connectedCallback)

proc refreshStats*() =
  ## Re-render all player-stats elements.
  let elements = document.querySelectorAll("player-stats")
  {.emit: """
  for (let i = 0; i < `elements`.length; i++) {
    if (`elements`[i].connectedCallback) `elements`[i].connectedCallback();
  }
  """.}
