## Likes leaderboard — ranks couriers by total likes earned.

import
  std/[dom, asyncjs],
  nimponents,
  ../[sui_client, courier_client],
  ./player_stats

type CourierLeaderboard* = ref object of WebComponent

proc connectedCallback(self: CourierLeaderboard) =
  ## Called when element is added to DOM. Queries fulfilled events for leaderboard.
  if packageId == nil:
    self.innerHTML = "<div class=\"panel\"><p>Set config to view leaderboard</p></div>"
    return

  {.emit: "window._lbEl = `self`;".}

  self.innerHTML = "<div class=\"panel\"><h3>Courier Leaderboard</h3><p class=\"loading-text\">Loading...</p></div>"

  var rpcUrl: cstring
  {.emit: "`rpcUrl` = localStorage.getItem('sui_rpc_url') || 'http://127.0.0.1:9000';".}

  proc load() {.async.} =
    let entries = await queryLeaderboard(rpcUrl, packageId)

    {.emit: """
    function displayAddr(a) {
      if (!a) return '';
      var cached = window._nameCache && window._nameCache[a];
      if (cached) return cached;
      if (a.length <= 12) return a;
      return a.slice(0, 6) + '...' + a.slice(-4);
    }

    var connAddr = window._courierAddress || '';
    var html = '<div class="panel">' +
      '<div class="panel-header"><h3>Courier Leaderboard</h3>' +
      '<button class="btn btn-sm" id="refresh-leaderboard">Refresh</button></div>';

    if (`entries`.length === 0) {
      html += '<p class="empty-row">No deliveries fulfilled yet</p>';
    } else {
      html += '<table class="delivery-table"><thead><tr>' +
        '<th>#</th><th>Courier</th><th>Likes</th><th>Deliveries</th>' +
        '</tr></thead><tbody>';

      for (var i = 0; i < `entries`.length; i++) {
        var e = `entries`[i];
        var dd = e.Field1 || e;
        var addr = dd.address || '';
        var isMe = (addr === connAddr);
        var rowClass = isMe ? ' class="highlight-row"' : '';
        html += '<tr' + rowClass + '>' +
          '<td>' + (i + 1) + '</td>' +
          '<td>' + displayAddr(addr) + (isMe ? ' (you)' : '') + '</td>' +
          '<td>' + (dd.totalLikes || 0) + '</td>' +
          '<td>' + (dd.deliveriesCompleted || 0) + '</td>' +
          '</tr>';
      }
      html += '</tbody></table>';
    }

    html += '</div>';
    window._lbEl.innerHTML = html;

    var refreshBtn = window._lbEl.querySelector('#refresh-leaderboard');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', function() {
        if (window._lbEl.connectedCallback) window._lbEl.connectedCallback();
      });
    }
    """.}

  runWithErrorHandler(load(), self)

setupNimponent[CourierLeaderboard]("courier-leaderboard", nil, connectedCallback)

proc refreshLeaderboard*() =
  ## Re-render all leaderboard elements.
  let elements = document.querySelectorAll("courier-leaderboard")
  {.emit: """
  for (var i = 0; i < `elements`.length; i++) {
    if (`elements`[i].connectedCallback) `elements`[i].connectedCallback();
  }
  """.}
