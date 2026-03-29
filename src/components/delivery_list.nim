## Delivery list component — queries events and shows deliveries in prioritized sections
## with inline action buttons (Pickup / Deliver).

{.push warning[UnusedImport]: off.}
import
  std/[dom, asyncjs],
  nimponents,
  ../[sui_client, courier_client, config],
  ./[wallet_connect, player_stats, leaderboard]
{.pop.}

type DeliveryList* = ref object of WebComponent

proc connectedCallback(self: DeliveryList) =
  ## Called when element is added to DOM. Loads deliveries from chain events.
  if packageId == nil:
    self.innerHTML = "<div class=\"panel\"><p>Set config to view deliveries</p></div>"
    return

  self.innerHTML = "<div class=\"panel\"><h3>Deliveries</h3><p class=\"loading-text\">Loading<span class=\"loading-dots\"><span>.</span><span>.</span><span>.</span></span></p></div>"

  {.emit: "window._dlEl = `self`;".}

  let rpcUrl = config.rpcUrl
  let cfgId = configId
  let pkgId = packageId
  let currentSsu = ssuId

  proc load() {.async.} =
    let deliveries = await queryDeliveries(rpcUrl, pkgId)

    {.emit: """
    var _dlData = `deliveries`;
    var connAddr = window._courierAddress || '';
    var curSsu = `currentSsu` || '';

    function _dlAddr(a) {
      if (!a) return '';
      var cached = window._nameCache && window._nameCache[a];
      if (cached) return cached;
      if (a.length <= 12) return a;
      return a.slice(0, 6) + '...' + a.slice(-4);
    }

    function _dlTypeName(typeId) {
      if (window._itemTypes) {
        for (var i = 0; i < window._itemTypes.length; i++) {
          if (window._itemTypes[i].id == typeId) return window._itemTypes[i].name;
        }
      }
      return typeId;
    }

    function _ssuClass(ssuId) {
      return (curSsu && ssuId === curSsu) ? ' class="same-ssu"' : '';
    }

    // Split deliveries into 3 buckets.
    var pickup = [], pending = [], available = [];
    for (var i = 0; i < _dlData.length; i++) {
      var d = _dlData[i].Field1 || _dlData[i];
      var recv = d.receiver || '';
      var isMe = (recv === connAddr);
      if (d.delivered && isMe) pickup.push(d);
      else if (!d.delivered && isMe) pending.push(d);
      else if (!d.delivered && !isMe) available.push(d);
    }

    var html = '';

    // --- Current SSU info ---
    var ssuDisplay = curSsu ? _dlAddr(curSsu) : 'No SSU selected';
    html += '<div class="panel"><p style="font-size:11px;color:var(--text-muted)">Current SSU: <span style="color:var(--text-primary)">' + ssuDisplay + '</span></p></div>';

    // --- Section 1: Ready for Pickup ---
    html += '<div class="panel"><div class="panel-header"><h3>Ready for Pickup</h3>' +
      '<button class="btn btn-sm" id="refresh-deliveries">Refresh</button></div>';
    if (pickup.length === 0) {
      html += '<p class="empty-row">No deliveries awaiting pickup</p>';
    } else {
      html += '<table class="delivery-table"><thead><tr>' +
        '<th>ID</th><th>SSU</th><th>Type</th><th>Qty</th><th>Courier</th><th></th>' +
        '</tr></thead><tbody>';
      for (var i = 0; i < pickup.length; i++) {
        var d = pickup[i];
        html += '<tr' + _ssuClass(d.storageUnitId) + '><td>' + d.deliveryId + '</td>' +
          '<td>' + _dlAddr(d.storageUnitId) + '</td>' +
          '<td>' + _dlTypeName(d.typeId) + '</td>' +
          '<td>' + d.quantity + '</td>' +
          '<td>' + _dlAddr(d.courier) + '</td>' +
          '<td><button class="btn btn-sm btn-pickup" data-action="pickup" data-id="' + d.deliveryId + '">Pick up</button></td></tr>';
      }
      html += '</tbody></table>';
    }
    html += '</div>';

    // --- Section 2: Your Pending Orders ---
    html += '<div class="panel"><h3>Your Pending Orders</h3>';
    if (pending.length === 0) {
      html += '<p class="empty-row">No pending orders</p>';
    } else {
      html += '<table class="delivery-table"><thead><tr>' +
        '<th>ID</th><th>SSU</th><th>Type</th><th>Qty</th><th>Status</th>' +
        '</tr></thead><tbody>';
      for (var i = 0; i < pending.length; i++) {
        var d = pending[i];
        html += '<tr' + _ssuClass(d.storageUnitId) + '><td>' + d.deliveryId + '</td>' +
          '<td>' + _dlAddr(d.storageUnitId) + '</td>' +
          '<td>' + _dlTypeName(d.typeId) + '</td>' +
          '<td>' + d.quantity + '</td>' +
          '<td><span class="status-pending">Pending</span></td></tr>';
      }
      html += '</tbody></table>';
    }
    html += '</div>';

    // --- Section 3: Available Deliveries ---
    html += '<div class="panel"><h3>Available Deliveries</h3>';
    if (available.length === 0) {
      html += '<p class="empty-row">No deliveries available</p>';
    } else {
      html += '<table class="delivery-table"><thead><tr>' +
        '<th>ID</th><th>SSU</th><th>Type</th><th>Qty</th><th>Receiver</th><th></th>' +
        '</tr></thead><tbody>';
      for (var i = 0; i < available.length; i++) {
        var d = available[i];
        html += '<tr' + _ssuClass(d.storageUnitId) + '><td>' + d.deliveryId + '</td>' +
          '<td>' + _dlAddr(d.storageUnitId) + '</td>' +
          '<td>' + _dlTypeName(d.typeId) + '</td>' +
          '<td>' + d.quantity + '</td>' +
          '<td>' + _dlAddr(d.receiver) + '</td>' +
          '<td><button class="btn btn-sm" data-action="deliver" data-id="' + d.deliveryId + '">Deliver</button></td></tr>';
      }
      html += '</tbody></table>';
    }
    html += '</div>';

    window._dlEl.innerHTML = html;

    // Wire up refresh button.
    var refreshBtn = window._dlEl.querySelector('#refresh-deliveries');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', function() {
        if (window._dlEl.connectedCallback) window._dlEl.connectedCallback();
      });
    }

    // Wire up action buttons via event delegation.
    window._dlEl.addEventListener('click', function(ev) {
      var btn = ev.target.closest('[data-action]');
      if (!btn) return;
      var action = btn.getAttribute('data-action');
      var deliveryId = btn.getAttribute('data-id');
      btn.disabled = true;
      btn.textContent = 'Submitting...';

      var tx;
      if (action === 'pickup') {
        tx = `buildPickup`(`cfgId`, `pkgId`, deliveryId);
      } else {
        tx = `buildFulfillDelivery`(`cfgId`, `pkgId`, deliveryId);
      }

      `signAndExecute`(tx).then(function(result) {
        if (`isSuccess`(result)) {
          btn.textContent = 'Done!';
          btn.style.background = 'var(--success)';
          // Track demo state mutations.
          if (`isDemo`) {
            if (!window._demoFulfilled) window._demoFulfilled = {};
            if (!window._demoPickedUp) window._demoPickedUp = {};
            if (action === 'pickup') window._demoPickedUp[deliveryId] = true;
            else window._demoFulfilled[deliveryId] = true;
          }
          `refreshStats`();
          setTimeout(function() {
            `refreshDeliveryList`();
            `refreshLeaderboard`();
          }, 1000);
        } else {
          btn.textContent = 'Failed';
          btn.style.background = 'var(--error)';
        }
      }).catch(function(err) {
        console.error('Action error:', err);
        btn.textContent = 'Error';
        btn.style.background = 'var(--error)';
        btn.disabled = false;
        setTimeout(function() {
          btn.textContent = action === 'pickup' ? 'Pick up' : 'Deliver';
          btn.style.background = '';
        }, 3000);
      });
    });
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
