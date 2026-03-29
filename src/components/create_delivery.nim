## Create delivery request form component.
## Searchable item type dropdown fetches all types from datahub API.

import
  std/[dom, asyncjs],
  nimponents,
  ../[sui_client, courier_client, config],
  ./[wallet_connect, player_stats, delivery_list]

type CreateDelivery* = ref object of WebComponent

proc render(self: CreateDelivery)

proc fetchAllItemTypes() =
  ## Fetch all item types from datahub API (paginated), store in window._itemTypes.
  {.emit: """
  if (window._itemTypes || window._itemTypesFetching || !`datahubHost`) return;
  window._itemTypesFetching = true;
  window._itemTypes = [];

  function fetchPage(offset) {
    var url = `datahubHost` + '/v2/types?limit=100&offset=' + offset;
    return fetch(url).then(function(r) { return r.json(); }).then(function(resp) {
      var data = resp.data || [];
      for (var i = 0; i < data.length; i++) {
        window._itemTypes.push({
          id: data[i].id,
          name: data[i].name || ('Type ' + data[i].id),
          iconUrl: data[i].iconUrl || ''
        });
      }
      var total = resp.metadata && resp.metadata.total || 0;
      if (offset + 100 < total) {
        return fetchPage(offset + 100);
      }
    });
  }

  fetchPage(0).then(function() {
    window._itemTypesFetching = false;
    // Sort alphabetically.
    window._itemTypes.sort(function(a, b) { return a.name.localeCompare(b.name); });
    console.log('[items] Loaded ' + window._itemTypes.length + ' item types');
    // Only re-render if items weren't showing yet (no search input present).
    var el = document.querySelector('create-delivery');
    if (el && !el.querySelector('#item-search') && el.connectedCallback) el.connectedCallback();
  }).catch(function(e) {
    console.error('[items] Failed to fetch types:', e);
    window._itemTypesFetching = false;
  });
  """.}

proc setupItemSearch(self: CreateDelivery) =
  ## Wire up the searchable item dropdown.
  {.emit: """
  var searchInput = `self`.querySelector('#item-search');
  var dropdown = `self`.querySelector('#item-dropdown');
  var hiddenInput = `self`.querySelector('#type-id');
  if (!searchInput || !dropdown) return;

  var items = window._itemTypes || [];
  var maxResults = 20;

  function selectItem(id, name) {
    hiddenInput.value = id;
    searchInput.value = name;
    dropdown.style.display = 'none';
    console.log('[items] Selected: ' + name + ' (id=' + id + ')');
  }

  function renderResults(query) {
    var q = query.toLowerCase();
    var html = '';
    var count = 0;
    for (var i = 0; i < items.length && count < maxResults; i++) {
      if (q && items[i].name.toLowerCase().indexOf(q) === -1) continue;
      var item = items[i];
      var iconHtml = item.iconUrl
        ? '<img src="' + item.iconUrl + '" width="20" height="20" />'
        : '<span class="item-no-icon"></span>';
      html += '<div class="item-option" data-typeid="' + item.id + '" data-name="' + item.name.replace(/"/g, '&quot;') + '">'
        + iconHtml + '<span>' + item.name + '</span></div>';
      count++;
    }
    if (count === 0) {
      html = '<div class="item-empty">No items found</div>';
    }
    dropdown.innerHTML = html;
    dropdown.style.display = 'block';
  }

  // Use event delegation on the dropdown container — avoids per-element handler issues.
  dropdown.addEventListener('mousedown', function(ev) {
    ev.preventDefault(); // Prevent search input from losing focus.
    ev.stopPropagation();
    var opt = ev.target.closest('.item-option');
    if (opt) {
      selectItem(opt.getAttribute('data-typeid'), opt.getAttribute('data-name'));
    }
  });

  searchInput.addEventListener('input', function() {
    renderResults(searchInput.value);
  });

  searchInput.addEventListener('focus', function() {
    renderResults(searchInput.value);
  });

  // Close dropdown when clicking anywhere else on the page.
  document.addEventListener('mousedown', function(e) {
    if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });

  // Pre-select Common Ore.
  for (var i = 0; i < items.length; i++) {
    if (items[i].id === 77800) {
      searchInput.value = items[i].name;
      break;
    }
  }
  """.}

