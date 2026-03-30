## Main app shell component — layout with environment selector and child components.

{.push warning[UnusedImport]: off.}
import
  std/dom,
  nimponents,
  ../[config, sui_client, courier_client],
  ./[wallet_connect, player_stats, create_delivery, admin_panel, delivery_list, leaderboard, courier_quote, debug_console]
{.pop.}

type AppShell* = ref object of WebComponent

proc render(self: AppShell) =
  ## Render the app layout.
  if isLandingPage:
    # Public landing page — no wallet needed, show leaderboard + open orders.
    self.innerHTML = cstring(
      "<header>" &
      "<h1>Capsuleer Courier Service</h1>" &
      "</header>" &
      "<main>" &
      "<courier-quote></courier-quote>" &
      "<div class=\"panels\">" &
      "<div class=\"panel\">" &
      "<h3>Welcome</h3>" &
      "<p>A decentralized courier service for EVE Frontier.</p>" &
      "<p style=\"margin-top:0.5rem\">Paste your Smart Storage Unit ID to generate a dApp link for your postbox.</p>" &
      "<div class=\"form-group\" style=\"margin-top:0.75rem\"><label>Storage Unit ID</label>" &
      "<input type=\"text\" id=\"ssu-input\" placeholder=\"0x...\" /></div>" &
      "<button class=\"btn\" id=\"generate-btn\" style=\"margin-top:0.5rem\">Generate Link</button>" &
      "<div id=\"generated-url\" style=\"display:none;margin-top:0.75rem\">" &
      "<label style=\"font-size:9px;font-weight:700;letter-spacing:0.81px;text-transform:uppercase;color:var(--text-secondary)\">Your dApp Link</label>" &
      "<input type=\"text\" id=\"url-output\" readonly style=\"width:100%;cursor:pointer\" />" &
      "<p style=\"font-size:11px;color:var(--text-muted);margin-top:0.25rem\">Copy this URL into your SSU's dApp link configuration.</p>" &
      "</div>" &
      "</div>" &
      "<delivery-list></delivery-list>" &
      "<courier-leaderboard></courier-leaderboard>" &
      "</div></main>"
    )
  elif isDemo:
    # Demo mode: same as production layout but with demo indicator.
    self.innerHTML = cstring(
      "<header>" &
      "<h1>Capsuleer Courier Service</h1>" &
      "<div style=\"display:flex;align-items:center;gap:1rem\">" &
      "<span style=\"color:var(--accent);font-family:var(--font-headline);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;border:1px solid var(--accent);padding:3px 8px\">Demo Mode</span>" &
      "<wallet-connect></wallet-connect>" &
      "</div>" &
      "</header>" &
      "<main>" &
      "<courier-quote></courier-quote>" &
      "<div class=\"panels\">" &
      "<create-delivery></create-delivery>" &
      "<delivery-list></delivery-list>" &
      "<player-stats></player-stats>" &
      "<courier-leaderboard></courier-leaderboard>" &
      "</div></main>"
    )
  elif isProduction:
    # Check extension authorization state for onboarding gate.
    var extAuthorized, extIsOwner, walletConnected: bool
    {.emit: """
    `extAuthorized` = !!window._courierExtensionAuthorized;
    `extIsOwner` = !!window._courierIsOwner;
    `walletConnected` = !!window._courierAddress;
    """.}

    if not walletConnected:
      # State A: No wallet connected yet.
      self.innerHTML = cstring(
        "<header>" &
        "<h1>Capsuleer Courier Service</h1>" &
        "<wallet-connect></wallet-connect>" &
        "</header>" &
        "<main>" &
        "<courier-quote></courier-quote>" &
        "<div class=\"panels\">" &
        "<div class=\"panel\" style=\"text-align:center;padding:3rem 2rem\">" &
        "<h2 style=\"margin-bottom:1rem\">Welcome, Capsuleer</h2>" &
        "<p style=\"color:var(--text-secondary)\">Connect your wallet to get started.</p>" &
        "</div></div></main>"
      )
    elif not extAuthorized and extIsOwner:
      # State B: Owner needs to authorize the extension.
      self.innerHTML = cstring(
        "<header>" &
        "<h1>Capsuleer Courier Service</h1>" &
        "<wallet-connect></wallet-connect>" &
        "</header>" &
        "<main>" &
        "<courier-quote></courier-quote>" &
        "<div class=\"panels\">" &
        "<div class=\"panel\" style=\"text-align:center;padding:3rem 2rem\">" &
        "<h2 style=\"margin-bottom:1rem\">Authorize the Courier Service</h2>" &
        "<p style=\"color:var(--text-secondary);margin-bottom:0.5rem\">Your SSU needs the Courier Service extension authorized before it can accept delivery requests.</p>" &
        "<p style=\"color:var(--text-muted);font-size:11px;margin-bottom:1.5rem\">This registers the courier contract on your Smart Storage Unit so it can manage item transfers.</p>" &
        "<button class=\"btn\" id=\"gate-authorize\" style=\"font-size:1.1em;padding:0.75em 2em\">Authorize Extension</button>" &
        "<div id=\"gate-status\" style=\"margin-top:1rem;color:var(--text-secondary)\"></div>" &
        "</div></div></main>"
      )
      # Wire up authorize button.
      {.emit: """
      var gateBtn = `self`.querySelector('#gate-authorize');
      if (gateBtn) {
        gateBtn.addEventListener('click', function() {
          var charId = window._courierCharId;
          var capId = window._courierSsuOwnerCapId;
          var capVer = window._courierSsuOwnerCapVersion;
          var capDig = window._courierSsuOwnerCapDigest;
          var statusDiv = `self`.querySelector('#gate-status');
          if (!charId || !capId || !capVer || !capDig) {
            if (statusDiv) statusDiv.textContent = 'Missing character or SSU info. Try refreshing.';
            return;
          }
          gateBtn.disabled = true;
          gateBtn.textContent = 'Authorizing...';
          var tx = `buildAuthorizeExtension`(`packageId`, `worldPackageId`, `ssuId`, charId, capId, capVer, capDig);
          `signAndExecute`(tx).then(function(result) {
            if (`isSuccess`(result)) {
              window._courierExtensionAuthorized = true;
              gateBtn.textContent = 'Authorized!';
              gateBtn.style.background = 'var(--success)';
              if (statusDiv) statusDiv.textContent = 'Extension authorized. Loading courier service...';
              setTimeout(function() {
                if (`self`.connectedCallback) `self`.connectedCallback();
              }, 1000);
            } else {
              gateBtn.textContent = 'Failed';
              gateBtn.style.background = 'var(--error)';
              if (statusDiv) statusDiv.textContent = 'Transaction failed. Check console for details.';
              console.error('Authorize extension failed:', JSON.stringify(result, null, 2));
              gateBtn.disabled = false;
              setTimeout(function() { gateBtn.textContent = 'Authorize Extension'; gateBtn.style.background = ''; }, 3000);
            }
          }).catch(function(err) {
            console.error('Authorize extension error:', err.message);
            gateBtn.textContent = 'Error';
            gateBtn.style.background = 'var(--error)';
            if (statusDiv) statusDiv.textContent = err.message;
            gateBtn.disabled = false;
            setTimeout(function() { gateBtn.textContent = 'Authorize Extension'; gateBtn.style.background = ''; }, 3000);
          });
        });
      }
      """.}
    elif not extAuthorized:
      # State C: Not owner, extension not authorized.
      self.innerHTML = cstring(
        "<header>" &
        "<h1>Capsuleer Courier Service</h1>" &
        "<wallet-connect></wallet-connect>" &
        "</header>" &
        "<main>" &
        "<courier-quote></courier-quote>" &
        "<div class=\"panels\">" &
        "<div class=\"panel\" style=\"text-align:center;padding:3rem 2rem\">" &
        "<h2 style=\"margin-bottom:1rem\">Courier Service Not Enabled</h2>" &
        "<p style=\"color:var(--text-secondary)\">This SSU hasn't enabled the Courier Service yet.</p>" &
        "<p style=\"color:var(--text-muted);font-size:11px;margin-top:0.5rem\">The SSU owner needs to authorize the courier extension first.</p>" &
        "</div></div></main>"
      )
    else:
      # State D: Authorized — normal UI.
      self.innerHTML = cstring(
        "<header>" &
        "<h1>Capsuleer Courier Service</h1>" &
        "<wallet-connect></wallet-connect>" &
        "</header>" &
        "<main>" &
        "<courier-quote></courier-quote>" &
        "<div class=\"panels\">" &
        "<create-delivery></create-delivery>" &
        "<delivery-list></delivery-list>" &
        "<player-stats></player-stats>" &
        "<courier-leaderboard></courier-leaderboard>" &
        "<admin-panel></admin-panel>" &
        "</div></main>"
      )
  # Debug console is fixed-position, append once to body (not inside app shell).
  {.emit: """
  if (!document.querySelector('debug-console')) {
    document.body.appendChild(document.createElement('debug-console'));
  }
  """.}

  # Landing page: wire up the URL builder.
  if isLandingPage:
    let genBtn = self.querySelector("#generate-btn")
    if not genBtn.isNil:
      genBtn.addEventListener("click", proc(e: Event) =
        {.emit: """
        var ssuVal = `self`.querySelector('#ssu-input').value.trim();
        if (!ssuVal) return;
        var base = window.location.origin + window.location.pathname;
        var url = base + '?tenant=' + `activeEnvironment` + '&ssu=' + ssuVal;
        var outputDiv = `self`.querySelector('#generated-url');
        var outputInput = `self`.querySelector('#url-output');
        outputDiv.style.display = 'block';
        outputInput.value = url;
        outputInput.select();
        """.}
      )
    let urlOutput = self.querySelector("#url-output")
    if not urlOutput.isNil:
      urlOutput.addEventListener("click", proc(e: Event) =
        {.emit: """
        `e`.target.select();
        navigator.clipboard.writeText(`e`.target.value).catch(function(){});
        """.}
      )

proc connectedCallback(self: AppShell) =
  ## Called when element is added to DOM.
  self.render()

setupNimponent[AppShell]("courier-app", nil, connectedCallback)
