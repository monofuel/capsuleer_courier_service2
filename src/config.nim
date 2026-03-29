## Multi-environment configuration.
## All configs are baked in at compile time via staticRead.
## Auto-detects environment from ?tenant= URL query parameter.

const
  DevnetJson = staticRead("../config/devnet.json")
  UtopiaJson = staticRead("../config/utopia.json")
  StillnessJson = staticRead("../config/stillness.json")

var
  packageId*: cstring = nil
  configId*: cstring = nil
  adminCapId*: cstring = nil
  rpcUrl*: cstring = nil
  worldPackageId*: cstring = nil
  activeEnvironment*: cstring = "devnet"
  isProduction*: bool = false
  ssuId*: cstring = nil
  datahubHost*: cstring = nil
  isLandingPage*: bool = false  ## True when production mode with no SSU param — public viewer.

proc applyConfig(cfg: cstring) =
  ## Apply a config object to global variables.
  ## The cfg parameter is actually a JS object (staticRead JSON emits as object literal).
  {.emit: """
  `packageId` = `cfg`.packageId || null;
  `configId` = `cfg`.configId || null;
  `adminCapId` = `cfg`.adminCapId || null;
  `rpcUrl` = `cfg`.rpcUrl || null;
  `worldPackageId` = `cfg`.worldPackageId || null;
  `activeEnvironment` = `cfg`.environment || 'devnet';
  var env = `activeEnvironment`;
  if (env === 'stillness') `datahubHost` = 'https://world-api-stillness.live.tech.evefrontier.com';
  else if (env === 'utopia') `datahubHost` = 'https://world-api-utopia.uat.pub.evefrontier.com';
  else `datahubHost` = null;
  """.}

proc switchEnvironment*(name: cstring) =
  ## Switch to a named environment config.
  {.emit: """
  var configs = {
    'devnet': `DevnetJson`,
    'utopia': `UtopiaJson`,
    'stillness': `StillnessJson`
  };
  var cfg = configs[`name`] || configs['devnet'];
  """.}
  var cfg: cstring
  {.emit: "`cfg` = cfg;".}
  applyConfig(cfg)
  # Update localStorage so wallet_connect and query functions pick up the RPC URL.
  {.emit: """
  if (`rpcUrl`) localStorage.setItem('sui_rpc_url', `rpcUrl`);
  """.}

proc detectEnvironment*() =
  ## Auto-detect environment from ?tenant= query parameter.
  var tenant: cstring
  {.emit: """
  var params = new URLSearchParams(window.location.search);
  `tenant` = params.get('tenant') || '';
  `ssuId` = params.get('ssu') || null;
  """.}
  if tenant == "stillness":
    isProduction = true
    switchEnvironment("stillness")
  elif tenant == "utopia":
    isProduction = true
    switchEnvironment("utopia")
  else:
    switchEnvironment("devnet")

  # Landing page mode: production with no SSU param — public viewer.
  var hasSsu: bool
  {.emit: """
  `hasSsu` = (`ssuId` !== null && `ssuId` !== '');
  console.log('[config] URL: ' + window.location.href);
  console.log('[config] All params: ' + params.toString());
  console.log('[config] tenant=' + `tenant` + ' ssuId=' + `ssuId` + ' hasSsu=' + `hasSsu` + ' isProduction=' + `isProduction`);
  """.}
  isLandingPage = isProduction and not hasSsu

# Auto-detect on module load.
detectEnvironment()
