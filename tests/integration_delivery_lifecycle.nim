## Integration test: full delivery lifecycle against a live local Sui node.
## Run via: make integration-test

import
  std/[jsffi, asyncjs],
  ../src/[sui_client, courier_client]

var
  testsPassed = 0
  testsFailed = 0

proc check(condition: bool, msg: string) =
  ## Assert a condition and track results.
  if condition:
    testsPassed += 1
    echo "  [OK] ", msg
  else:
    testsFailed += 1
    echo "  [FAIL] ", msg

proc section(name: string) =
  ## Print a test section header.
  echo ""
  echo "--- ", name, " ---"

proc runTests() {.async.} =
  echo "=== Capsuleer Courier Service Integration Tests ==="

  await initSuiSdk()

  # Load environment.
  let suiEnv = readEnvFile("/workspace/.env.sui")
  let deployEnv = readEnvFile("/workspace/.env.deploy")

  let rpcUrl = suiEnv.getEnv("SUI_RPC_URL")
  let adminKey = suiEnv.getEnv("ADMIN_PRIVATE_KEY")
  let playerAKey = suiEnv.getEnv("PLAYER_A_PRIVATE_KEY")
  let playerBKey = suiEnv.getEnv("PLAYER_B_PRIVATE_KEY")
  let packageId = deployEnv.getEnv("BUILDER_PACKAGE_ID")
  let configId = deployEnv.getEnv("EXTENSION_CONFIG_ID")
  let adminCapId = deployEnv.getEnv("ADMIN_CAP_ID")

  # Use real seeded SSU ID if available, fall back to fake.
  var storageUnitId: cstring
  {.emit: """
  `storageUnitId` = `deployEnv`['STORAGE_UNIT_ID'] || '0x0000000000000000000000000000000000000000000000000000000000001234';
  """.}

  let client = newSuiClient(rpcUrl)
  let adminKp = newKeypairFromPrivateKey(adminKey)
  let playerAKp = newKeypairFromPrivateKey(playerAKey)
  let playerBKp = newKeypairFromPrivateKey(playerBKey)

  let adminAddr = adminKp.getAddress()
  let playerAAddr = playerAKp.getAddress()
  let playerBAddr = playerBKp.getAddress()

  echo "  RPC: ", rpcUrl
  echo "  Package: ", packageId
  echo "  Config: ", configId
  echo "  SSU: ", storageUnitId
  echo "  Admin: ", adminAddr
  echo "  Player A: ", playerAAddr
  echo "  Player B: ", playerBAddr

  # ========================================
  # Core lifecycle tests
  # ========================================

  section("Admin: set_likes for item type 77800")
  let setLikesResult = await client.setLikes(adminKp, configId, adminCapId, packageId,
                                              cstring"77800", cstring"10")
  check(setLikesResult.isSuccess(), "set_likes succeeded")
  discard await client.waitForTransaction(setLikesResult.digest())

  section("Player A: create_delivery_request (5 items)")
  let createResult = await client.createDeliveryRequest(playerAKp, configId, packageId,
                                                         storageUnitId, cstring"77800", 5)
  check(createResult.isSuccess(), "create_delivery_request succeeded")
  discard await client.waitForTransaction(createResult.digest())

  # Verify DeliveryCreated event.
  let createdEventType = cstring($packageId & "::courier_service::DeliveryCreated")
  let createdEvents = await queryEvents(rpcUrl, createdEventType)
  var createdEventCount: int
  {.emit: """
  var evts = `createdEvents`.result && `createdEvents`.result.data || [];
  `createdEventCount` = evts.length;
  """.}
  check(createdEventCount >= 1, "DeliveryCreated event emitted (" & $createdEventCount & " total)")

  section("Player B (courier): fulfill_delivery (delivery 0)")
  let fulfillResult = await client.fulfillDelivery(playerBKp, configId, packageId, cstring"0")
  check(fulfillResult.isSuccess(), "fulfill_delivery succeeded")
  discard await client.waitForTransaction(fulfillResult.digest())

  # Verify DeliveryFulfilled event.
  let fulfilledEventType = cstring($packageId & "::courier_service::DeliveryFulfilled")
  let fulfilledEvents = await queryEvents(rpcUrl, fulfilledEventType)
  var fulfilledCourier: cstring
  var fulfilledLikes: int
  {.emit: """
  var fEvts = `fulfilledEvents`.result && `fulfilledEvents`.result.data || [];
  if (fEvts.length > 0 && fEvts[0].parsedJson) {
    `fulfilledCourier` = fEvts[0].parsedJson.courier || '';
    `fulfilledLikes` = parseInt(fEvts[0].parsedJson.likes_earned) || 0;
  } else {
    `fulfilledCourier` = '';
    `fulfilledLikes` = 0;
  }
  """.}
  check(fulfilledCourier == playerBAddr, "DeliveryFulfilled event has correct courier")
  check(fulfilledLikes == 50, "DeliveryFulfilled event has likes_earned=50 (10*5)")

  section("Player A: pickup (delivery 0)")
  let pickupResult = await client.pickup(playerAKp, configId, packageId, cstring"0")
  check(pickupResult.isSuccess(), "pickup succeeded")
  discard await client.waitForTransaction(pickupResult.digest())

  # Verify DeliveryPickedUp event.
  let pickedUpEventType = cstring($packageId & "::courier_service::DeliveryPickedUp")
  let pickedUpEvents = await queryEvents(rpcUrl, pickedUpEventType)
  var pickedUpReceiver: cstring
  {.emit: """
  var pEvts = `pickedUpEvents`.result && `pickedUpEvents`.result.data || [];
  if (pEvts.length > 0 && pEvts[0].parsedJson) {
    `pickedUpReceiver` = pEvts[0].parsedJson.receiver || '';
  } else {
    `pickedUpReceiver` = '';
  }
  """.}
  check(pickedUpReceiver == playerAAddr, "DeliveryPickedUp event has correct receiver")

  # ========================================
  # Query tests (same code paths as frontend)
  # ========================================

  section("Query: queryDeliveries")
  # Create a second delivery so we have something to query.
  let create2 = await client.createDeliveryRequest(playerAKp, configId, packageId,
                                                     storageUnitId, cstring"77800", 3)
  check(create2.isSuccess(), "create second delivery succeeded")
  discard await client.waitForTransaction(create2.digest())
  {.emit: "await new Promise(function(r) { setTimeout(r, 1000); });".}

  let deliveries = await queryDeliveries(rpcUrl, packageId)
  var deliveryCount: int
  {.emit: "`deliveryCount` = `deliveries`.length;".}
  check(deliveryCount >= 1, "queryDeliveries returns " & $deliveryCount & " active delivery(s)")

  section("Query: queryLeaderboard")
  let leaderboard = await queryLeaderboard(rpcUrl, packageId)
  var lbCount: int
  var lbTopLikes: int
  {.emit: """
  `lbCount` = `leaderboard`.length;
  if (`lbCount` > 0) {
    var top = `leaderboard`[0].Field1 || `leaderboard`[0];
    `lbTopLikes` = top.totalLikes || 0;
  } else {
    `lbTopLikes` = 0;
  }
  """.}
  check(lbCount >= 1, "queryLeaderboard returns " & $lbCount & " courier(s)")
  check(lbTopLikes == 50, "top courier has 50 likes")

  section("Query: queryPlayerStats for courier (Player B)")
  let courierStats = await queryPlayerStats(rpcUrl, packageId, playerBAddr)
  var csLikes, csCompleted: int
  {.emit: """
  `csLikes` = `courierStats`.likes || 0;
  `csCompleted` = `courierStats`.deliveriesCompleted || 0;
  """.}
  check(csLikes == 50, "courier stats likes=" & $csLikes & " (expected 50)")
  check(csCompleted == 1, "courier stats completed=" & $csCompleted & " (expected 1)")

  section("Query: queryPlayerStats for receiver (Player A)")
  let receiverStats = await queryPlayerStats(rpcUrl, packageId, playerAAddr)
  var rsPending: int
  {.emit: "`rsPending` = `receiverStats`.pendingRequests || 0;".}
  check(rsPending == 1, "receiver stats pending=" & $rsPending & " (expected 1, second delivery)")

  # ========================================
  # Error case tests
  # ========================================

  section("Error: quantity 0")
  var err1 = false
  try:
    let bad1 = await client.createDeliveryRequest(playerAKp, configId, packageId,
                                                    storageUnitId, cstring"77800", 0)
    err1 = not bad1.isSuccess()
  except:
    err1 = true
  check(err1, "quantity 0 rejected")

  section("Error: quantity 501")
  var err2 = false
  try:
    let bad2 = await client.createDeliveryRequest(playerAKp, configId, packageId,
                                                    storageUnitId, cstring"77800", 501)
    err2 = not bad2.isSuccess()
  except:
    err2 = true
  check(err2, "quantity 501 rejected")

  section("Error: unconfigured item type")
  var err3 = false
  try:
    let bad3 = await client.createDeliveryRequest(playerAKp, configId, packageId,
                                                    storageUnitId, cstring"99999", 1)
    err3 = not bad3.isSuccess()
  except:
    err3 = true
  check(err3, "unconfigured item type rejected")

  section("Error: fulfill nonexistent delivery")
  var err4 = false
  try:
    let bad4 = await client.fulfillDelivery(playerBKp, configId, packageId, cstring"999")
    err4 = not bad4.isSuccess()
  except:
    err4 = true
  check(err4, "fulfill nonexistent delivery rejected")

  section("Error: pickup not yet delivered")
  # Delivery 1 exists but is not fulfilled.
  var err5 = false
  try:
    let bad5 = await client.pickup(playerAKp, configId, packageId, cstring"1")
    err5 = not bad5.isSuccess()
  except:
    err5 = true
  check(err5, "pickup before fulfillment rejected")

  section("Error: double fulfill")
  # Fulfill delivery 1 first, then try again.
  let fulfill2 = await client.fulfillDelivery(playerBKp, configId, packageId, cstring"1")
  check(fulfill2.isSuccess(), "fulfill delivery 1 succeeded")
  discard await client.waitForTransaction(fulfill2.digest())

  var err6 = false
  try:
    let bad6 = await client.fulfillDelivery(playerBKp, configId, packageId, cstring"1")
    err6 = not bad6.isSuccess()
  except:
    err6 = true
  check(err6, "double fulfill rejected")

  section("Error: pickup as wrong player")
  # Delivery 1 is fulfilled, receiver is Player A. Try pickup as Player B.
  var err7 = false
  try:
    let bad7 = await client.pickup(playerBKp, configId, packageId, cstring"1")
    err7 = not bad7.isSuccess()
  except:
    err7 = true
  check(err7, "pickup by wrong player rejected")

  # ========================================
  # Summary
  # ========================================
  echo ""
  echo "=== Results: ", $testsPassed, " passed, ", $testsFailed, " failed ==="
  if testsFailed > 0:
    {.emit: "process.exit(1);".}

discard runTests()
