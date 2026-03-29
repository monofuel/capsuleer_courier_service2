## Player stats component — shows likes, deliveries completed, pending requests.

import
  std/[dom, asyncjs],
  nimponents,
  ../[sui_client, courier_client, config],
  ./wallet_connect

type PlayerStats* = ref object of WebComponent

proc connectedCallback(self: PlayerStats) =
  ## Called when element is added to DOM. Queries player stats from events.
  if connectedAddress == nil:
    self.innerHTML = "<div class=\"stats-panel\"><p>Connect wallet to view stats</p></div>"
    return

  if packageId == nil:
    self.innerHTML = "<div class=\"stats-panel\"><h3>Player Stats</h3><p>Set config to view stats</p></div>"
    return

  # Capture element ref for async use.
  {.emit: "window._psEl = `self`;".}

  self.innerHTML = "<div class=\"stats-panel\"><h3>Player Stats</h3><p class=\"loading-text\">Loading...</p></div>"

  let rpcUrl = config.rpcUrl

  proc load() {.async.} =
    let stats = await queryPlayerStats(rpcUrl, packageId, connectedAddress)

    {.emit: """
    var s = `stats`;
    var addr = window._courierAddress || '';
    var truncAddr = addr.length > 12 ? addr.slice(0, 6) + '...' + addr.slice(-4) : addr;
    window._psEl.innerHTML =
      '<div class="stats-panel">' +
      '<h3>Player Stats</h3>' +
      '<div class="stat"><span class="stat-label">Address</span><span class="stat-value">' + truncAddr + '</span></div>' +
      '<div class="stat"><span class="stat-label">Likes Earned</span><span class="stat-value">' + (s.likes || 0) + '</span></div>' +
      '<div class="stat"><span class="stat-label">Deliveries Completed</span><span class="stat-value">' + (s.deliveriesCompleted || 0) + '</span></div>' +
      '<div class="stat"><span class="stat-label">Pending Requests</span><span class="stat-value">' + (s.pendingRequests || 0) + '</span></div>' +
      '</div>';
    """.}

  runWithErrorHandler(load(), self)

setupNimponent[PlayerStats]("player-stats", nil, connectedCallback)

proc refreshStats*() =
  ## Re-render all player-stats elements.
  let elements = document.querySelectorAll("player-stats")
  {.emit: """
  for (var i = 0; i < `elements`.length; i++) {
    if (`elements`[i].connectedCallback) `elements`[i].connectedCallback();
  }
  """.}
