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

  var rpcUrl: cstring
  {.emit: "`rpcUrl` = localStorage.getItem('sui_rpc_url') || 'http://127.0.0.1:9000';".}

  proc load() {.async.} =
    let deliveries = await queryDeliveries(rpcUrl, packageId)

    # Render entirely in JS to avoid mangled name references.
    {.emit: """
    function truncAddr(a) {
      if (!a || a.length <= 12) return a || '';
      return a.slice(0, 6) + '...' + a.slice(-4);
    }

    function renderTable(tab) {
      const connAddr = window._courierAddress || '';
      let html = '<div class="panel">' +
        '<div class="panel-header">' +
        '<h3>Deliveries</h3>' +
        '<div class="tab-bar">';

      for (const t of ['all', 'my-requests', 'available']) {
        const label = t === 'all' ? 'All' : t === 'my-requests' ? 'My Requests' : 'Available';
        const cls = t === tab ? ' active' : '';
        html += '<button class="tab' + cls + '" data-tab="' + t + '">' + label + '</button>';
      }

      html += '</div>' +
        '<button class="btn btn-sm" id="refresh-deliveries">Refresh</button>' +
        '</div>' +
        '<table class="delivery-table"><thead><tr>' +
        '<th>ID</th><th>Type</th><th>Qty</th><th>Receiver</th><th>Courier</th><th>Status</th>' +
        '</tr></thead><tbody>';

      let count = 0;
      for (const d of `deliveries`) {
        const dd = d.Field1 || d;
        const recv = dd.receiver || '';
        const delivered = !!dd.delivered;

        let show = false;
        if (tab === 'all') show = true;
        else if (tab === 'my-requests') show = (recv === connAddr);
        else if (tab === 'available') show = (!delivered && recv !== connAddr);

        if (!show) continue;
        count++;

        const courier = dd.courier || '';
        const statusCls = delivered ? 'status-delivered' : 'status-pending';
        const statusTxt = delivered ? 'Awaiting Pickup' : 'Pending';

        html += '<tr>' +
          '<td>' + dd.deliveryId + '</td>' +
          '<td>' + dd.typeId + '</td>' +
          '<td>' + dd.quantity + '</td>' +
          '<td>' + truncAddr(recv) + '</td>' +
          '<td>' + (courier ? truncAddr(courier) : '\u2014') + '</td>' +
          '<td><span class="' + statusCls + '">' + statusTxt + '</span></td>' +
          '</tr>';
      }

      if (count === 0) {
        html += '<tr><td colspan="6" class="empty-row">No deliveries found</td></tr>';
      }

      html += '</tbody></table></div>';
      `self`.innerHTML = html;

      // Attach tab handlers.
      `self`.querySelectorAll('.tab').forEach(function(btn) {
        btn.addEventListener('click', function() {
          const newTab = this.getAttribute('data-tab');
          localStorage.setItem('delivery_tab', newTab);
          renderTable(newTab);
        });
      });

      // Attach refresh handler.
      const refreshBtn = `self`.querySelector('#refresh-deliveries');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
          `self`.connectedCallback();
        });
      }
    }

    const tab = localStorage.getItem('delivery_tab') || 'all';
    renderTable(tab);
    """.}

  runWithErrorHandler(load(), self)

setupNimponent[DeliveryList]("delivery-list", nil, connectedCallback)

proc refreshDeliveryList*() =
  ## Re-render all delivery-list elements.
  let elements = document.querySelectorAll("delivery-list")
  {.emit: """
  for (let i = 0; i < `elements`.length; i++) {
    if (`elements`[i].connectedCallback) `elements`[i].connectedCallback();
  }
  """.}
