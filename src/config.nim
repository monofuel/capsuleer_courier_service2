## Multi-environment configuration.
## All configs are baked in at compile time via staticRead.
## Auto-detects environment from ?tenant= URL query parameter.

import std/[jsffi, dom]

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

proc applyConfig(json: cstring) =
  ## Parse a JSON config string and set the global variables.
  {.emit: """
  var cfg = JSON.parse(`json`);
  `packageId` = cfg.packageId || null;
  `configId` = cfg.configId || null;
  `adminCapId` = cfg.adminCapId || null;
  `rpcUrl` = cfg.rpcUrl || null;
  `worldPackageId` = cfg.worldPackageId || null;
  `activeEnvironment` = cfg.environment || 'devnet';
  """.}

proc switchEnvironment*(name: cstring) =
  ## Switch to a named environment config.
  {.emit: """
  var configs = {
    'devnet': `DevnetJson`,
    'utopia': `UtopiaJson`,
    'stillness': `StillnessJson`
  };
  var json = configs[`name`] || configs['devnet'];
  """.}
  var json: cstring
  {.emit: "`json` = json;".}
  applyConfig(json)
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
  """.}
  if tenant == "stillness":
    switchEnvironment("stillness")
  elif tenant == "utopia":
    switchEnvironment("utopia")
  else:
    switchEnvironment("devnet")

# Auto-detect on module load.
detectEnvironment()
