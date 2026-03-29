## Main app shell component — layout with environment selector and child components.

{.push warning[UnusedImport]: off.}
import
  std/dom,
  nimponents,
  ../config,
  ./[wallet_connect, player_stats, create_delivery, courier_actions, admin_panel, delivery_list, leaderboard, courier_quote, debug_console]
{.pop.}

type AppShell* = ref object of WebComponent

proc renderConfigBar(self: AppShell) =
  ## Render the config bar — dev mode only.
  if isProduction:
    return

  let envLabel = self.querySelector("#env-label")
  if not envLabel.isNil:
    envLabel.innerHTML = activeEnvironment

  {.emit: """
  var btns = `self`.querySelectorAll('.env-btn');
  for (var i = 0; i < btns.length; i++) {
    if (btns[i].getAttribute('data-env') === `activeEnvironment`) {
      btns[i].classList.add('active');
    } else {
      btns[i].classList.remove('active');
    }
    btns[i].addEventListener('click', function() {
      var env = this.getAttribute('data-env');
      `switchEnvironment`(env);
      `self`.render();
      var children = `self`.querySelectorAll('player-stats, delivery-list, courier-leaderboard');
      for (var j = 0; j < children.length; j++) {
        if (children[j].connectedCallback) children[j].connectedCallback();
      }
    });
  }
  """.}

  var savedName: cstring
  {.emit: "`savedName` = localStorage.getItem('courier_display_name') || '';".}
  let nameInput = self.querySelector("#display-name").InputElement
  if not nameInput.isNil:
    nameInput.value = savedName

  let saveBtn = self.querySelector("#save-config")
  if not saveBtn.isNil:
    saveBtn.addEventListener("click", proc(e: Event) =
      let displayName = self.querySelector("#display-name").InputElement.value
      {.emit: """
      localStorage.setItem('courier_display_name', `displayName`);
      if (`displayName` && window._courierAddress) {
        if (!window._nameCache) window._nameCache = {};
        window._nameCache[window._courierAddress] = `displayName`;
      }
      """.}
    )

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
      "<courier-actions></courier-actions>" &
      "<courier-leaderboard></courier-leaderboard>" &
      "</div></main>"
    )
  elif isProduction:
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
      "<courier-actions></courier-actions>" &
      "<admin-panel></admin-panel>" &
      "</div></main>"
    )
  else:
    self.innerHTML = cstring(
      "<header>" &
      "<h1>Capsuleer Courier Service</h1>" &
      "<wallet-connect></wallet-connect>" &
      "</header>" &
      "<main>" &
      "<div class=\"config-bar\">" &
      "<div class=\"env-selector\">" &
      "<label>Environment</label>" &
      "<div class=\"env-buttons\">" &
      "<button class=\"btn btn-sm env-btn\" data-env=\"devnet\">Devnet</button>" &
      "<button class=\"btn btn-sm env-btn\" data-env=\"utopia\">Utopia</button>" &
      "<button class=\"btn btn-sm env-btn\" data-env=\"stillness\">Stillness</button>" &
      "</div>" &
      "<span class=\"env-active\" id=\"env-label\"></span>" &
      "</div>" &
      "<div class=\"form-group\"><label>Display Name</label>" &
      "<input type=\"text\" id=\"display-name\" placeholder=\"Your name\" /></div>" &
      "<button class=\"btn btn-sm\" id=\"save-config\">Save</button></div>" &
      "<courier-quote></courier-quote>" &
      "<div class=\"panels\">" &
      "<create-delivery></create-delivery>" &
      "<delivery-list></delivery-list>" &
      "<player-stats></player-stats>" &
      "<admin-panel></admin-panel>" &
      "<courier-actions></courier-actions>" &
      "<courier-leaderboard></courier-leaderboard>" &
      "</div></main>"
    )

  # Debug console is fixed-position, append once to body (not inside app shell).
  {.emit: """
  if (!document.querySelector('debug-console')) {
    document.body.appendChild(document.createElement('debug-console'));
  }
  """.}

  self.renderConfigBar()

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
