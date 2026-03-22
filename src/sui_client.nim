## Nim wrapper for the @mysten/sui v2 TypeScript SDK.
## Compiles to JS via `nim js`, calls into npm packages via dynamic import().
##
## Usage: call initSuiSdk() once before using any other procs.
## Uses CoreClient (v2 API) and dynamic ESM imports.

import std/[jsffi, asyncjs]

# --- SDK module references (populated by initSuiSdk) ---
var sdkLoaded = false

{.emit: """
var SuiClientClass = null;
var TransactionClass = null;
var Ed25519KeypairClass = null;
var decodeSuiPrivateKeyFn = null;
""".}

proc initSuiSdk*(): Future[void] {.async.} =
  ## Load the @mysten/sui v1.x ESM modules. Must be called once before using the SDK.
  if sdkLoaded:
    return
  {.emit: """
  const clientMod = await import('@mysten/sui/client');
  const txMod = await import('@mysten/sui/transactions');
  const kpMod = await import('@mysten/sui/keypairs/ed25519');
  const cryptoMod = await import('@mysten/sui/cryptography');
  SuiClientClass = clientMod.SuiClient;
  TransactionClass = txMod.Transaction;
  Ed25519KeypairClass = kpMod.Ed25519Keypair;
  decodeSuiPrivateKeyFn = cryptoMod.decodeSuiPrivateKey;
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
