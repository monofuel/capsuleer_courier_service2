## Admin panel — set likes for item types.

import
  std/[dom, asyncjs],
  nimponents,
  ../[sui_client, courier_client, config],
  ./wallet_connect

type AdminPanel* = ref object of WebComponent

const AdminAddress = "0xafb51cd5dad394a2ad45397eb14545cf2fd52c8e314485233761cee0b35d1d24"

proc render(self: AdminPanel) =
  ## Render the admin panel — only visible to the admin address (or dev mode).
  if connectedAddress == nil:
    self.innerHTML = ""
    return

  # In production, only show for the admin.
  if isProduction:
    var isAdmin: bool
    {.emit: "`isAdmin` = (`connectedAddress` === `AdminAddress`);".}
    if not isAdmin:
      self.innerHTML = ""
      return

  self.innerHTML = cstring(
    "<div class=\"panel\">" &
    "<h3>Admin: Set Likes</h3>" &
    "<div class=\"form-row\">" &
    "<input type=\"number\" id=\"likes-type-id\" placeholder=\"Item Type ID\" value=\"77800\" />" &
    "<input type=\"number\" id=\"likes-value\" placeholder=\"Likes\" value=\"10\" />" &
    "<button class=\"btn\" id=\"set-likes-btn\">Set Likes</button></div>" &
    "<div id=\"likes-status\" class=\"status\"></div>" &
    "</div>"
  )

  let btn = self.querySelector("#set-likes-btn")
  if not btn.isNil:
    btn.addEventListener("click", proc(e: Event) =
      if connectedAddress == nil or packageId == nil or configId == nil or adminCapId == nil:
        let status = self.querySelector("#likes-status")
        if not status.isNil:
          status.innerHTML = "Not configured — set package, config, and admin cap IDs"
        return

      let typeInput = self.querySelector("#likes-type-id").InputElement
      let likesInput = self.querySelector("#likes-value").InputElement
      let statusDiv = self.querySelector("#likes-status")
      let typeId = typeInput.value
      let likesVal = likesInput.value
      statusDiv.innerHTML = "Submitting..."

      proc submit() {.async.} =
        let tx = buildSetLikes(configId, adminCapId, packageId, typeId, likesVal)
        let txResult = await signAndExecute(tx)
        if txResult.isSuccess():
          if connectedClient != nil:
            discard await connectedClient.waitForTransaction(txResult.digest())
          statusDiv.innerHTML = cstring("Likes set! Digest: " & $txResult.digest())
        else:
          statusDiv.innerHTML = "Transaction failed"

      runWithErrorHandler(submit(), statusDiv)
    )

proc connectedCallback(self: AdminPanel) =
  ## Called when element is added to DOM.
  self.render()

setupNimponent[AdminPanel]("admin-panel", nil, connectedCallback)
