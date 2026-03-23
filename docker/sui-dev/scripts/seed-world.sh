#!/usr/bin/env bash
# Configure world + create test resources (characters, network node, storage unit, items).
# Expects: world contracts deployed, .env.sui and .env.deploy exist.
set -e

WORKSPACE="/workspace"
WORLD_DIR="$WORKSPACE/world-contracts"
DEPLOY_DIR="$WORKSPACE/deployments/localnet"

echo "[seed] Setting up world-contracts environment..."

# Read our env files.
source "$WORKSPACE/.env.sui" 2>/dev/null || true
source "$WORKSPACE/.env.deploy" 2>/dev/null || true

if [ -z "$WORLD_PACKAGE_ID" ]; then
  echo "[seed] ERROR: WORLD_PACKAGE_ID not set. Run deploy.sh first." >&2
  exit 1
fi

# Install world-contracts npm deps.
cd "$WORLD_DIR"
if [ ! -d "node_modules" ]; then
  echo "[seed] Installing world-contracts dependencies..."
  pnpm install --no-frozen-lockfile 2>&1 | tail -3
fi

# Copy world publish output so extract-object-ids can find it.
mkdir -p "$WORLD_DIR/deployments/localnet"
cp "$DEPLOY_DIR/world_package.json" "$WORLD_DIR/deployments/localnet/world_package.json"

# Set env vars that world-contracts scripts need.
export SUI_NETWORK=localnet
export SUI_RPC_URL=http://127.0.0.1:9000
export ADMIN_PRIVATE_KEY="$ADMIN_PRIVATE_KEY"
export ADMIN_ADDRESS="$ADMIN_ADDRESS"
export PLAYER_A_PRIVATE_KEY="$PLAYER_A_PRIVATE_KEY"
export PLAYER_A_ADDRESS="$PLAYER_A_ADDRESS"
export PLAYER_B_PRIVATE_KEY="$PLAYER_B_PRIVATE_KEY"
export PLAYER_B_ADDRESS="$PLAYER_B_ADDRESS"
export WORLD_PACKAGE_ID="$WORLD_PACKAGE_ID"
export SPONSOR_ADDRESSES="$ADMIN_ADDRESS"

# Fuel and energy config (from world-contracts defaults).
export FUEL_TYPE_IDS="78437"
export FUEL_EFFICIENCIES="100"
export ASSEMBLY_TYPE_IDS="88082,88086,555,87119,5555"
export ENERGY_REQUIRED_VALUES="1,1,1,1,1"

# Gate config.
export GATE_LINK_RANGE="1000000000000"

# Delay between seed steps (seconds).
export DELAY_SECONDS=2

echo "[seed] Extracting world object IDs..."
pnpm exec tsx ts-scripts/utils/extract-object-ids.ts

echo "[seed] Configuring world (access, fuel, energy, gates)..."
pnpm exec tsx ts-scripts/access/setup-access.ts
sleep 2
pnpm exec tsx ts-scripts/network-node/configure-fuel-energy.ts
sleep 2
# Gate distance config is optional but run it to be safe.
pnpm exec tsx ts-scripts/gate/configure-distance.ts 2>/dev/null || true
sleep 2

echo "[seed] Creating test resources..."
# Only run the steps we need: character, NWN, fuel, online NWN, SSU, SSU online, items.
echo "[seed] Step 1/8: Create character..."
pnpm create-character
sleep "$DELAY_SECONDS"

echo "[seed] Step 2/8: Create network node..."
pnpm create-nwn
sleep "$DELAY_SECONDS"

echo "[seed] Step 3/8: Deposit fuel..."
pnpm deposit-fuel
sleep "$DELAY_SECONDS"

echo "[seed] Step 4/8: Bring network node online..."
pnpm online-nwn
sleep "$DELAY_SECONDS"

echo "[seed] Step 5/8: Create storage unit..."
pnpm create-storage-unit
sleep "$DELAY_SECONDS"

echo "[seed] Step 6/8: Bring storage unit online..."
pnpm ssu-online
sleep "$DELAY_SECONDS"

echo "[seed] Step 7/8: Create on-chain items..."
pnpm game-item-to-chain
sleep "$DELAY_SECONDS"

echo "[seed] Step 8/8: Deposit items to ephemeral inventory..."
pnpm deposit-to-ephemeral-inventory

echo ""
echo "[seed] World seeded successfully."
echo "[seed] Characters, network node, storage unit, and items created."
