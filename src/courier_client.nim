## High-level client for the Capsuleer Courier Service Move contracts.
## Wraps sui_client.nim with domain-specific operations.

import
  std/asyncjs,
  sui_client

const
  CourierModule* = "courier_service"

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
