## High-level client for the Capsuleer Courier Service Move contracts.
## Wraps sui_client.nim with domain-specific operations.

import
  std/asyncjs,
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
    deliveryId*: int
    storageUnitId*: cstring
    typeId*: int
    quantity*: int
    receiver*: cstring
    courier*: cstring
    delivered*: bool
    pickedUp*: bool

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

proc buildFulfillDelivery*(configId, packageId: cstring,
                           deliveryId: cstring): Transaction =
  ## Build a fulfill_delivery transaction.
  let tx = newTransaction()
  let target = cstring($packageId & "::" & CourierModule & "::fulfill_delivery")
  tx.moveCall(target, [
    tx.txObject(configId),
    tx.txPureU64(deliveryId),
  ])
  result = tx

proc buildPickup*(configId, packageId: cstring,
                  deliveryId: cstring): Transaction =
  ## Build a pickup transaction.
  let tx = newTransaction()
  let target = cstring($packageId & "::" & CourierModule & "::pickup")
  tx.moveCall(target, [
    tx.txObject(configId),
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
    const id = parseInt(fields.delivery_id);
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
    const id = parseInt(fields.delivery_id);
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
    const id = parseInt(fields.delivery_id);
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
