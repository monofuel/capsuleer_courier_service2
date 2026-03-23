## Delivery list component — queries events and shows active deliveries in a table.

import
  std/[dom, asyncjs],
  nimponents,
  ../[sui_client, courier_client],
  ./[wallet_connect, player_stats]

type DeliveryList* = ref object of WebComponent

proc connectedCallback(self: DeliveryList) =
  ## Called when element is added to DOM. Loads deliveries from chain events.
  if connectedAddress == nil or packageId == nil:
    self.innerHTML = "<div class=\"panel\"><p>Connect wallet and set config to view deliveries</p></div>"
    return

  self.innerHTML = "<div class=\"panel\"><h3>Deliveries</h3><p class=\"loading-text\">Loading...</p></div>"

  # Capture element reference into a global JS var.
  # Nim hoists async procs to top level, so closures don't work.
  {.emit: "window.window._dlEl = `self`;".}

  var rpcUrl: cstring
  {.emit: "`rpcUrl` = localStorage.getItem('sui_rpc_url') || 'http://127.0.0.1:9000';".}

  proc load() {.async.} =
    let deliveries = await queryDeliveries(rpcUrl, packageId)

    {.emit: """
    var _dlData = `deliveries`;

    function _dlTruncAddr(a) {
      if (!a || a.length <= 12) return a || '';
      return a.slice(0, 6) + '...' + a.slice(-4);
    }

    function _dlRenderTable(tab) {
      var connAddr = window._courierAddress || '';
      var html = '<div class="panel">' +
        '<div class="panel-header">' +
        '<h3>Deliveries</h3>' +
        '<div class="tab-bar">';

      var tabs = ['all', 'my-requests', 'available'];
      for (var ti = 0; ti < tabs.length; ti++) {
        var t = tabs[ti];
        var label = t === 'all' ? 'All' : t === 'my-requests' ? 'My Requests' : 'Available';
        var cls = t === tab ? ' active' : '';
        html += '<button class="tab' + cls + '" data-tab="' + t + '">' + label + '</button>';
      }

      html += '</div>' +
        '<button class="btn btn-sm" id="refresh-deliveries">Refresh</button>' +
        '</div>' +
        '<table class="delivery-table"><thead><tr>' +
        '<th>ID</th><th>Type</th><th>Qty</th><th>Receiver</th><th>Courier</th><th>Status</th>' +
        '</tr></thead><tbody>';

      var count = 0;
      for (var di = 0; di < _dlData.length; di++) {
        var d = _dlData[di];
        var dd = d.Field1 || d;
        var recv = dd.receiver || '';
        var delivered = !!dd.delivered;

        var show = false;
        if (tab === 'all') show = true;
        else if (tab === 'my-requests') show = (recv === connAddr);
        else if (tab === 'available') show = (!delivered && recv !== connAddr);

        if (!show) continue;
        count++;

        var courier = dd.courier || '';
        var statusCls = delivered ? 'status-delivered' : 'status-pending';
        var statusTxt = delivered ? 'Awaiting Pickup' : 'Pending';

        html += '<tr>' +
          '<td>' + dd.deliveryId + '</td>' +
          '<td>' + dd.typeId + '</td>' +
          '<td>' + dd.quantity + '</td>' +
          '<td>' + _dlTruncAddr(recv) + '</td>' +
          '<td>' + (courier ? _dlTruncAddr(courier) : '\u2014') + '</td>' +
          '<td><span class="' + statusCls + '">' + statusTxt + '</span></td>' +
          '</tr>';
      }

      if (count === 0) {
        html += '<tr><td colspan="6" class="empty-row">No deliveries found</td></tr>';
      }

      html += '</tbody></table></div>';
      window._dlEl.innerHTML = html;

      var tabBtns = window._dlEl.querySelectorAll('.tab');
      for (var bi = 0; bi < tabBtns.length; bi++) {
        tabBtns[bi].addEventListener('click', function() {
          var newTab = this.getAttribute('data-tab');
          localStorage.setItem('delivery_tab', newTab);
          _dlRenderTable(newTab);
        });
      }

      var refreshBtn = window._dlEl.querySelector('#refresh-deliveries');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
          if (window._dlEl.connectedCallback) window._dlEl.connectedCallback();
        });
      }
    }

    var tab = localStorage.getItem('delivery_tab') || 'all';
    _dlRenderTable(tab);
    """.}

  runWithErrorHandler(load(), self)

setupNimponent[DeliveryList]("delivery-list", nil, connectedCallback)

proc refreshDeliveryList*() =
  ## Re-render all delivery-list elements.
  let elements = document.querySelectorAll("delivery-list")
  {.emit: """
  for (var i = 0; i < `elements`.length; i++) {
    if (`elements`[i].connectedCallback) `elements`[i].connectedCallback();
  }
  """.}
