## Integration test: full delivery lifecycle against a live local Sui node.
## Requires: make deploy-local to have been run first (or run via make integration-test).
## Compile: nim js -o:tests/integration_delivery_lifecycle.js tests/integration_delivery_lifecycle.nim
## Run: node tests/integration_delivery_lifecycle.js

import std/[jsffi, asyncjs, strformat]
import ../src/sui_client
import ../src/courier_client

# --- Test helpers ---

var testsPassed = 0
var testsFailed = 0

proc check(condition: bool, msg: string) =
  if condition:
    testsPassed += 1
    echo "  [OK] ", msg
  else:
    testsFailed += 1
    echo "  [FAIL] ", msg

proc section(name: string) =
  echo ""
  echo "--- ", name, " ---"

# --- Main test ---

proc runTests() {.async.} =
  echo "=== Capsuleer Courier Service Integration Tests ==="

  # Initialize SDK (loads ESM modules)
  await initSuiSdk()

  # Load environment
  let suiEnv = readEnvFile("/workspace/.env.sui")
  let deployEnv = readEnvFile("/workspace/.env.deploy")

  let rpcUrl = suiEnv.getEnv("SUI_RPC_URL")
  let adminKey = suiEnv.getEnv("ADMIN_PRIVATE_KEY")
  let playerAKey = suiEnv.getEnv("PLAYER_A_PRIVATE_KEY")
  let playerBKey = suiEnv.getEnv("PLAYER_B_PRIVATE_KEY")
  let packageId = deployEnv.getEnv("BUILDER_PACKAGE_ID")
  let configId = deployEnv.getEnv("EXTENSION_CONFIG_ID")
  let adminCapId = deployEnv.getEnv("ADMIN_CAP_ID")

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
  echo "  AdminCap: ", adminCapId
  echo "  Admin: ", adminAddr
  echo "  Player A: ", playerAAddr
  echo "  Player B: ", playerBAddr

  # --- Test: set_likes ---
  section("Admin: set_likes for item type 77800")
  let setLikesResult = await client.setLikes(adminKp, configId, adminCapId, packageId,
                                              cstring"77800", cstring"10")
  check(setLikesResult.isSuccess(), "set_likes transaction succeeded")
  echo "  digest: ", setLikesResult.digest()
  discard await client.waitForTransaction(setLikesResult.digest())

  # --- Test: create_delivery_request ---
  section("Player A: create_delivery_request (5 items)")
  let fakeSSU = cstring"0x0000000000000000000000000000000000000000000000000000000000001234"
  let createResult = await client.createDeliveryRequest(playerAKp, configId, packageId,
                                                         fakeSSU, cstring"77800", 5)
  check(createResult.isSuccess(), "create_delivery_request transaction succeeded")
  echo "  digest: ", createResult.digest()
  discard await client.waitForTransaction(createResult.digest())

  # --- Test: fulfill_delivery ---
  section("Player B (courier): fulfill_delivery (delivery 0)")
  let fulfillResult = await client.fulfillDelivery(playerBKp, configId, packageId, cstring"0")
  check(fulfillResult.isSuccess(), "fulfill_delivery transaction succeeded")
  echo "  digest: ", fulfillResult.digest()
  discard await client.waitForTransaction(fulfillResult.digest())

  # --- Test: pickup ---
  section("Player A: pickup (delivery 0)")
  let pickupResult = await client.pickup(playerAKp, configId, packageId, cstring"0")
  check(pickupResult.isSuccess(), "pickup transaction succeeded")
  echo "  digest: ", pickupResult.digest()

  # --- Error: create with quantity 0 ---
  section("Error: create_delivery_request with quantity 0")
  var errCaught1 = false
  try:
    let badResult = await client.createDeliveryRequest(playerAKp, configId, packageId,
                                                        fakeSSU, cstring"77800", 0)
    errCaught1 = not badResult.isSuccess()
  except:
    errCaught1 = true
  check(errCaught1, "quantity 0 rejected")

  # --- Error: fulfill nonexistent delivery ---
  section("Error: fulfill nonexistent delivery (already picked up)")
  var errCaught2 = false
  try:
    let badResult2 = await client.fulfillDelivery(playerBKp, configId, packageId, cstring"0")
    errCaught2 = not badResult2.isSuccess()
  except:
    errCaught2 = true
  check(errCaught2, "fulfill nonexistent delivery rejected")

  # Note: wrong-player pickup test skipped for now due to object version
  # conflicts after failed dry-run transactions. The Move unit tests cover
  # this case (test_pickup_wrong_receiver).

  # --- Summary ---
  echo ""
  echo &"=== Results: {testsPassed} passed, {testsFailed} failed ==="
  if testsFailed > 0:
    {.emit: "process.exit(1);".}

# Run
discard runTests()
