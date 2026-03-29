## Wallet connection component.
## Dev mode: text inputs for RPC URL + private key, stored in localStorage.
## Production mode: EVE Vault via Sui Wallet Standard.

{.push warning[UnusedImport]: off.}
import
  std/[dom, asyncjs],
  nimponents,
  ../[sui_client, config]
{.pop.}

type WalletConnect* = ref object of WebComponent

var
  connectedClient*: SuiClient = nil
  connectedKeypair*: Keypair = nil
  connectedAddress*: cstring = nil
  connectedWallet*: WalletStandard = nil
  connectedAccount*: WalletAccount = nil
  onConnectCallback*: proc() = nil

proc render(self: WalletConnect)

proc signAndExecute*(tx: Transaction): Future[TransactionResult] {.async.} =
  ## Unified transaction signing — dispatches to demo mock, keypair (dev), or EVE Vault (prod).
  if isDemo:
    var fakeResult: TransactionResult
    {.emit: """
    console.log('[demo] Simulating transaction...');
    await new Promise(function(r) { setTimeout(r, 1500); });
    window._demoDeliveryCount = (window._demoDeliveryCount || 0) + 1;
    `fakeResult` = {
      digest: 'Demo' + Math.random().toString(36).slice(2, 10),
      effects: { status: { status: 'success' } }
    };
    console.log('[demo] Simulated transaction complete, digest:', `fakeResult`.digest);
    """.}
    result = fakeResult
  elif connectedWallet != nil and connectedAccount != nil:
    let chain: cstring = if activeEnvironment == "devnet": "sui:devnet"
                         else: "sui:testnet"
    result = await walletSignAndExecute(connectedWallet, tx, connectedAccount, chain)
  elif connectedClient != nil and connectedKeypair != nil:
    result = await connectedClient.signAndExecuteTransaction(tx, connectedKeypair)
  else:
    {.emit: "throw new Error('No wallet connected');".}

proc renderDev(self: WalletConnect) =
  ## Dev mode: RPC URL + private key inputs.
  if connectedAddress != nil:
    self.innerHTML = cstring(
      "<div class=\"wallet-connected\">" &
      "<span class=\"wallet-address\">" & $connectedAddress & "</span>" &
      "<button class=\"btn btn-sm\" id=\"wallet-disconnect\">Disconnect</button>" &
      "</div>"
    )
    let btn = self.querySelector("#wallet-disconnect")
    if not btn.isNil:
      btn.addEventListener("click", proc(e: Event) =
        connectedClient = nil
        connectedKeypair = nil
        connectedAddress = nil
        {.emit: """
        localStorage.removeItem('sui_rpc_url');
        localStorage.removeItem('sui_private_key');
        """.}
        self.render()
      )
  else:
    var savedRpc, savedKey: cstring
    {.emit: """
    `savedRpc` = localStorage.getItem('sui_rpc_url') || `config.rpcUrl`;
    `savedKey` = localStorage.getItem('sui_private_key') || '';
    """.}
    self.innerHTML = cstring(
      "<div class=\"wallet-form\">" &
      "<div class=\"form-group\"><label>RPC URL</label>" &
      "<input type=\"text\" id=\"rpc-url\" value=\"" & $savedRpc & "\" /></div>" &
      "<div class=\"form-group\"><label>Private Key</label>" &
      "<input type=\"password\" id=\"private-key\" value=\"" & $savedKey & "\" placeholder=\"suiprivkey...\" /></div>" &
      "<button class=\"btn\" id=\"wallet-connect\">Connect</button>" &
      "<div id=\"wallet-error\" class=\"error\"></div>" &
      "</div>"
    )
    let btn = self.querySelector("#wallet-connect")
    if not btn.isNil:
      btn.addEventListener("click", proc(e: Event) =
        let rpcInput = self.querySelector("#rpc-url").InputElement
        let keyInput = self.querySelector("#private-key").InputElement
        let errorDiv = self.querySelector("#wallet-error")
        let rpcUrl = rpcInput.value
        let privKey = keyInput.value

        if privKey.len == 0:
          errorDiv.innerHTML = "Private key required"
          return

        connectedClient = newSuiClient(rpcUrl)
        connectedKeypair = newKeypairFromPrivateKey(privKey)
        connectedAddress = connectedKeypair.getAddress()

        {.emit: """
        window._courierAddress = `connectedAddress`;""".}

        {.emit: """
        localStorage.setItem('sui_rpc_url', `rpcUrl`);
        localStorage.setItem('sui_private_key', `privKey`);
        """.}

        self.render()
        if onConnectCallback != nil:
          onConnectCallback()
      )

proc renderProdConnected(self: WalletConnect) =
  ## Render connected state in production mode — just show the address.
  var shortAddr: cstring
  {.emit: "`shortAddr` = `connectedAddress`.slice(0, 6) + '...' + `connectedAddress`.slice(-4);".}
  self.innerHTML = cstring(
    "<div class=\"wallet-connected\">" &
    "<span class=\"wallet-address\">" & $shortAddr & "</span>" &
    "</div>"
  )

