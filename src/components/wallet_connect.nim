## Dev-mode wallet connection component.
## Text inputs for RPC URL + private key, stored in localStorage.
## For production, this would be replaced with EVE Vault wallet adapter.

import
  std/dom,
  nimponents,
  ../sui_client

type WalletConnect* = ref object of WebComponent

var
  connectedClient*: SuiClient = nil
  connectedKeypair*: Keypair = nil
  connectedAddress*: cstring = nil
  onConnectCallback*: proc() = nil

proc render(self: WalletConnect) =
  ## Render the wallet connection UI based on current state.
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
    `savedRpc` = localStorage.getItem('sui_rpc_url') || 'http://127.0.0.1:9000';
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
        localStorage.setItem('sui_rpc_url', `rpcUrl`);
        localStorage.setItem('sui_private_key', `privKey`);
        """.}

        self.render()
        if onConnectCallback != nil:
          onConnectCallback()
      )

proc connectedCallback(self: WalletConnect) =
  ## Called when element is added to DOM.
  self.render()

  # Auto-connect if we have saved credentials.
  var savedKey: cstring
  {.emit: "`savedKey` = localStorage.getItem('sui_private_key') || '';".}
  if savedKey.len > 0:
    var savedRpc: cstring
    {.emit: "`savedRpc` = localStorage.getItem('sui_rpc_url') || 'http://127.0.0.1:9000';".}
    connectedClient = newSuiClient(savedRpc)
    connectedKeypair = newKeypairFromPrivateKey(savedKey)
    connectedAddress = connectedKeypair.getAddress()
    self.render()
    if onConnectCallback != nil:
      onConnectCallback()

setupNimponent[WalletConnect]("wallet-connect", nil, connectedCallback)
