## Courier actions — fulfill delivery and pickup.

import
  std/[dom, asyncjs],
  nimponents,
  ../[sui_client, courier_client],
  ./[wallet_connect, player_stats, delivery_list]

type CourierActions* = ref object of WebComponent

proc render(self: CourierActions) =
  ## Render the courier actions panel.
  if connectedAddress == nil:
    self.innerHTML = "<div class=\"panel\"><p>Connect wallet for courier actions</p></div>"
    return

  self.innerHTML = cstring(
    "<div class=\"panel\">" &
    "<h3>Courier Actions</h3>" &
    "<div class=\"action-group\">" &
    "<h4>Fulfill Delivery</h4>" &
    "<div class=\"form-row\">" &
    "<input type=\"number\" id=\"fulfill-id\" placeholder=\"Delivery ID\" min=\"0\" />" &
    "<button class=\"btn\" id=\"fulfill-btn\">Fulfill</button></div>" &
    "<div id=\"fulfill-status\" class=\"status\"></div></div>" &
    "<div class=\"action-group\">" &
    "<h4>Pickup Delivery</h4>" &
    "<div class=\"form-row\">" &
    "<input type=\"number\" id=\"pickup-id\" placeholder=\"Delivery ID\" min=\"0\" />" &
    "<button class=\"btn\" id=\"pickup-btn\">Pickup</button></div>" &
    "<div id=\"pickup-status\" class=\"status\"></div></div>" &
    "</div>"
  )

  # Fulfill button.
  let fulfillBtn = self.querySelector("#fulfill-btn")
  if not fulfillBtn.isNil:
    fulfillBtn.addEventListener("click", proc(e: Event) =
      if connectedClient == nil or packageId == nil or configId == nil:
        return
      let idInput = self.querySelector("#fulfill-id").InputElement
      let statusDiv = self.querySelector("#fulfill-status")
      let deliveryId = idInput.value
      statusDiv.innerHTML = "Submitting..."

      proc submit() {.async.} =
        let txResult = await connectedClient.fulfillDelivery(
          connectedKeypair, configId, packageId, deliveryId)
        if txResult.isSuccess():
          statusDiv.innerHTML = cstring("Delivered! Digest: " & $txResult.digest())
          refreshStats()
          refreshDeliveryList()
        else:
          statusDiv.innerHTML = "Transaction failed"

      runWithErrorHandler(submit(), statusDiv)
    )

  # Pickup button.
  let pickupBtn = self.querySelector("#pickup-btn")
  if not pickupBtn.isNil:
    pickupBtn.addEventListener("click", proc(e: Event) =
      if connectedClient == nil or packageId == nil or configId == nil:
        return
      let idInput = self.querySelector("#pickup-id").InputElement
      let statusDiv = self.querySelector("#pickup-status")
      let deliveryId = idInput.value
      statusDiv.innerHTML = "Submitting..."

      proc submit() {.async.} =
        let txResult = await connectedClient.pickup(
          connectedKeypair, configId, packageId, deliveryId)
        if txResult.isSuccess():
          statusDiv.innerHTML = cstring("Picked up! Digest: " & $txResult.digest())
          refreshStats()
          refreshDeliveryList()
        else:
          statusDiv.innerHTML = "Transaction failed"

      runWithErrorHandler(submit(), statusDiv)
    )

proc connectedCallback(self: CourierActions) =
  ## Called when element is added to DOM.
  self.render()

setupNimponent[CourierActions]("courier-actions", nil, connectedCallback)
