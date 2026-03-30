## High-level client for the Capsuleer Courier Service Move contracts.
## Wraps sui_client.nim with domain-specific operations.

import
  std/[asyncjs, jsffi],
  sui_client,
  config

const
  CourierModule* = "courier_service"

# --- Name cache ---
# Maps addresses to display names. Populated from character objects or manually.

proc setAddressName*(address, name: cstring) =
  ## Cache a display name for an address.
  {.emit: """
  if (!window._nameCache) window._nameCache = {};
  window._nameCache[`address`] = `name`;
  """.}

proc getAddressName*(address: cstring): cstring =
  ## Look up a cached display name. Returns empty string if unknown.
  var name: cstring
  {.emit: """
  `name` = (window._nameCache && window._nameCache[`address`]) || '';
  """.}
  result = name

proc resolveCharacterNames*(rpcUrl, worldPkgId: cstring, addresses: JsObject): Future[void] {.async.} =
  ## Batch-resolve wallet addresses to character names via PlayerProfile → Character lookup.
  ## Silently skips addresses that can't be resolved. Results cached in window._nameCache.
  if rpcUrl == nil or worldPkgId == nil:
    return
  {.emit: """
  var addrs = `addresses`;
  if (!addrs || !addrs.length) return;
  var rpc = `rpcUrl`;
  if (!rpc) return;
  var wpkg = `worldPkgId`;
  if (!wpkg) return;
  var profileType = wpkg + '::character::PlayerProfile';

  // Deduplicate and skip already-cached.
  if (!window._nameCache) window._nameCache = {};
  var unique = [];
  var seen = {};
  for (var i = 0; i < addrs.length; i++) {
    var a = addrs[i];
    if (!a || a === '' || a === '0x0' || seen[a] || window._nameCache[a]) continue;
    seen[a] = true;
    unique.push(a);
  }

  async function resolveOne(addr) {
    try {
      // Step 1: Find PlayerProfile owned by this address.
      var profResp = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 1,
          method: 'suix_getOwnedObjects',
          params: [addr, { filter: { StructType: profileType }, options: { showContent: true } }, null, 1]
        })
      }).then(function(r) { return r.json(); });

      var profData = profResp.result && profResp.result.data;
      if (!profData || profData.length === 0) return;

      var charId = profData[0].data && profData[0].data.content &&
                   profData[0].data.content.fields && profData[0].data.content.fields.character_id;
      if (!charId) return;

      // Step 2: Fetch Character object.
      var charResp = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 1,
          method: 'sui_getObject',
          params: [charId, { showContent: true }]
        })
      }).then(function(r) { return r.json(); });

      var charFields = charResp.result && charResp.result.data &&
                       charResp.result.data.content && charResp.result.data.content.fields;
      if (!charFields || !charFields.metadata) return;

      var meta = charFields.metadata.fields || charFields.metadata;
      var name = meta.name;
      if (name) window._nameCache[addr] = name;
    } catch(e) {
      // Silently skip — truncated address fallback works fine.
    }
  }

  await Promise.all(unique.map(resolveOne));
  """.}

