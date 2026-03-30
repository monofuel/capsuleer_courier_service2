# Package Upgrading (TODO)

Currently we do a **fresh publish** on every deploy, which creates a new `ExtensionConfig` object and loses all existing deliveries. This doc outlines how to switch to Sui's package upgrade flow so that deliveries, metrics, and SSU extension authorizations persist across code changes.

## The Problem

`sui client publish` creates an entirely new package + new shared objects each time:
- `ExtensionConfig` (holds all deliveries as dynamic fields) is brand new and empty
- `AdminCap` is re-created (old one becomes useless)
- `CourierAuth` gets a new type identity (different package ID), so SSU extension authorization breaks
- Users must re-create all delivery requests
- Config JSON (`configId`, `adminCapId`) must be updated

## The Solution: `sui client upgrade`

Sui supports in-place package upgrades via the `UpgradeCap` object (already tracked in `Published.toml` as `upgrade-capability`). An upgrade:

- Publishes new code as a **new version** of the same package
- The `packageId` in config changes (points to latest version), but...
- All existing objects (`ExtensionConfig`, deliveries, `AdminCap`) **persist unchanged**
- `CourierAuth` type identity uses the **original** package ID, so SSU extension auth survives
- `configId` and `adminCapId` stay the same

## What Needs to Change

### 1. Stop clearing `Published.toml`

Currently before each deploy we clear `Published.toml` to force a fresh publish. For upgrades, we need to **keep it** so Sui knows the existing package to upgrade.

### 2. New deploy script: `upgrade-testnet.sh`

```bash
#!/usr/bin/env bash
# Upgrade courier service contracts on a testnet environment.
# Usage: upgrade-testnet.sh <stillness|utopia>
set -e

ENV_NAME="${1:?Usage: upgrade-testnet.sh <stillness|utopia>}"

WORKSPACE="/workspace"
COURIER_DIR="$WORKSPACE/move-contracts/capsuleer_courier_service"
DEPLOY_DIR="$WORKSPACE/deployments/$ENV_NAME"
CONFIG_FILE="$WORKSPACE/config/$ENV_NAME.json"

mkdir -p "$DEPLOY_DIR"

echo "[upgrade] Upgrading courier service on $ENV_NAME..."
cd "$COURIER_DIR"

# Read the upgrade cap from Published.toml (already tracked).
UPGRADE_CAP=$(grep 'upgrade-capability' Published.toml | head -1 | sed 's/.*= *"//;s/"//')

sui client upgrade \
  -e "testnet_$ENV_NAME" \
  --upgrade-capability "$UPGRADE_CAP" \
  --json 2>/dev/null > "$DEPLOY_DIR/courier_upgrade.json"

# Extract the new package version ID.
NEW_PACKAGE_ID=$(jq -r '.objectChanges[] | select(.type == "published") | .packageId' "$DEPLOY_DIR/courier_upgrade.json")

# Update only packageId in config — configId and adminCapId stay the same.
jq --arg pkg "$NEW_PACKAGE_ID" '.packageId = $pkg' \
  "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"

echo ""
echo "================================================"
echo " Upgraded on $ENV_NAME"
echo " NEW_PACKAGE_ID=$NEW_PACKAGE_ID"
echo " Config updated: config/$ENV_NAME.json (packageId only)"
echo "================================================"
```

### 3. Makefile target

```makefile
upgrade-stillness:
	docker compose run --rm --entrypoint bash sui-dev \
	  -c "bash /opt/sui-dev/scripts/upgrade-testnet.sh stillness"
```

### 4. Config JSON

After an upgrade, only `packageId` changes. `configId` and `adminCapId` are **unchanged**:

```json
{
  "packageId": "0x<new-version-id>",
  "configId": "0x7056ce...",   // same as before
  "adminCapId": "0xd02c36..."  // same as before
}
```

### 5. Frontend

The frontend already reads `packageId` from config, so it will automatically target the new code version. No changes needed.

## Upgrade Compatibility Rules

Sui enforces compatibility for upgrades. The default policy (`compatible`) requires:
- No removing public functions
- No changing public function signatures
- No removing struct fields
- New fields can be added to structs (with `has drop`)
- New public functions can be added

Our `owner_fulfill_delivery` addition is a good example of an upgrade-compatible change: it only adds a new function.

## When to Fresh Publish vs Upgrade

| Scenario | Action |
|----------|--------|
| Bug fix or new feature (additive) | `upgrade` |
| Breaking struct changes | Fresh `publish` (new environment) |
| Switching to a new EVE environment | Fresh `publish` |
| First deploy to an environment | Fresh `publish` |

## World Published.toml Workaround

The same workaround applies for upgrades: temporarily swap `[published.testnet]` in the world contract's `Published.toml` to the target environment's IDs before upgrading, then revert after. This is needed because all EVE testnet environments share chain-id `4c78adac`.

## Open Questions

- Does the Sui CLI `upgrade` command auto-detect the upgrade cap from `Published.toml`, or must it be passed explicitly? (Test this.)
- Should we add an `init_upgrade` entry point for one-time migration logic when upgrading? (Sui supports `migrate` functions in upgrades.)
