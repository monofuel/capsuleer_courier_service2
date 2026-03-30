## Frontend entry point — compiled to web/app.js via `nim js`.
## Imports all nimponents components (they self-register on import).

{.push warning[UnusedImport]: off.}
import
  std/[dom, asyncjs],
  sui_client,
  courier_client,
  config,
  components/[app_shell, wallet_connect, player_stats,
              create_delivery, admin_panel, delivery_list, leaderboard]
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

    proc afterConnect() {.async.} =
      # Fetch character info first (sets window._courierCharId, needed for owner detection).
      if rpcUrl != nil and worldPackageId != nil and connectedAddress != nil:
        await fetchCharacterInfo(rpcUrl, worldPackageId, connectedAddress)
      # Then fetch SSU info (checks extension auth + owner using charId).
      if rpcUrl != nil and ssuId != nil:
        await fetchSsuOwnerCapId(rpcUrl, ssuId)
      # Re-render app shell (gate check happens there), which re-creates child components.
      let appEl = document.querySelector("courier-app")
      if not appEl.isNil:
        {.emit: "if (`appEl`.connectedCallback) `appEl`.connectedCallback();".}

    {.emit: "`afterConnect`().catch(function(e) { console.error('[init] Post-connect error:', e); });".}


{.emit: """
`main`().catch(function(err) {
  console.error('Init error:', err);
  var el = document.querySelector('courier-app');
  if (el) el.innerHTML = '<div class="error" style="padding:1em"><h2>Initialization Error</h2><pre>' + err.message + '</pre></div>';
});
""".}