proc fetchCharacterInfo*(rpcUrl, worldPkgId, address: cstring): Future[void] {.async.} =
  ## Fetch and cache the Character ID and OwnerCap ID for a wallet address.
  ## Results stored in window._courierCharId, window._courierOwnerCapId,
  ## window._courierOwnerCapVersion, window._courierOwnerCapDigest.
  if rpcUrl == nil or worldPkgId == nil or address == nil:
    return
  {.emit: """
  try {
    var rpc = `rpcUrl`;
    var addr = `address`;
    var wpkg = `worldPkgId`;
    if (!rpc || !addr || !wpkg) return;

    // Step 1: Find PlayerProfile owned by this address.
    var profResp = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'suix_getOwnedObjects',
        params: [addr, { filter: { StructType: wpkg + '::character::PlayerProfile' }, options: { showContent: true } }, null, 1]
      })
    }).then(function(r) { return r.json(); });

    var profData = profResp.result && profResp.result.data;
    if (!profData || profData.length === 0) { console.log('[char] No PlayerProfile found for', addr); return; }

    var charId = profData[0].data && profData[0].data.content &&
                 profData[0].data.content.fields && profData[0].data.content.fields.character_id;
    if (!charId) { console.log('[char] No character_id in PlayerProfile'); return; }

    // Step 2: Fetch Character object to get owner_cap_id.
    var charResp = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'sui_getObject',
        params: [charId, { showContent: true }]
      })
    }).then(function(r) { return r.json(); });

    var charFields = charResp.result && charResp.result.data &&
                     charResp.result.data.content && charResp.result.data.content.fields;
    if (!charFields) { console.log('[char] Could not read Character fields'); return; }

    var ownerCapId = charFields.owner_cap_id;

    window._courierCharId = charId;
    window._courierOwnerCapId = ownerCapId;
    console.log('[char] Character:', charId, 'OwnerCap:', ownerCapId);

    // Step 3: Fetch OwnerCap object for version+digest (needed for receiving ref).
    if (ownerCapId) {
      var capResp = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 1,
          method: 'sui_getObject',
          params: [ownerCapId, { showContent: false }]
        })
      }).then(function(r) { return r.json(); });

      var capData = capResp.result && capResp.result.data;
      if (capData) {
        window._courierOwnerCapVersion = capData.version;
        window._courierOwnerCapDigest = capData.digest;
        console.log('[char] OwnerCap version:', capData.version, 'digest:', capData.digest);
      }
    }
  } catch(e) {
    console.error('[char] Failed to fetch character info:', e);
  }
  """.}

proc resolveAddressDisplay*(address: cstring): cstring =
  ## Return display name if cached, otherwise truncated address.
  let name = getAddressName(address)
  if name.len > 0:
    return name
  if address.len <= 12:
    return address
  var shortened: cstring
  {.emit: "`shortened` = `address`.slice(0, 6) + '...' + `address`.slice(-4);".}
  result = shortened

type
  DeliveryInfo* = object
    deliveryId*: cstring
    storageUnitId*: cstring
    typeId*: int
    quantity*: int
    receiver*: cstring
    courier*: cstring
    delivered*: bool
    pickedUp*: bool

proc fetchSsuOwnerCapId*(rpcUrl, ssuId: cstring): Future[void] {.async.} =
  ## Query the SSU object to find its owner_cap_id, then fetch version+digest.
  ## Results stored in window._courierSsuOwnerCapId/Version/Digest.
  if rpcUrl == nil or ssuId == nil:
    return
  {.emit: """
  try {
    var rpc = `rpcUrl`;
    var ssu = `ssuId`;

    // Fetch SSU object to read owner_cap_id field.
    var ssuResp = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'sui_getObject',
        params: [ssu, { showContent: true }]
      })
    }).then(function(r) { return r.json(); });

    var ssuFields = ssuResp.result && ssuResp.result.data &&
                    ssuResp.result.data.content && ssuResp.result.data.content.fields;
    if (!ssuFields || !ssuFields.owner_cap_id) {
      console.log('[ssu] Could not read SSU owner_cap_id');
      return;
    }
    var capId = ssuFields.owner_cap_id;
    window._courierSsuOwnerCapId = capId;
    console.log('[ssu] SSU owner_cap_id:', capId);

    // Fetch OwnerCap<StorageUnit> for version+digest+owner (needed for Receiving + owner detection).
    var capResp = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'sui_getObject',
        params: [capId, { showContent: false, showOwner: true }]
      })
    }).then(function(r) { return r.json(); });

    var capData = capResp.result && capResp.result.data;
    if (capData) {
      window._courierSsuOwnerCapVersion = capData.version;
      window._courierSsuOwnerCapDigest = capData.digest;
      console.log('[ssu] OwnerCap<StorageUnit> version:', capData.version, 'digest:', capData.digest);

      // Detect if connected user's Character owns this SSU.
      var capOwner = capData.owner;
      window._courierIsOwner = false;
      if (capOwner && window._courierCharId) {
        var ownerId = capOwner.ObjectOwner || capOwner.AddressOwner || '';
        window._courierIsOwner = (ownerId === window._courierCharId);
        console.log('[ssu] Owner check:', ownerId, '===', window._courierCharId, '->', window._courierIsOwner);
      }
    }

    // Check current extension registration on SSU.
    var ext = ssuFields.extension;
    window._courierExtensionAuthorized = false;
    window._courierExtensionType = null;
    if (ext) {
      console.log('[ssu] Current extension:', JSON.stringify(ext));
      // Option<TypeName> — extract the type name string.
      var extName = (ext.fields && ext.fields.name) || ext.name || (typeof ext === 'string' ? ext : null);
      if (extName) {
        window._courierExtensionType = extName;
        var expectedSuffix = '::config::CourierAuth';
        // Move type names omit the 0x prefix, so strip it for comparison.
        var pkgIdBare = (`packageId` || '').replace(/^0x/, '');
        window._courierExtensionAuthorized = (extName.indexOf(pkgIdBare + expectedSuffix) !== -1);
        console.log('[ssu] Extension authorized:', window._courierExtensionAuthorized);
      }
    } else {
      console.log('[ssu] No extension registered');
    }
  } catch(e) {
    console.error('[ssu] Failed to fetch SSU OwnerCap info:', e);
  }
  """.}

