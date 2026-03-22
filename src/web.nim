## Frontend entry point — compiled to web/app.js via `nim js`.
## Imports all nimponents components (they self-register on import).

{.push warning[UnusedImport]: off.}
import
  std/[dom, asyncjs],
  sui_client,
  components/[app_shell, wallet_connect, player_stats,
              create_delivery, courier_actions, admin_panel]
{.pop.}

proc main() {.async.} =
  ## Initialize the Sui SDK and set up wallet callbacks.
  await initSuiSdk()
  echo "Capsuleer Courier Service initialized"

  onConnectCallback = proc() =
    for selector in ["player-stats", "create-delivery", "courier-actions", "admin-panel"]:
      let el = document.querySelector(cstring(selector))
      if not el.isNil:
        {.emit: "if (`el`.connectedCallback) `el`.connectedCallback();".}

discard main()
