#!/usr/bin/env bash
# Configure world + create test resources (characters, network node, storage unit, items).
# Expects: world contracts deployed, .env.sui and .env.deploy exist.
set -e

WORKSPACE="/workspace"
WORLD_DIR="$WORKSPACE/world-contracts"
DEPLOY_DIR="$WORKSPACE/deployments/localnet"
ENV_FILE="$WORKSPACE/.env.deploy"

echo "[seed] Setting up world-contracts environment..."

# Read our env files.
source "$WORKSPACE/.env.sui" 2>/dev/null || true
source "$ENV_FILE" 2>/dev/null || true

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
pnpm exec tsx ts-scripts/gate/configure-distance.ts 2>/dev/null || true
sleep 2

echo "[seed] Creating test resources..."

# Step 1: Create characters — capture IDs from output.
echo "[seed] Step 1/8: Create character..."
CHAR_OUTPUT=$(pnpm create-character 2>&1)
echo "$CHAR_OUTPUT"
CHARACTER_A_ID=$(echo "$CHAR_OUTPUT" | grep -m1 "Pre-computed Character ID:" | awk '{print $NF}')
CHARACTER_B_ID=$(echo "$CHAR_OUTPUT" | grep -m2 "Pre-computed Character ID:" | tail -1 | awk '{print $NF}')
sleep "$DELAY_SECONDS"

# Step 2: Create network node.
echo "[seed] Step 2/8: Create network node..."
pnpm create-nwn
sleep "$DELAY_SECONDS"

# Step 3: Deposit fuel.
echo "[seed] Step 3/8: Deposit fuel..."
pnpm deposit-fuel
sleep "$DELAY_SECONDS"

# Step 4: Bring network node online.
echo "[seed] Step 4/8: Bring network node online..."
pnpm online-nwn
sleep "$DELAY_SECONDS"

# Step 5: Create storage unit — capture IDs.
echo "[seed] Step 5/8: Create storage unit..."
SSU_OUTPUT=$(pnpm create-storage-unit 2>&1)
echo "$SSU_OUTPUT"
STORAGE_UNIT_ID=$(echo "$SSU_OUTPUT" | grep "Storage Unit Object Id:" | awk '{print $NF}')
STORAGE_UNIT_OWNER_CAP_ID=$(echo "$SSU_OUTPUT" | grep "OwnerCap Object Id:" | awk '{print $NF}')
sleep "$DELAY_SECONDS"

# Step 6: Bring storage unit online.
echo "[seed] Step 6/8: Bring storage unit online..."
pnpm ssu-online
sleep "$DELAY_SECONDS"

# Step 7: Create on-chain items.
echo "[seed] Step 7/8: Create on-chain items..."
pnpm game-item-to-chain
sleep "$DELAY_SECONDS"

# Step 8: Deposit items.
echo "[seed] Step 8/8: Deposit items to ephemeral inventory..."
pnpm deposit-to-ephemeral-inventory

# Append seeded IDs to .env.deploy.
cat >> "$ENV_FILE" <<EOF

# Seeded game objects
CHARACTER_A_ID=$CHARACTER_A_ID
CHARACTER_B_ID=$CHARACTER_B_ID
STORAGE_UNIT_ID=$STORAGE_UNIT_ID
STORAGE_UNIT_OWNER_CAP_ID=$STORAGE_UNIT_OWNER_CAP_ID
EOF

echo ""
echo "[seed] World seeded successfully."
echo "  CHARACTER_A_ID=$CHARACTER_A_ID"
echo "  CHARACTER_B_ID=$CHARACTER_B_ID"
echo "  STORAGE_UNIT_ID=$STORAGE_UNIT_ID"
echo "  STORAGE_UNIT_OWNER_CAP_ID=$STORAGE_UNIT_OWNER_CAP_ID"