proc buildAuthorizeExtension*(packageId, worldPkgId, ssuId,
    characterId, ssuOwnerCapId: cstring,
    ssuOwnerCapVersion: cstring, ssuOwnerCapDigest: cstring): Transaction =
  ## Borrow OwnerCap<StorageUnit> from Character, call authorize_extension<CourierAuth>,
  ## then return the OwnerCap. Uses the same Receiving pattern as Character OwnerCap.
  let tx = newTransaction()
  let ssuType = cstring($worldPkgId & "::storage_unit::StorageUnit")
  let courierAuthType = cstring($packageId & "::config::CourierAuth")

  # Step 1: Borrow OwnerCap<StorageUnit> from Character.
  let borrowResult = tx.moveCallTyped(
    cstring($worldPkgId & "::character::borrow_owner_cap"),
    [ssuType],
    [tx.txObject(characterId),
     tx.txReceivingRef(ssuOwnerCapId, ssuOwnerCapVersion, ssuOwnerCapDigest)],
  )
  var ownerCap, receipt: TransactionArgument
  {.emit: "`ownerCap` = `borrowResult`[0]; `receipt` = `borrowResult`[1];".}

  # Step 2: authorize_extension<CourierAuth>(storage_unit, &owner_cap).
  discard tx.moveCallTyped(
    cstring($worldPkgId & "::storage_unit::authorize_extension"),
    [courierAuthType],
    [tx.txObject(ssuId), ownerCap],
  )

  # Step 3: Return OwnerCap<StorageUnit> to Character.
  discard tx.moveCallTyped(
    cstring($worldPkgId & "::character::return_owner_cap"),
    [ssuType],
    [tx.txObject(characterId), ownerCap, receipt],
  )

  result = tx

proc buildSetLikes*(configId, adminCapId, packageId: cstring,
                    typeId: cstring, likes: cstring): Transaction =
  ## Build a set_likes transaction. Requires AdminCap.
  let tx = newTransaction()
  let target = cstring($packageId & "::" & CourierModule & "::set_likes")
  tx.moveCall(target, [
    tx.txObject(configId),
    tx.txObject(adminCapId),
    tx.txPureU64(typeId),
    tx.txPureU64(likes),
  ])
  result = tx

proc buildCreateDeliveryRequest*(configId, packageId: cstring,
                                 storageUnitId: cstring, typeId: cstring, quantity: int): Transaction =
  ## Build a create_delivery_request transaction.
  let tx = newTransaction()
  let target = cstring($packageId & "::" & CourierModule & "::create_delivery_request")
  tx.moveCall(target, [
    tx.txObject(configId),
    tx.txPureAddress(storageUnitId),
    tx.txPureU64(typeId),
    tx.txPureU32(quantity),
  ])
  result = tx

