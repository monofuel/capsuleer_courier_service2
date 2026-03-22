## Frontend entry point — compiled to web/app.js via `nim js`.
## Imports all nimponents components (they self-register on import).

import std/[dom, jsffi, asyncjs]
import sui_client
import components/[app_shell, wallet_connect, player_stats, create_delivery, courier_actions]

proc main() {.async.} =
  await initSuiSdk()
  echo "Capsuleer Courier Service initialized"

  # Set up wallet connect callback to refresh components
  onConnectCallback = proc() =
    let stats = document.querySelector("player-stats")
    if not stats.isNil:
      {.emit: "if (`stats`.render) `stats`.render();".}
    let create = document.querySelector("create-delivery")
    if not create.isNil:
      {.emit: "if (`create`.render) `create`.render();".}
    let actions = document.querySelector("courier-actions")
    if not actions.isNil:
      {.emit: "if (`actions`.render) `actions`.render();".}

discard main()