proc renderProdWalletFound(self: WalletConnect, wallet: WalletStandard) =
  ## Render the connect button once EVE Vault is found.
  self.innerHTML = cstring(
    "<div class=\"wallet-form\">" &
    "<button class=\"btn\" id=\"vault-connect\">Connect with EVE Vault</button>" &
    "<div id=\"wallet-error\" class=\"error\"></div>" &
    "</div>"
  )
  let btn = self.querySelector("#vault-connect")
  if not btn.isNil:
    btn.addEventListener("click", proc(e: Event) =
      let errorDiv = self.querySelector("#wallet-error")
      errorDiv.innerHTML = "Connecting..."

      proc doConnect() {.async.} =
        let account = await walletConnect(wallet)
        if account.isNil:
          errorDiv.innerHTML = "Connection failed — no accounts returned"
          return
        connectedWallet = wallet
        connectedAccount = account
        connectedAddress = walletAddress(account)
        connectedClient = newSuiClient(rpcUrl)

        {.emit: "window._courierAddress = `connectedAddress`;".}

        self.render()
        if onConnectCallback != nil:
          onConnectCallback()

      runWithErrorHandler(doConnect(), errorDiv)
    )

proc renderProd(self: WalletConnect) =
  ## Production mode: EVE Vault wallet standard connection.
  ## Wrapped in try/catch so errors display on-page instead of blank screen.
  {.emit: """
  try {
  """.}

  if connectedAddress != nil:
    self.renderProdConnected()
  else:
    self.innerHTML = cstring(
      "<div class=\"wallet-form\">" &
      "<p>Connecting...</p>" &
      "</div>"
    )
    waitForEveVault(proc(wallet: WalletStandard) =
      if wallet.isNil:
        let walletNames = listWallets()
        self.innerHTML = cstring(
          "<div class=\"wallet-form\">" &
          "<p class=\"error\">EVE Vault not detected.</p>" &
          "<p style=\"font-size:0.8em\">Registered wallets: " & $walletNames & "</p>" &
          "<button class=\"btn\" id=\"wallet-retry\">Retry</button>" &
          "</div>"
        )
        let retryBtn = self.querySelector("#wallet-retry")
        if not retryBtn.isNil:
          retryBtn.addEventListener("click", proc(e: Event) = self.render())
      else:
        # Auto-connect in production mode.
        self.innerHTML = cstring(
          "<div class=\"wallet-form\">" &
          "<p>Connecting to EVE Vault...</p>" &
          "<div id=\"wallet-error\" class=\"error\"></div>" &
          "</div>"
        )
        let errorDiv = self.querySelector("#wallet-error")
        proc doConnect() {.async.} =
          let account = await walletConnect(wallet)
          if account.isNil:
            self.renderProdWalletFound(wallet)
            return
          connectedWallet = wallet
          connectedAccount = account
          connectedAddress = walletAddress(account)
          connectedClient = newSuiClient(rpcUrl)
          {.emit: "window._courierAddress = `connectedAddress`;".}
          self.render()
          if onConnectCallback != nil:
            onConnectCallback()
        runWithErrorHandler(doConnect(), errorDiv)
    )

  {.emit: """
  } catch(e) {
    console.error('Wallet render error:', e);
    `self`.innerHTML = '<div class="wallet-form"><p class="error">Wallet error: ' + e.message + '</p><button class="btn" id="wallet-retry">Retry</button></div>';
    var rb = `self`.querySelector('#wallet-retry');
    if (rb) rb.addEventListener('click', function() { `self`.render(); });
  }
  """.}

proc renderDemo(self: WalletConnect) =
  ## Demo mode: auto-connect with fake address, show "Demo Mode" badge.
  ## Don't set connectedClient — keeps waitForTransaction guards from calling chain with fake digests.
  if connectedAddress == nil:
    connectedAddress = "0xd3m0...c0de"
    {.emit: "window._courierAddress = '0xd3m0000000000000000000000000000000000000000000000000000000c0de';".}
    if onConnectCallback != nil:
      onConnectCallback()
  self.innerHTML = cstring(
    "<div class=\"wallet-connected\">" &
    "<span style=\"color:var(--accent);font-family:var(--font-headline);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em\">Demo Mode</span>" &
    "</div>"
  )

proc render(self: WalletConnect) =
  if isDemo:
    self.renderDemo()
  elif isProduction:
    self.renderProd()
  else:
    self.renderDev()

proc tryAutoConnect*() =
  ## Auto-connect from saved credentials (dev mode only).
  if not sdkLoaded:
    return
  if connectedAddress != nil:
    return
  if isProduction:
    return
  var savedKey: cstring
  {.emit: "`savedKey` = localStorage.getItem('sui_private_key') || '';".}
  if savedKey.len > 0:
    var savedRpc: cstring
    {.emit: "`savedRpc` = localStorage.getItem('sui_rpc_url') || `config.rpcUrl`;".}
    connectedClient = newSuiClient(savedRpc)
    connectedKeypair = newKeypairFromPrivateKey(savedKey)
    connectedAddress = connectedKeypair.getAddress()
    {.emit: "window._courierAddress = `connectedAddress`;".}
    let el = document.querySelector("wallet-connect")
    if not el.isNil:
      {.emit: "if (`el`.connectedCallback) `el`.connectedCallback();".}
    if onConnectCallback != nil:
      onConnectCallback()

proc connectedCallback(self: WalletConnect) =
  ## Called when element is added to DOM.
  self.render()

setupNimponent[WalletConnect]("wallet-connect", nil, connectedCallback)