proc buildFulfillDelivery*(configId, packageId, worldPkgId, ssuId,
    characterId, ownerCapId, ownerCapVersion, ownerCapDigest: cstring,
    deliveryId: cstring, typeId: cstring, quantity: int): Transaction =
  ## Build a multi-step PTB for fulfill_delivery:
  ## 1. borrow_owner_cap<Character> → (owner_cap, receipt)
  ## 2. withdraw_by_owner<Character> → item
  ## 3. return_owner_cap
  ## 4. fulfill_delivery with the item
  let tx = newTransaction()
  let charType = cstring($worldPkgId & "::character::Character")

  {.emit: """
  console.log('[PTB] Building fulfill_delivery PTB');
  console.log('[PTB] configId:', `configId`);
  console.log('[PTB] packageId:', `packageId`);
  console.log('[PTB] worldPkgId:', `worldPkgId`);
  console.log('[PTB] ssuId:', `ssuId`);
  console.log('[PTB] characterId:', `characterId`);
  console.log('[PTB] ownerCapId:', `ownerCapId`);
  console.log('[PTB] ownerCapVersion:', `ownerCapVersion`);
  console.log('[PTB] ownerCapDigest:', `ownerCapDigest`);
  console.log('[PTB] deliveryId:', `deliveryId`);
  console.log('[PTB] typeId:', `typeId`);
  console.log('[PTB] quantity:', `quantity`);
  console.log('[PTB] charType:', `charType`, 'typeof:', typeof `charType`);
  """.}

  # Step 1: Borrow OwnerCap from Character (receiving pattern)
  let borrowResult = tx.moveCallTyped(
    cstring($worldPkgId & "::character::borrow_owner_cap"),
    [charType],
    [tx.txObject(characterId), tx.txReceivingRef(ownerCapId, ownerCapVersion, ownerCapDigest)],
  )
  let ownerCap = borrowResult.txIndex(0)
  let receipt = borrowResult.txIndex(1)

  # Step 2: Withdraw item from courier's owned inventory
  let itemResult = tx.moveCallTyped(
    cstring($worldPkgId & "::storage_unit::withdraw_by_owner"),
    [charType],
    [tx.txObject(ssuId), tx.txObject(characterId), ownerCap, tx.txPureU64(typeId), tx.txPureU32(quantity)],
  )
  let item = itemResult.txIndex(0)

  # Step 3: Return OwnerCap
  discard tx.moveCallTyped(
    cstring($worldPkgId & "::character::return_owner_cap"),
    [charType],
    [tx.txObject(characterId), ownerCap, receipt],
  )

  # Step 4: Fulfill delivery with the withdrawn item
  let target = cstring($packageId & "::" & CourierModule & "::fulfill_delivery")
  tx.moveCall(target, [
    tx.txObject(configId),
    tx.txObject(ssuId),
    tx.txObject(characterId),
    item,
    tx.txPureU64(deliveryId),
  ])

  # Dump PTB commands for debugging
  {.emit: """
  try {
    var txData = `tx`.getData();
    console.log('[PTB] Transaction commands:', JSON.stringify(txData.commands, null, 2));
    console.log('[PTB] Transaction inputs:', JSON.stringify(txData.inputs, null, 2));
  } catch(e) {
    console.log('[PTB] Could not dump transaction data:', e.message);
  }
  """.}

  result = tx

proc buildOwnerFulfillDelivery*(configId, packageId, ssuId,
    characterId: cstring, deliveryId: cstring): Transaction =
  ## Build a single moveCall for owner_fulfill_delivery.
  ## No PTB chaining needed — the contract handles withdraw+deposit internally.
  let tx = newTransaction()
  let target = cstring($packageId & "::" & CourierModule & "::owner_fulfill_delivery")
  tx.moveCall(target, [
    tx.txObject(configId),
    tx.txObject(ssuId),
    tx.txObject(characterId),
    tx.txPureU64(deliveryId),
  ])
  result = tx

proc buildPickup*(configId, packageId, ssuId, characterId: cstring,
                  deliveryId: cstring): Transaction =
  ## Build a pickup transaction. Pickup handles withdraw+deposit internally.
  let tx = newTransaction()
  let target = cstring($packageId & "::" & CourierModule & "::pickup")
  tx.moveCall(target, [
    tx.txObject(configId),
    tx.txObject(ssuId),
    tx.txObject(characterId),
    tx.txPureU64(deliveryId),
  ])
  result = tx

# --- Event queries ---

