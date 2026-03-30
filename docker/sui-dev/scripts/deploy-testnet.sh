#!/usr/bin/env bash
# Deploy courier service contracts to a testnet environment (stillness or utopia).
# Usage: deploy-testnet.sh <environment>
# Requires sui client configured with a testnet wallet.
set -e

ENV_NAME="${1:?Usage: deploy-testnet.sh <stillness|utopia>}"

WORKSPACE="/workspace"
COURIER_DIR="$WORKSPACE/move-contracts/capsuleer_courier_service"
DEPLOY_DIR="$WORKSPACE/deployments/$ENV_NAME"
CONFIG_FILE="$WORKSPACE/config/$ENV_NAME.json"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "[deploy] ERROR: config file not found: $CONFIG_FILE" >&2
  exit 1
fi

mkdir -p "$DEPLOY_DIR"

echo "[deploy] Publishing courier service to $ENV_NAME..."
cd "$COURIER_DIR"
sui client publish -e "testnet_$ENV_NAME" --json 2>/dev/null > "$DEPLOY_DIR/courier_package.json"

BUILDER_PACKAGE_ID=$(jq -r '.objectChanges[] | select(.type == "published") | .packageId' "$DEPLOY_DIR/courier_package.json")
EXTENSION_CONFIG_ID=$(jq -r '.objectChanges[] | select(.objectType? // "" | endswith("::config::ExtensionConfig")) | .objectId' "$DEPLOY_DIR/courier_package.json")
ADMIN_CAP_ID=$(jq -r '.objectChanges[] | select(.objectType? // "" | endswith("::config::AdminCap")) | .objectId' "$DEPLOY_DIR/courier_package.json")

for var in BUILDER_PACKAGE_ID EXTENSION_CONFIG_ID ADMIN_CAP_ID; do
  val="${!var}"
  if [ -z "$val" ] || [ "$val" = "null" ]; then
    echo "[deploy] ERROR: failed to extract $var" >&2
    echo "[deploy] Raw output:" >&2
    head -20 "$DEPLOY_DIR/courier_package.json" >&2
    exit 1
  fi
done

# Update the config JSON with the new contract IDs.
jq --arg pkg "$BUILDER_PACKAGE_ID" \
   --arg cfg "$EXTENSION_CONFIG_ID" \
   --arg cap "$ADMIN_CAP_ID" \
   '.packageId = $pkg | .configId = $cfg | .adminCapId = $cap' \
   "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"

echo ""
echo "================================================"
echo " Deployed to $ENV_NAME"
echo " BUILDER_PACKAGE_ID=$BUILDER_PACKAGE_ID"
echo " EXTENSION_CONFIG_ID=$EXTENSION_CONFIG_ID"
echo " ADMIN_CAP_ID=$ADMIN_CAP_ID"
echo " Config updated: config/$ENV_NAME.json"
echo "================================================"
