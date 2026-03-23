## Nim wrapper for the @mysten/sui v2 TypeScript SDK.
## Compiles to JS via `nim js`, calls into npm packages via dynamic import().
##
## Usage: call initSuiSdk() once before using any other procs.
## Uses CoreClient (v2 API) and dynamic ESM imports.

import std/[jsffi, asyncjs]

# --- SDK module references (populated by initSuiSdk) ---
var sdkLoaded* = false

{.emit: """
var SuiClientClass = null;
var TransactionClass = null;
var Ed25519KeypairClass = null;
var decodeSuiPrivateKeyFn = null;
""".}

proc initSuiSdk*(): Future[void] {.async.} =
  ## Load the Sui SDK. Works in both environments:
  ## - Browser: reads from window.SuiSDK (loaded by sui-bundle.js)
  ## - Node.js: dynamic import from node_modules
  if sdkLoaded:
    return
  {.emit: """
  if (typeof window !== 'undefined' && window.SuiSDK) {
    SuiClientClass = window.SuiSDK.SuiClient;
    TransactionClass = window.SuiSDK.Transaction;
    Ed25519KeypairClass = window.SuiSDK.Ed25519Keypair;
    decodeSuiPrivateKeyFn = window.SuiSDK.decodeSuiPrivateKey;
  } else {
    const clientMod = await import('@mysten/sui/client');
    const txMod = await import('@mysten/sui/transactions');
    const kpMod = await import('@mysten/sui/keypairs/ed25519');
    const cryptoMod = await import('@mysten/sui/cryptography');
    SuiClientClass = clientMod.SuiClient;
    TransactionClass = txMod.Transaction;
    Ed25519KeypairClass = kpMod.Ed25519Keypair;
    decodeSuiPrivateKeyFn = cryptoMod.decodeSuiPrivateKey;
  }
  """.}
  sdkLoaded = true

# --- Types ---
type
  SuiClient* = ref object of JsObject
  Transaction* = ref object of JsObject
  Keypair* = ref object of JsObject
  TransactionArgument* = JsObject
  TransactionResult* = ref object of JsObject

# --- Client ---

proc newSuiClient*(url: cstring): SuiClient {.importjs: "new SuiClientClass({url: #})".}

proc signAndExecuteTransaction*(client: SuiClient, tx: Transaction, signer: Keypair): Future[TransactionResult] {.importjs: """
#.signAndExecuteTransaction({
  transaction: #,
  signer: #,
  options: { showEffects: true, showObjectChanges: true, showEvents: true }
})""".}

proc waitForTransaction*(client: SuiClient, digest: cstring): Future[JsObject] {.importjs: """
#.waitForTransaction({ digest: # })""".}

proc getObject*(client: SuiClient, objectId: cstring): Future[JsObject] {.importjs: """
#.getObject({ id: #, options: { showContent: true } })""".}

proc getDynamicField*(client: SuiClient, parentId: cstring, dynFieldType: cstring, dynFieldValue: JsObject): Future[JsObject] {.importjs: """
#.getDynamicField({ parentId: #, name: { type: #, value: # } })""".}

# --- devInspect via raw JSON-RPC (not available on CoreClient in v2) ---

proc devInspectRpc*(rpcUrl: cstring, sender: cstring, txBytes: cstring): Future[JsObject] {.async.} =
  ## Call sui_devInspectTransactionBlock via raw JSON-RPC.
  var resp: JsObject
  {.emit: """
  const response = await fetch(`rpcUrl`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'sui_devInspectTransactionBlock',
      params: [`sender`, `txBytes`]
    })
  });
  `resp` = await response.json();
  """.}
  result = resp

# --- Keypair ---

proc newKeypairFromPrivateKey*(privateKey: cstring): Keypair =
  ## Decode a Sui private key string (suiprivkey...) into an Ed25519Keypair.
  var kp: Keypair
  {.emit: """
  const decoded = decodeSuiPrivateKeyFn(`privateKey`);
  `kp` = Ed25519KeypairClass.fromSecretKey(decoded.secretKey);
  """.}
  result = kp

proc getPublicKey*(keypair: Keypair): JsObject {.importjs: "#.getPublicKey()".}
proc toSuiAddress*(publicKey: JsObject): cstring {.importjs: "#.toSuiAddress()".}

