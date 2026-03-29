## Main app shell component — layout with environment selector and child components.

{.push warning[UnusedImport]: off.}
import
  std/dom,
  nimponents,
  ../config,
  ./[wallet_connect, player_stats, create_delivery, courier_actions, admin_panel, delivery_list, leaderboard]
{.pop.}

type AppShell* = ref object of WebComponent

proc renderConfigBar(self: AppShell) =
  ## Render the config bar — full controls in dev, minimal in production.
  if isProduction:
    # Production: show environment label and debug URL params.
    let configBar = self.querySelector(".config-bar")
    if not configBar.isNil:
      configBar.innerHTML = cstring(
        "<span class=\"env-active\">" & $activeEnvironment & "</span>"
      )
  else:
    # Dev mode: environment buttons + display name.
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
        // Re-trigger child components.
        var children = `self`.querySelectorAll('player-stats, delivery-list, courier-leaderboard');
        for (var j = 0; j < children.length; j++) {
          if (children[j].connectedCallback) children[j].connectedCallback();
        }
      });
    }
    """.}

    # Load saved display name.
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
  if isProduction:
    self.innerHTML = cstring(
      "<header>" &
      "<h1>Capsuleer Courier Service</h1>" &
      "<wallet-connect></wallet-connect>" &
      "</header>" &
      "<main>" &
      "<div class=\"config-bar\"></div>" &
      "<div class=\"panels\">" &
      "<delivery-list></delivery-list>" &
      "<player-stats></player-stats>" &
      "<create-delivery></create-delivery>" &
      "<courier-actions></courier-actions>" &
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
      "<div class=\"panels\">" &
      "<delivery-list></delivery-list>" &
      "<player-stats></player-stats>" &
      "<admin-panel></admin-panel>" &
      "<create-delivery></create-delivery>" &
      "<courier-actions></courier-actions>" &
      "<courier-leaderboard></courier-leaderboard>" &
      "</div></main>"
    )

  self.renderConfigBar()

proc connectedCallback(self: AppShell) =
  ## Called when element is added to DOM.
  self.render()

setupNimponent[AppShell]("courier-app", nil, connectedCallback)
