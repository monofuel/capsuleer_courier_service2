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

proc refreshDeliveryList*() =
  ## Re-render all delivery-list elements.
  let elements = document.querySelectorAll("delivery-list")
  {.emit: """
  for (var i = 0; i < `elements`.length; i++) {
    if (`elements`[i].connectedCallback) `elements`[i].connectedCallback();
  }
  """.}

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
  let worldPkg = worldPackageId

  proc load() {.async.} =
    let deliveries = await queryDeliveries(rpcUrl, pkgId)

    # Resolve character names for all addresses in deliveries.
    if rpcUrl != nil and worldPkg != nil:
      {.emit: """
      var _nameAddrs = [];
      var _dd = `deliveries`;
      for (var i = 0; i < _dd.length; i++) {
        var d = _dd[i].Field1 || _dd[i];
        if (d.receiver) _nameAddrs.push(d.receiver);
        if (d.courier) _nameAddrs.push(d.courier);
      }
      await `resolveCharacterNames`(`rpcUrl`, `worldPkg`, _nameAddrs);
      """.}

    {.emit: """
    var _dlData = `deliveries`;
    var connAddr = window._courierAddress || '';
    var curSsu = `currentSsu` || '';
    var adminAddr = '0xafb51cd5dad394a2ad45397eb14545cf2fd52c8e314485233761cee0b35d1d24';
    var isAdmin = (connAddr === adminAddr);

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
    // Admin sees own undelivered orders in both Pending and Available (for self-delivery testing).
    var pickup = [], pending = [], available = [];
    for (var i = 0; i < _dlData.length; i++) {
      var d = _dlData[i].Field1 || _dlData[i];
      var recv = d.receiver || '';
      var isMe = (recv === connAddr);
      if (d.delivered && isMe) pickup.push(d);
      else if (!d.delivered && isMe) {
        pending.push(d);
        if (isAdmin) available.push(d);
      }
      else if (!d.delivered && !isMe) available.push(d);
    }

    var html = '';

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
          '<td><button class="btn btn-sm btn-pickup" data-action="pickup" data-id="' + d.deliveryId + '" data-ssu="' + d.storageUnitId + '" data-type="' + d.typeId + '" data-qty="' + d.quantity + '">Pick up</button></td></tr>';
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
        var isSelfDeliver = isAdmin && (d.receiver === connAddr);
        var btnLabel = isSelfDeliver ? 'Deliver <span class="admin-label">(owner)</span>' : 'Deliver';
        var ownerAttr = isSelfDeliver ? ' data-owner="true"' : '';
        html += '<tr' + _ssuClass(d.storageUnitId) + '><td>' + d.deliveryId + '</td>' +
          '<td>' + _dlAddr(d.storageUnitId) + '</td>' +
          '<td>' + _dlTypeName(d.typeId) + '</td>' +
          '<td>' + d.quantity + '</td>' +
          '<td>' + _dlAddr(d.receiver) + '</td>' +
          '<td><button class="btn btn-sm"' + ownerAttr + ' data-action="deliver" data-id="' + d.deliveryId + '" data-ssu="' + d.storageUnitId + '" data-type="' + d.typeId + '" data-qty="' + d.quantity + '">' + btnLabel + '</button></td></tr>';
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

    // Capture Nim closure vars for use inside event listener (where `this` changes).
    var _cfgId = `cfgId`;
    var _pkgId = `pkgId`;
    var _worldPkg = `worldPkg`;
    var _curSsu = curSsu;
    var _refreshStats = `refreshStats`;
    var _refreshDeliveryList = `refreshDeliveryList`;
    var _refreshLeaderboard = `refreshLeaderboard`;
    var _isDemo = `isDemo`;
    var _isSuccess = `isSuccess`;

    // Wire up action buttons via event delegation.
    // Remove old handler to prevent duplicate firing on refresh.
    if (window._dlEl._clickHandler) {
      window._dlEl.removeEventListener('click', window._dlEl._clickHandler);
    }
    window._dlEl._clickHandler = function(ev) {
      var btn = ev.target.closest('[data-action]');
      if (!btn) return;
      var action = btn.getAttribute('data-action');
      var deliveryId = btn.getAttribute('data-id');
      var deliverySsu = btn.getAttribute('data-ssu') || _curSsu;
      var deliveryType = btn.getAttribute('data-type');
      var deliveryQty = parseInt(btn.getAttribute('data-qty')) || 1;
      btn.disabled = true;
      btn.textContent = 'Submitting...';

      var charId = window._courierCharId;
      if (!charId) {
        console.error('No character ID found — connect wallet first');
        btn.textContent = 'No Character';
        btn.style.background = 'var(--error)';
        btn.disabled = false;
        setTimeout(function() {
          btn.textContent = action === 'pickup' ? 'Pick up' : 'Deliver';
          btn.style.background = '';
        }, 3000);
        return;
      }

      console.log('[action]', action, 'id:', deliveryId, 'ssu:', deliverySsu, 'type:', deliveryType, 'qty:', deliveryQty, 'char:', charId);

      var tx;
      if (action === 'pickup') {
        if (window._courierIsOwner) {
          tx = `buildOwnerPickup`(_cfgId, _pkgId, deliverySsu, charId, deliveryId);
        } else {
          tx = `buildPickup`(_cfgId, _pkgId, deliverySsu, charId, deliveryId);
        }
      } else if (btn.hasAttribute('data-owner')) {
        // SSU owner path — uses owner_fulfill_delivery (single moveCall, no PTB).
        tx = `buildOwnerFulfillDelivery`(_cfgId, _pkgId, deliverySsu, charId, deliveryId);
      } else {
        var ownerCapId = window._courierOwnerCapId;
        var ownerCapVer = window._courierOwnerCapVersion;
        var ownerCapDig = window._courierOwnerCapDigest;
        if (!ownerCapId || !ownerCapVer || !ownerCapDig) {
          console.error('No OwnerCap info — cannot withdraw items');
          btn.textContent = 'No OwnerCap';
          btn.style.background = 'var(--error)';
          btn.disabled = false;
          setTimeout(function() { btn.textContent = 'Deliver'; btn.style.background = ''; }, 3000);
          return;
        }
        tx = `buildFulfillDelivery`(_cfgId, _pkgId, _worldPkg, deliverySsu,
          charId, ownerCapId, ownerCapVer, ownerCapDig,
          deliveryId, deliveryType, deliveryQty);
      }

      `signAndExecute`(tx).then(function(result) {
        if (_isSuccess(result)) {
          // Track demo state mutations.
          if (_isDemo) {
            if (!window._demoFulfilled) window._demoFulfilled = {};
            if (!window._demoPickedUp) window._demoPickedUp = {};
            if (action === 'pickup') window._demoPickedUp[deliveryId] = true;
            else window._demoFulfilled[deliveryId] = true;
          }
          // Remember current delivery count, then poll until it changes.
          var _prevCount = window._dlEl.querySelectorAll('[data-action]').length;
          var _pollAttempts = 0;
          function _pollRefresh() {
            _pollAttempts++;
            _refreshStats();
            _refreshDeliveryList();
            _refreshLeaderboard();
            if (_pollAttempts < 3) {
              setTimeout(function() {
                var newCount = window._dlEl.querySelectorAll('[data-action]').length;
                if (newCount === _prevCount) _pollRefresh();
              }, 3000);
            }
          }
          _pollRefresh();
        } else {
          btn.textContent = 'Failed';
          btn.style.background = 'var(--error)';
          console.error('Transaction failed — full result:', JSON.stringify(result, null, 2));
          if (result && result.effects) console.error('Transaction effects:', JSON.stringify(result.effects, null, 2));
        }
      }).catch(function(err) {
        console.error('Action error:', err);
        console.error('Action error message:', err.message);
        console.error('Action error JSON:', JSON.stringify(err, null, 2));
        if (err.cause) console.error('Action error cause:', err.cause);
        btn.textContent = 'Error';
        btn.style.background = 'var(--error)';
        btn.disabled = false;
        setTimeout(function() {
          btn.textContent = action === 'pickup' ? 'Pick up' : 'Deliver';
          btn.style.background = '';
        }, 3000);
      });
    };
    window._dlEl.addEventListener('click', window._dlEl._clickHandler);
    """.}

  runWithErrorHandler(load(), self)

setupNimponent[DeliveryList]("delivery-list", nil, connectedCallback)
