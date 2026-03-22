# Nim JS + Sui SDK Interop

## Overview

We use `nim js` to compile Nim code that wraps the `@mysten/sui` TypeScript SDK. This gives us a Nim-native API for building and executing Sui transactions, which works in both Node.js (for scripts/tests) and the browser (for the frontend, with a bundler).

## SDK Version

**We use `@mysten/sui` v1.21.1** which exports `SuiClient` with a complete, working API.

The v2.x SDK (`^2.0.0` through at least `2.9.1`) renamed `SuiClient` to `CoreClient` and introduced a broken `resolveTransactionPlugin` call chain that prevents `Transaction.build()` from working. If you need to upgrade to v2.x in the future, you may need to patch `CoreClient.prototype.resolveTransactionPlugin` to return `null`.

## ESM-Only Package

`@mysten/sui` is ESM-only (`.mjs` files). This means:
- `require()` does NOT work — you'll get `ERR_PACKAGE_PATH_NOT_EXPORTED` or get incomplete exports
- Must use dynamic `import()` which returns a `Promise`
- In Nim, we handle this with an async `initSuiSdk()` proc that loads modules at runtime

```nim
proc initSuiSdk*(): Future[void] {.async.} =
  {.emit: """
  const clientMod = await import('@mysten/sui/client');
  SuiClientClass = clientMod.SuiClient;
  // ... etc
  """.}
```

**This must be called once before using any SDK functions.**

## Nim JS Interop Patterns

### Importing npm modules

Use `{.emit.}` at module level for `require()` or inside async procs for `import()`:

```nim
# For CommonJS modules (rare these days):
{.emit: "const fs = require('fs');".}

# For ESM modules (use inside async proc):
{.emit: "const { SuiClient } = await import('@mysten/sui/client');".}
```

### Wrapping JS constructors

```nim
{.emit: "var SuiClientClass = null;".}  # populated by initSuiSdk

proc newSuiClient*(url: cstring): SuiClient {.importjs: "new SuiClientClass({url: #})".}
```

### Wrapping JS methods

Use `#` placeholders — first `#` is the receiver, rest are arguments:

```nim
proc signAndExecuteTransaction*(client: SuiClient, tx: Transaction, signer: Keypair): Future[TransactionResult] {.importjs: """
#.signAndExecuteTransaction({
  transaction: #,
  signer: #,
  options: { showEffects: true }
})""".}
```

### Passing arrays from Nim to JS

`openArray` doesn't map directly to JS arrays. Use `{.emit.}` to manually convert:

```nim
proc moveCall*(tx: Transaction, target: cstring, arguments: openArray[TransactionArgument]) =
  {.emit: """
  const argsArray = [];
  for (let i = 0; i < `arguments`.length; i++) {
    argsArray.push(`arguments`[i]);
  }
  `tx`.moveCall({ target: `target`, arguments: argsArray });
  """.}
```

### Bridging Nim and JS variables

- `{.exportc.}` makes a Nim variable visible in `{.emit.}` blocks
- Backtick syntax `` `nimVar` `` references Nim variables inside `{.emit.}` blocks
- `{.importjs.}` reads a JS variable or calls a JS function

### Types

Use `JsObject` from `std/jsffi` as a generic JS object wrapper. For type safety, use `distinct JsObject` or `ref object of JsObject`.

### Async

Sui SDK is fully async. Use `std/asyncjs` with `Future[T]` (maps to JS `Promise`):

```nim
import std/asyncjs

proc myAsyncProc(): Future[void] {.async.} =
  let result = await someAsyncCall()
```

### Reserved names

Nim's `result` is an implicit return variable. Don't use it as a parameter name:

```nim
# BAD: "result" conflicts with implicit return
proc digest*(result: TransactionResult): cstring {.importjs: "#.digest".}

# GOOD: use a different name
proc digest*(txResult: TransactionResult): cstring {.importjs: "#.digest".}
```

## Transaction Timing

When executing multiple transactions against shared objects on a local Sui node, you **must** wait for each transaction to be committed before starting the next:

```nim
let result = await client.signAndExecuteTransaction(tx, keypair)
discard await client.waitForTransaction(result.digest())
# NOW safe to use the shared object in the next transaction
```

Without this, the next transaction may reference a stale object version and fail with:
```
Object ID 0x... Version 0x5 is not available for consumption, current version: 0x7
```

Failed dry-run transactions (error cases) can also advance the object version, causing subsequent transactions to fail even if they should succeed. This is a known issue when testing error cases in sequence.

## Compilation

```bash
# Compile a Nim file to JS
nim js -o:output.js src/myfile.nim

# Run with Node.js (requires npm install first)
node output.js
```

No bundler needed for Node.js — `import()` resolves from `node_modules/` at runtime.

## Browser Bundling (esbuild)

Browsers have no `node_modules/`. We use **Option A: Global Bridge** — esbuild bundles npm deps into a single file that sets `window.SuiSDK`, and the Nim JS output reads from that global.

**`sui-bridge.js`** (project root, ~10 lines):
```js
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
// ... etc
window.SuiSDK = { SuiClient, Transaction, Ed25519Keypair, decodeSuiPrivateKey };
```

**Bundle it:**
```bash
npx esbuild sui-bridge.js --bundle --outfile=web/sui-bundle.js --format=iife
# Produces ~280KB browser-ready file
```

**`initSuiSdk()` detects the environment automatically:**
- Browser: reads from `window.SuiSDK` (loaded by `sui-bundle.js`)
- Node.js: dynamic `import()` from `node_modules/`

**HTML loads both scripts:**
```html
<script src="sui-bundle.js"></script>  <!-- npm deps as globals -->
<script src="app.js"></script>         <!-- Nim JS output -->
```

**Makefile targets:**
```bash
make frontend-bundle  # esbuild only
make frontend-dev     # bundle + nim js (debug)
make frontend-build   # bundle + nim js (release)
```
