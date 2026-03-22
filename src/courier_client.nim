## High-level client for the Capsuleer Courier Service Move contracts.
## Wraps sui_client.nim with domain-specific operations.

import std/[jsffi, asyncjs, strformat]
import sui_client

const
  CourierModule* = "courier_service"

# --- Admin operations ---

proc setLikes*(client: SuiClient, keypair: Keypair, configId, adminCapId, packageId: cstring,
               typeId: cstring, likes: cstring): Future[TransactionResult] {.async.} =
  let tx = newTransaction()
  let target = cstring(&"{packageId}::{CourierModule}::set_likes")
  tx.moveCall(target, [
    tx.txObject(configId),
    tx.txObject(adminCapId),
    tx.txPureU64(typeId),
    tx.txPureU64(likes),
  ])
  result = await client.signAndExecuteTransaction(tx, keypair)

# --- Player operations ---

proc createDeliveryRequest*(client: SuiClient, keypair: Keypair, configId, packageId: cstring,
                            storageUnitId: cstring, typeId: cstring, quantity: int): Future[TransactionResult] {.async.} =
  let tx = newTransaction()
  let target = cstring(&"{packageId}::{CourierModule}::create_delivery_request")
  tx.moveCall(target, [
    tx.txObject(configId),
    tx.txPureAddress(storageUnitId),
    tx.txPureU64(typeId),
    tx.txPureU32(quantity),
  ])
  result = await client.signAndExecuteTransaction(tx, keypair)

proc fulfillDelivery*(client: SuiClient, keypair: Keypair, configId, packageId: cstring,
                      deliveryId: cstring): Future[TransactionResult] {.async.} =
  let tx = newTransaction()
  let target = cstring(&"{packageId}::{CourierModule}::fulfill_delivery")
  tx.moveCall(target, [
    tx.txObject(configId),
    tx.txPureU64(deliveryId),
  ])
  result = await client.signAndExecuteTransaction(tx, keypair)

proc pickup*(client: SuiClient, keypair: Keypair, configId, packageId: cstring,
             deliveryId: cstring): Future[TransactionResult] {.async.} =
  let tx = newTransaction()
  let target = cstring(&"{packageId}::{CourierModule}::pickup")
  tx.moveCall(target, [
    tx.txObject(configId),
    tx.txPureU64(deliveryId),
  ])
  result = await client.signAndExecuteTransaction(tx, keypair)
