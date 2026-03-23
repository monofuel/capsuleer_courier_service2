## Main app shell component — layout with config inputs and child components.

{.push warning[UnusedImport]: off.}
import
  std/dom,
  nimponents,
  ./[wallet_connect, player_stats, create_delivery, courier_actions, admin_panel, delivery_list, leaderboard]
{.pop.}

type AppShell* = ref object of WebComponent

proc render(self: AppShell) =
  ## Render the app layout.
  self.innerHTML = cstring(
    "<header>" &
    "<h1>Capsuleer Courier Service</h1>" &
    "<wallet-connect></wallet-connect>" &
    "</header>" &
    "<main>" &
    "<div class=\"config-bar\">" &
    "<div class=\"form-group\"><label>Package ID</label>" &
    "<input type=\"text\" id=\"package-id\" placeholder=\"0x...\" /></div>" &
    "<div class=\"form-group\"><label>Config ID</label>" &
    "<input type=\"text\" id=\"config-id\" placeholder=\"0x...\" /></div>" &
    "<div class=\"form-group\"><label>AdminCap ID</label>" &
    "<input type=\"text\" id=\"admincap-id\" placeholder=\"0x...\" /></div>" &
    "<div class=\"form-group\"><label>Display Name</label>" &
    "<input type=\"text\" id=\"display-name\" placeholder=\"Your name\" /></div>" &
    "<button class=\"btn btn-sm\" id=\"save-config\">Save</button></div>" &
    "<div class=\"panels\">" &
    "<delivery-list></delivery-list>" &
    "<player-stats></player-stats>" &
    "<admin-panel></admin-panel>" &
    "<create-delivery></create-delivery>" &
    "<courier-actions></courier-actions>" &
    "<courier-leaderboard></courier-leaderboard>" &
    "</div></main>"
  )

  # Load saved config.
  var savedPkg, savedCfg, savedCap, savedName: cstring
  {.emit: """
  `savedPkg` = localStorage.getItem('courier_package_id') || '';
  `savedCfg` = localStorage.getItem('courier_config_id') || '';
  `savedCap` = localStorage.getItem('courier_admincap_id') || '';
  `savedName` = localStorage.getItem('courier_display_name') || '';
  """.}

  let pkgInput = self.querySelector("#package-id").InputElement
  let cfgInput = self.querySelector("#config-id").InputElement
  let capInput = self.querySelector("#admincap-id").InputElement
  let nameInput = self.querySelector("#display-name").InputElement
  if not pkgInput.isNil:
    pkgInput.value = savedPkg
  if not cfgInput.isNil:
    cfgInput.value = savedCfg
  if not capInput.isNil:
    capInput.value = savedCap
  if not nameInput.isNil:
    nameInput.value = savedName

  if savedPkg.len > 0:
    packageId = savedPkg
  if savedCfg.len > 0:
    configId = savedCfg
  if savedCap.len > 0:
    adminCapId = savedCap

  let saveBtn = self.querySelector("#save-config")
  if not saveBtn.isNil:
    saveBtn.addEventListener("click", proc(e: Event) =
      let pkg = self.querySelector("#package-id").InputElement.value
      let cfg = self.querySelector("#config-id").InputElement.value
      let cap = self.querySelector("#admincap-id").InputElement.value
      let displayName = self.querySelector("#display-name").InputElement.value
      packageId = pkg
      configId = cfg
      adminCapId = cap
      {.emit: """
      localStorage.setItem('courier_package_id', `pkg`);
      localStorage.setItem('courier_config_id', `cfg`);
      localStorage.setItem('courier_admincap_id', `cap`);
      localStorage.setItem('courier_display_name', `displayName`);
      if (`displayName` && window._courierAddress) {
        if (!window._nameCache) window._nameCache = {};
        window._nameCache[window._courierAddress] = `displayName`;
      }
      """.}
    )

proc connectedCallback(self: AppShell) =
  ## Called when element is added to DOM.
  self.render()

setupNimponent[AppShell]("courier-app", nil, connectedCallback)
