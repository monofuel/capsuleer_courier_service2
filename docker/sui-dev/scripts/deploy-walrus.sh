#!/usr/bin/env bash
# Deploy the frontend to Walrus Sites.
# Publishes a new site or updates an existing one.
# Requires sui client configured with a testnet wallet (run wallet-setup.sh first).
set -e

WORKSPACE="/workspace"
WEB_DIR="$WORKSPACE/web"
RESOURCES_FILE="$WORKSPACE/ws-resources.json"
EPOCHS=53

# Ensure testnet wallet is active.
if ! sui client envs 2>/dev/null | grep -q testnet; then
  echo "[walrus] ERROR: No testnet environment. Run 'make wallet-setup' first." >&2
  exit 1
fi
sui client switch --env testnet

ADDRESS=$(sui client active-address 2>/dev/null)
echo "[walrus] Using wallet: $ADDRESS"

# Generate sites-config.yaml at runtime pointing at the Sui wallet.
WALRUS_CONFIG_DIR="/root/.config/walrus"
mkdir -p "$WALRUS_CONFIG_DIR"
# Generate walrus client config (needed by the walrus CLI that site-builder calls).
cat > "$WALRUS_CONFIG_DIR/client_config.yaml" <<EOF
contexts:
  testnet:
    system_object: 0x6c2547cbbc38025cf3adac45f63cb0a8d12ecf777cdc75a4971612bf97fdf6af
    staking_object: 0xbe46180321c30aab2f8b3501e24048377287fa708018a5b7c2792b35fe339ee3
    exchange_objects:
      - 0xf4d164ea2def5fe07dc573992a029e010dba09b1a8dcbc44c5c2e79567f39073
      - 0x19825121c52080bb1073662231cfea5c0e4d905fd13e95f21e9a018f2ef41862
      - 0x83b454e524c71f30803f4d6c302a86fb6a39e96cdfb873c2d1e93bc1c26a3bc5
      - 0x8d63209cf8589ce7aef8f262437163c67577ed09f3e636a9d8e0813843fb8bf1
    n_shards: 1000
    max_epochs_ahead: 53
    rpc_urls:
      - https://fullnode.testnet.sui.io:443
    communication_config:
      tail_handling: detached
      upload_mode: aggressive
      data_in_flight_auto_tune:
        enabled: true
    wallet_config: /root/.sui/client.yaml
default_context: testnet
EOF

# Generate sites-config.yaml pointing at the Sui wallet.
cat > "$WALRUS_CONFIG_DIR/sites-config.yaml" <<EOF
contexts:
  testnet:
    package: 0xf99aee9f21493e1590e7e5a9aea6f343a1f381031a04a732724871fc294be799
    staking_object: 0xbe46180321c30aab2f8b3501e24048377287fa708018a5b7c2792b35fe339ee3
    general:
      wallet_env: testnet
      walrus_context: testnet
      walrus_package: 0xa998b8719ca1c0a6dc4e24a859bbb39f5477417f71885fbf2967a6510f699144
      wallet: /root/.sui/client.yaml
      rpc_url: https://fullnode.testnet.sui.io:443
default_context: testnet
EOF

# Ensure we have WAL tokens (swap SUI for WAL if needed).
echo "[walrus] Ensuring WAL token balance..."
walrus get-wal --amount 500000000 2>&1 || echo "[walrus] WAL swap failed (may already have tokens)"

# Check for index.html.
if [ ! -f "$WEB_DIR/index.html" ]; then
  echo "[walrus] ERROR: $WEB_DIR/index.html not found. Run 'make frontend-build' first." >&2
  exit 1
fi

# Publish or update.
if [ -f "$RESOURCES_FILE" ]; then
  SITE_OBJECT=$(jq -r '.site_object_id // empty' "$RESOURCES_FILE" 2>/dev/null || true)
  if [ -n "$SITE_OBJECT" ]; then
    echo "[walrus] Updating existing site: $SITE_OBJECT"
    site-builder update --epochs "$EPOCHS" "$WEB_DIR" "$SITE_OBJECT"
  else
    echo "[walrus] ws-resources.json exists but no site_object_id found. Publishing new site."
    site-builder publish --epochs "$EPOCHS" "$WEB_DIR"
  fi
else
  echo "[walrus] Publishing new site..."
  site-builder publish --epochs "$EPOCHS" "$WEB_DIR"
fi

echo ""
echo "================================================"
echo " Walrus deployment complete!"
echo " Check output above for your .walrus.site URL"
echo "================================================"
