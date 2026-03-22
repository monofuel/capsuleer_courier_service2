## Create delivery request form component.

import
  std/[dom, asyncjs],
  nimponents,
  ../[sui_client, courier_client],
  ./[wallet_connect, player_stats]

type CreateDelivery* = ref object of WebComponent

proc render(self: CreateDelivery) =
  ## Render the create delivery form.
  if connectedAddress == nil:
    self.innerHTML = "<div class=\"panel\"><p>Connect wallet to create deliveries</p></div>"
    return

  self.innerHTML = cstring(
    "<div class=\"panel\">" &
    "<h3>Request Delivery</h3>" &
    "<div class=\"form-group\"><label>Storage Unit ID</label>" &
    "<input type=\"text\" id=\"ssu-id\" value=\"0x0000000000000000000000000000000000000000000000000000000000001234\" /></div>" &
    "<div class=\"form-group\"><label>Item Type ID</label>" &
    "<input type=\"number\" id=\"type-id\" value=\"77800\" /></div>" &
    "<div class=\"form-group\"><label>Quantity (1-500)</label>" &
    "<input type=\"number\" id=\"quantity\" value=\"1\" min=\"1\" max=\"500\" /></div>" &
    "<button class=\"btn\" id=\"create-btn\">Request Delivery</button>" &
    "<div id=\"create-status\" class=\"status\"></div>" &
    "</div>"
  )

  let btn = self.querySelector("#create-btn")
  if not btn.isNil:
    btn.addEventListener("click", proc(e: Event) =
      if connectedClient == nil or packageId == nil or configId == nil:
        let status = self.querySelector("#create-status")
        if not status.isNil:
          status.innerHTML = "Not configured — set package and config IDs"
        return

      let ssuInput = self.querySelector("#ssu-id").InputElement
      let typeInput = self.querySelector("#type-id").InputElement
      let qtyInput = self.querySelector("#quantity").InputElement
      let statusDiv = self.querySelector("#create-status")

      let ssuId = ssuInput.value
      let typeId = typeInput.value
      var qty: int
      {.emit: "`qty` = parseInt(`qtyInput`.value) || 1;".}

      statusDiv.innerHTML = "Submitting..."

      proc submit() {.async.} =
        let txResult = await connectedClient.createDeliveryRequest(
          connectedKeypair, configId, packageId, ssuId, typeId, qty)
        if txResult.isSuccess():
          statusDiv.innerHTML = cstring("Delivery requested! Digest: " & $txResult.digest())
          refreshStats()
        else:
          statusDiv.innerHTML = "Transaction failed"

      runWithErrorHandler(submit(), statusDiv)
    )

proc connectedCallback(self: CreateDelivery) =
  ## Called when element is added to DOM.
  self.render()

setupNimponent[CreateDelivery]("create-delivery", nil, connectedCallback)