proc render(self: CreateDelivery) =
  ## Render the create delivery form.
  if connectedAddress == nil:
    self.innerHTML = "<div class=\"panel\"><p>Connect wallet to create deliveries</p></div>"
    return

  fetchAllItemTypes()

  var hasSsu: bool
  {.emit: "`hasSsu` = (`ssuId` !== null && `ssuId` !== '');".}

  let ssuFieldHtml: cstring =
    if hasSsu:
      ""
    else:
      cstring(
        "<div class=\"form-group\"><label>Storage Unit ID</label>" &
        "<input type=\"text\" id=\"ssu-id\" value=\"\" /></div>"
      )

  # Item selector: searchable input if types loaded, plain number input as fallback.
  var itemHtml: cstring
  {.emit: """
  if (window._itemTypes && window._itemTypes.length > 0) {
    `itemHtml` = '<div class="form-group"><label>Item Type</label>'
      + '<div class="item-selector">'
      + '<input type="text" id="item-search" placeholder="Search items..." autocomplete="off" />'
      + '<div id="item-dropdown" class="item-dropdown"></div>'
      + '<input type="hidden" id="type-id" value="77800" />'
      + '</div></div>';
  } else if (window._itemTypesFetching) {
    `itemHtml` = '<div class="form-group"><label>Item Type</label>'
      + '<input type="text" disabled value="Loading items..." /></div>'
      + '<input type="hidden" id="type-id" value="77800" />';
  } else {
    `itemHtml` = '<div class="form-group"><label>Item Type ID</label>'
      + '<input type="number" id="type-id" value="77800" /></div>';
  }
  """.}

  self.innerHTML = cstring(
    "<div class=\"panel\">" &
    "<h3>Request Delivery</h3>" &
    $ssuFieldHtml &
    $itemHtml &
    "<div class=\"form-group\"><label>Quantity (1-500)</label>" &
    "<input type=\"number\" id=\"quantity\" value=\"1\" min=\"1\" max=\"500\" /></div>" &
    "<button class=\"btn\" id=\"create-btn\">Request Delivery</button>" &
    "<div id=\"create-status\" class=\"status\"></div>" &
    "</div>"
  )

  self.setupItemSearch()

  let btn = self.querySelector("#create-btn")
  if not btn.isNil:
    btn.addEventListener("click", proc(e: Event) =
      if connectedAddress == nil or packageId == nil or configId == nil:
        let status = self.querySelector("#create-status")
        if not status.isNil:
          status.innerHTML = "Not configured — set package and config IDs"
        return

      let typeInput = self.querySelector("#type-id").InputElement
      let qtyInput = self.querySelector("#quantity").InputElement
      let statusDiv = self.querySelector("#create-status")

      var ssuValue: cstring
      var clickHasSsu: bool
      {.emit: "`clickHasSsu` = (`ssuId` !== null && `ssuId` !== '');".}
      if clickHasSsu:
        ssuValue = ssuId
      else:
        let ssuInput = self.querySelector("#ssu-id").InputElement
        ssuValue = ssuInput.value

      let typeId = typeInput.value
      var qty: int
      {.emit: "`qty` = parseInt(`qtyInput`.value) || 1;".}

      statusDiv.innerHTML = "Submitting..."

      proc submit() {.async.} =
        let tx = buildCreateDeliveryRequest(configId, packageId, ssuValue, typeId, qty)
        let txResult = await signAndExecute(tx)
        {.emit: "console.log('[tx] Result:', JSON.stringify(`txResult`, null, 2));".}
        if txResult.isSuccess():
          statusDiv.innerHTML = cstring("Delivery requested! Digest: " & $txResult.digest())
          if connectedClient != nil:
            discard await connectedClient.waitForTransaction(txResult.digest())
          refreshStats()
          {.emit: "await new Promise(function(r) { setTimeout(r, 1000); });".}
          refreshDeliveryList()
        else:
          var errDetail: cstring
          {.emit: """
          var eff = `txResult`.effects;
          if (eff && eff.status && eff.status.error) {
            `errDetail` = eff.status.error;
          } else {
            `errDetail` = JSON.stringify(`txResult`);
          }
          console.error('[tx] Failed:', `errDetail`);
          """.}
          statusDiv.innerHTML = cstring("Transaction failed: " & $errDetail)

      runWithErrorHandler(submit(), statusDiv)
    )

proc connectedCallback(self: CreateDelivery) =
  ## Called when element is added to DOM.
  self.render()

setupNimponent[CreateDelivery]("create-delivery", nil, connectedCallback)