proc queryDeliveries*(rpcUrl, packageId: cstring): Future[seq[DeliveryInfo]] {.async.} =
  ## Query delivery events and build current state. Excludes picked-up deliveries.
  var deliveries: seq[DeliveryInfo]

  if isDemo:
    {.emit: """
    var demoAddr = '0xd3m0000000000000000000000000000000000000000000000000000000c0de';
    var extra = window._demoDeliveryCount || 0;
    if (!window._demoFulfilled) window._demoFulfilled = {};
    if (!window._demoPickedUp) window._demoPickedUp = {};
    var all = [
      { deliveryId: 1, storageUnitId: '', typeId: 77800, quantity: 50, receiver: demoAddr, courier: '', delivered: false, pickedUp: false },
      { deliveryId: 2, storageUnitId: '', typeId: 77518, quantity: 25, receiver: '0xa1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60001', courier: demoAddr, delivered: true, pickedUp: false },
      { deliveryId: 3, storageUnitId: '', typeId: 77811, quantity: 100, receiver: '0xf6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a10002', courier: '', delivered: false, pickedUp: false },
      { deliveryId: 4, storageUnitId: '', typeId: 77516, quantity: 10, receiver: demoAddr, courier: '0x9988776655443322119988776655443322119988776655443322119988770003', delivered: true, pickedUp: false },
      { deliveryId: 5, storageUnitId: '', typeId: 77523, quantity: 200, receiver: '0x1122334455667788991122334455667788991122334455667788991122330004', courier: '', delivered: false, pickedUp: false },
    ];
    for (var i = 0; i < extra; i++) {
      all.push({
        deliveryId: 6 + i, storageUnitId: '', typeId: 77800, quantity: 10 + i,
        receiver: demoAddr, courier: '', delivered: false, pickedUp: false
      });
    }
    // Apply demo mutations.
    `deliveries` = [];
    for (var i = 0; i < all.length; i++) {
      var d = all[i];
      if (window._demoPickedUp[d.deliveryId]) continue;
      if (window._demoFulfilled[d.deliveryId]) {
        d.delivered = true;
        d.courier = demoAddr;
      }
      `deliveries`.push(d);
    }
    """.}
    return deliveries

  let createdType = cstring($packageId & "::" & CourierModule & "::DeliveryCreated")
  let fulfilledType = cstring($packageId & "::" & CourierModule & "::DeliveryFulfilled")
  let pickedUpType = cstring($packageId & "::" & CourierModule & "::DeliveryPickedUp")

  let createdResp = await queryEvents(rpcUrl, createdType)
  let fulfilledResp = await queryEvents(rpcUrl, fulfilledType)
  let pickedUpResp = await queryEvents(rpcUrl, pickedUpType)

  {.emit: """
  const deliveryMap = new Map();

  // Process created events.
  const createdData = `createdResp`.result && `createdResp`.result.data || [];
  for (const evt of createdData) {
    const fields = evt.parsedJson;
    if (!fields) continue;
    const id = fields.delivery_id;
    deliveryMap.set(id, {
      deliveryId: id,
      storageUnitId: fields.storage_unit_id || '',
      typeId: parseInt(fields.type_id) || 0,
      quantity: parseInt(fields.quantity) || 0,
      receiver: fields.receiver || '',
      courier: '',
      delivered: false,
      pickedUp: false,
    });
  }

  // Process fulfilled events.
  const fulfilledData = `fulfilledResp`.result && `fulfilledResp`.result.data || [];
  for (const evt of fulfilledData) {
    const fields = evt.parsedJson;
    if (!fields) continue;
    const id = fields.delivery_id;
    const d = deliveryMap.get(id);
    if (d) {
      d.courier = fields.courier || '';
      d.delivered = true;
    }
  }

  // Process picked up events.
  const pickedUpData = `pickedUpResp`.result && `pickedUpResp`.result.data || [];
  for (const evt of pickedUpData) {
    const fields = evt.parsedJson;
    if (!fields) continue;
    const id = fields.delivery_id;
    const d = deliveryMap.get(id);
    if (d) {
      d.pickedUp = true;
    }
  }

  // Build result array, excluding picked-up deliveries.
  `deliveries` = [];
  for (const [id, d] of deliveryMap) {
    if (!d.pickedUp) {
      `deliveries`.push(d);
    }
  }
  """.}

  result = deliveries

type
  LeaderboardEntry* = object
    address*: cstring
    totalLikes*: int
    deliveriesCompleted*: int

