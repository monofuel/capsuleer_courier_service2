## Admin panel — set likes for item types.

import
  std/[dom, asyncjs],
  nimponents,
  ../[sui_client, courier_client],
  ./[wallet_connect, player_stats]

type AdminPanel* = ref object of WebComponent

proc render(self: AdminPanel) =
  ## Render the admin panel.
  if connectedAddress == nil:
    self.innerHTML = "<div class=\"panel\"><p>Connect wallet for admin actions</p></div>"
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
      if connectedClient == nil or packageId == nil or configId == nil or adminCapId == nil:
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
        let txResult = await connectedClient.setLikes(
          connectedKeypair, configId, adminCapId, packageId, typeId, likesVal)
        if txResult.isSuccess():
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
