## Main app shell component — layout with config inputs and child components.

import std/[dom, jsffi, asyncjs, strformat]
import nimponents
import ../sui_client
import wallet_connect, player_stats, create_delivery, courier_actions

type AppShell* = ref object of WebComponent

proc render(self: AppShell) =
  self.innerHTML = cstring("""
    <header>
      <h1>Capsuleer Courier Service</h1>
      <wallet-connect></wallet-connect>
    </header>
    <main>
      <div class="config-bar">
        <div class="form-group">
          <label>Package ID</label>
          <input type="text" id="package-id" placeholder="0x..." />
        </div>
        <div class="form-group">
          <label>Config ID</label>
          <input type="text" id="config-id" placeholder="0x..." />
        </div>
        <button class="btn btn-sm" id="save-config">Save</button>
      </div>
      <div class="panels">
        <player-stats></player-stats>
        <create-delivery></create-delivery>
        <courier-actions></courier-actions>
      </div>
    </main>
  """)

  # Load saved config
  var savedPkg, savedCfg: cstring
  {.emit: """
  `savedPkg` = localStorage.getItem('courier_package_id') || '';
  `savedCfg` = localStorage.getItem('courier_config_id') || '';
  """.}

  let pkgInput = self.querySelector("#package-id").InputElement
  let cfgInput = self.querySelector("#config-id").InputElement
  if not pkgInput.isNil:
    pkgInput.value = savedPkg
  if not cfgInput.isNil:
    cfgInput.value = savedCfg

  if savedPkg.len > 0:
    packageId = savedPkg
  if savedCfg.len > 0:
    configId = savedCfg

  let saveBtn = self.querySelector("#save-config")
  if not saveBtn.isNil:
    saveBtn.addEventListener("click", proc(e: Event) =
      let pkg = self.querySelector("#package-id").InputElement.value
      let cfg = self.querySelector("#config-id").InputElement.value
      packageId = pkg
      configId = cfg
      {.emit: """
      localStorage.setItem('courier_package_id', `pkg`);
      localStorage.setItem('courier_config_id', `cfg`);
      """.}
    )

proc connectedCallback(self: AppShell) =
  self.render()

setupNimponent[AppShell]("courier-app", nil, connectedCallback)