proc queryLeaderboard*(rpcUrl, packageId: cstring): Future[seq[LeaderboardEntry]] {.async.} =
  ## Query DeliveryFulfilled events and aggregate likes per courier.
  var entries: seq[LeaderboardEntry]

  if isDemo:
    {.emit: """
    var demoAddr = '0xd3m0000000000000000000000000000000000000000000000000000000c0de';
    `entries` = [
      { address: '0xa1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60001', totalLikes: 47, deliveriesCompleted: 12 },
      { address: demoAddr, totalLikes: 31, deliveriesCompleted: 8 },
      { address: '0xf6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a10002', totalLikes: 19, deliveriesCompleted: 5 },
      { address: '0x9988776655443322119988776655443322119988776655443322119988770003', totalLikes: 8, deliveriesCompleted: 3 },
      { address: '0x1122334455667788991122334455667788991122334455667788991122330004', totalLikes: 3, deliveriesCompleted: 1 },
    ];
    """.}
    return entries

  let fulfilledType = cstring($packageId & "::" & CourierModule & "::DeliveryFulfilled")
  let fulfilledResp = await queryEvents(rpcUrl, fulfilledType)

  {.emit: """
  const courierMap = new Map();
  const data = `fulfilledResp`.result && `fulfilledResp`.result.data || [];
  for (const evt of data) {
    const fields = evt.parsedJson;
    if (!fields) continue;
    const addr = fields.courier || '';
    const likes = parseInt(fields.likes_earned) || 0;
    if (!courierMap.has(addr)) {
      courierMap.set(addr, { address: addr, totalLikes: 0, deliveriesCompleted: 0 });
    }
    const entry = courierMap.get(addr);
    entry.totalLikes += likes;
    entry.deliveriesCompleted += 1;
  }

  // Sort by likes descending.
  `entries` = Array.from(courierMap.values()).sort(function(a, b) {
    return b.totalLikes - a.totalLikes;
  });
  """.}

  result = entries

type
  PlayerStatsInfo* = object
    likes*: int
    deliveriesCompleted*: int
    pendingRequests*: int

proc queryPlayerStats*(rpcUrl, packageId, playerAddress: cstring): Future[PlayerStatsInfo] {.async.} =
  ## Compute player stats from events.
  var stats: PlayerStatsInfo

  if isDemo:
    {.emit: """
    var extra = window._demoDeliveryCount || 0;
    `stats` = { likes: 31, deliveriesCompleted: 8, pendingRequests: 2 + extra };
    """.}
    return stats

  let createdType = cstring($packageId & "::" & CourierModule & "::DeliveryCreated")
  let fulfilledType = cstring($packageId & "::" & CourierModule & "::DeliveryFulfilled")
  let pickedUpType = cstring($packageId & "::" & CourierModule & "::DeliveryPickedUp")

  let createdResp = await queryEvents(rpcUrl, createdType)
  let fulfilledResp = await queryEvents(rpcUrl, fulfilledType)
  let pickedUpResp = await queryEvents(rpcUrl, pickedUpType)

  {.emit: """
  var likes = 0, completed = 0, pending = 0;
  var addr = `playerAddress`;

  // Count pending: created by me minus picked up by me.
  var myCreated = 0, myPickedUp = 0;
  var createdData = `createdResp`.result && `createdResp`.result.data || [];
  for (var i = 0; i < createdData.length; i++) {
    var f = createdData[i].parsedJson;
    if (f && f.receiver === addr) myCreated++;
  }
  var pickedUpData = `pickedUpResp`.result && `pickedUpResp`.result.data || [];
  for (var i = 0; i < pickedUpData.length; i++) {
    var f = pickedUpData[i].parsedJson;
    if (f && f.receiver === addr) myPickedUp++;
  }
  pending = myCreated - myPickedUp;

  // Count likes and deliveries completed as courier.
  var fulfilledData = `fulfilledResp`.result && `fulfilledResp`.result.data || [];
  for (var i = 0; i < fulfilledData.length; i++) {
    var f = fulfilledData[i].parsedJson;
    if (f && f.courier === addr) {
      likes += parseInt(f.likes_earned) || 0;
      completed++;
    }
  }

  `stats` = { likes: likes, deliveriesCompleted: completed, pendingRequests: pending };
  """.}

  result = stats
