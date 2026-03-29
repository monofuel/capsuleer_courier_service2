## Frontend entry point — compiled to web/app.js via `nim js`.
## Imports all nimponents components (they self-register on import).

{.push warning[UnusedImport]: off.}
import
  std/[dom, asyncjs],
  sui_client,
  courier_client,
  config,
  components/[app_shell, wallet_connect, player_stats,
              create_delivery, courier_actions, admin_panel, delivery_list, leaderboard]
{.pop.}

proc main() {.async.} =
  ## Initialize the Sui SDK and set up wallet callbacks.
  await initSuiSdk()
  echo "Capsuleer Courier Service initialized"

  onConnectCallback = proc() =
    # Cache the connected address display name.
    if connectedAddress != nil:
      var savedName: cstring
      {.emit: "`savedName` = localStorage.getItem('courier_display_name') || '';".}
      if savedName.len > 0:
        setAddressName(connectedAddress, savedName)

    for selector in ["player-stats", "create-delivery", "courier-actions", "admin-panel", "delivery-list", "courier-leaderboard"]:
      let el = document.querySelector(cstring(selector))
      if not el.isNil:
        {.emit: "if (`el`.connectedCallback) `el`.connectedCallback();".}

  # Auto-connect from saved credentials now that the SDK is ready.
  tryAutoConnect()

discard main()
