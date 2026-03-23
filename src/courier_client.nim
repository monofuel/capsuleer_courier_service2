## High-level client for the Capsuleer Courier Service Move contracts.
## Wraps sui_client.nim with domain-specific operations.

import
  std/asyncjs,
  sui_client

const
  CourierModule* = "courier_service"

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

proc setLikes*(client: SuiClient, keypair: Keypair, configId, adminCapId, packageId: cstring,
               typeId: cstring, likes: cstring): Future[TransactionResult] {.async.} =
  ## Configure likes reward for an item type. Requires AdminCap.
  let tx = newTransaction()
  let target = cstring($packageId & "::" & CourierModule & "::set_likes")
  tx.moveCall(target, [
    tx.txObject(configId),
    tx.txObject(adminCapId),
    tx.txPureU64(typeId),
    tx.txPureU64(likes),
  ])
  result = await client.signAndExecuteTransaction(tx, keypair)

proc createDeliveryRequest*(client: SuiClient, keypair: Keypair, configId, packageId: cstring,
                            storageUnitId: cstring, typeId: cstring, quantity: int): Future[TransactionResult] {.async.} =
  ## Request a delivery. Caller becomes the receiver.
  let tx = newTransaction()
  let target = cstring($packageId & "::" & CourierModule & "::create_delivery_request")
  tx.moveCall(target, [
    tx.txObject(configId),
    tx.txPureAddress(storageUnitId),
    tx.txPureU64(typeId),
    tx.txPureU32(quantity),
  ])
  result = await client.signAndExecuteTransaction(tx, keypair)

proc fulfillDelivery*(client: SuiClient, keypair: Keypair, configId, packageId: cstring,
                      deliveryId: cstring): Future[TransactionResult] {.async.} =
  ## Fulfill a delivery request. Caller becomes the courier.
  let tx = newTransaction()
  let target = cstring($packageId & "::" & CourierModule & "::fulfill_delivery")
  tx.moveCall(target, [
    tx.txObject(configId),
    tx.txPureU64(deliveryId),
  ])
  result = await client.signAndExecuteTransaction(tx, keypair)

proc pickup*(client: SuiClient, keypair: Keypair, configId, packageId: cstring,
             deliveryId: cstring): Future[TransactionResult] {.async.} =
  ## Pick up a delivered item. Only the original receiver can call this.
  let tx = newTransaction()
  let target = cstring($packageId & "::" & CourierModule & "::pickup")
  tx.moveCall(target, [
    tx.txObject(configId),
    tx.txPureU64(deliveryId),
  ])
  result = await client.signAndExecuteTransaction(tx, keypair)

# --- Event queries ---

proc queryDeliveries*(rpcUrl, packageId: cstring): Future[seq[DeliveryInfo]] {.async.} =
  ## Query delivery events and build current state. Excludes picked-up deliveries.
  var deliveries: seq[DeliveryInfo]

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