proc getAddress*(keypair: Keypair): cstring =
  keypair.getPublicKey().toSuiAddress()

# --- Transaction building ---

proc newTransaction*(): Transaction {.importjs: "new TransactionClass()".}

proc txObject*(tx: Transaction, objectId: cstring): TransactionArgument {.importjs: "#.object(#)".}
proc txPureU64*(tx: Transaction, value: cstring): TransactionArgument {.importjs: "#.pure.u64(#)".}
proc txPureU32*(tx: Transaction, value: int): TransactionArgument {.importjs: "#.pure.u32(#)".}
proc txPureAddress*(tx: Transaction, address: cstring): TransactionArgument {.importjs: "#.pure.address(#)".}

proc moveCall*(tx: Transaction, target: cstring, arguments: openArray[TransactionArgument]) =
  ## Call a Move function with the given arguments.
  {.emit: """
  const argsArray = [];
  for (let i = 0; i < `arguments`.length; i++) {
    argsArray.push(`arguments`[i]);
  }
  `tx`.moveCall({ target: `target`, arguments: argsArray });
  """.}

# --- Result helpers ---

proc digest*(txResult: TransactionResult): cstring {.importjs: "#.digest".}

proc isSuccess*(txResult: TransactionResult): bool =
  var status: cstring
  {.emit: """
  `status` = `txResult`.effects && `txResult`.effects.status ? `txResult`.effects.status.status : "unknown";
  """.}
  result = status == "success"

# --- Env file parsing ---

proc readEnvFile*(path: cstring): JsObject =
  ## Read a .env file and return key-value pairs as a JS object.
  var env: JsObject
  {.emit: """
  const fs = require('fs');
  const content = fs.readFileSync(`path`, 'utf-8');
  `env` = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.substring(0, eqIdx).trim();
    const value = trimmed.substring(eqIdx + 1).trim();
    `env`[key] = value;
  }
  """.}
  result = env

proc getEnv*(env: JsObject, key: cstring): cstring {.importjs: "#[#]".}

# --- Object queries via JSON-RPC ---

proc getObjectJson*(rpcUrl: cstring, objectId: cstring): Future[JsObject] {.async.} =
  ## Fetch object content via sui_getObject RPC. Returns parsed JSON or null.
  var resp: JsObject
  {.emit: """
  const response = await fetch(`rpcUrl`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'sui_getObject',
      params: [`objectId`, { showContent: true }]
    })
  });
  `resp` = await response.json();
  """.}
  result = resp

# --- Event queries via JSON-RPC ---

proc queryEvents*(rpcUrl: cstring, eventType: cstring, limit: int = 50): Future[JsObject] {.async.} =
  ## Query events by Move event type via suix_queryEvents RPC.
  var resp: JsObject
  {.emit: """
  const response = await fetch(`rpcUrl`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'suix_queryEvents',
      params: [
        { MoveEventType: `eventType` },
        null,
        `limit`,
        false
      ]
    })
  });
  `resp` = await response.json();
  """.}
  result = resp

# --- Async error helper ---

proc runWithErrorHandler*(future: Future[void], statusElement: auto) =
  ## Run an async future and display errors in a DOM element.
  ## Maps known Move abort codes to human-readable messages.
  {.emit: """
  var _errorMap = {
    '13906834500761026563': 'Quantity must be between 1 and 500',
    '13906834573775339521': 'Item type has no likes configured (run Set Likes first)',
    '13906834638200111109': 'Max 5 pending delivery requests per player',
    '13906834668265013255': 'Delivery does not exist',
    '13906834735698698243': 'Delivery has already been fulfilled',
    '13906834822884098059': 'Delivery has not been fulfilled yet',
    '13906834891298783233': 'Only the receiver can pickup this delivery'
  };

  `future`.catch(function(err) {
    console.error('Transaction error:', err);
    if (`statusElement`) {
      var msg = err.message || String(err);
      var match = msg.match(/sub status (\d+)/);
      if (!match) match = msg.match(/MoveAbort\([^,]+,\s*(\d+)\)/);
      if (match && _errorMap[match[1]]) {
        `statusElement`.innerHTML = 'Error: ' + _errorMap[match[1]];
      } else {
        `statusElement`.innerHTML = 'Error: ' + msg;
      }
    }
  });
  """.}
