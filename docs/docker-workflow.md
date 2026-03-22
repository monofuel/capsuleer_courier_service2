# Docker Workflow

## Overview

We use Docker for all Sui tooling — no Sui CLI or Move compiler on the host machine. Two services:

| Service | Image | Purpose |
|---------|-------|---------|
| `app` | monolab-nim (Gentoo) | Builds and serves the Nim static file server |
| `sui-dev` | Ubuntu 24.04 + Sui CLI | Move compilation, testing, local Sui node |

They're separate because Sui CLI requires Ubuntu 24.04 (glibc), while our Nim build uses a Gentoo-based image.

## sui-dev Container

### What's Inside
- **Sui CLI** (installed via suiup)
- **Node.js 24.x + pnpm** (for TypeScript interaction scripts)
- **Three pre-funded accounts**: ADMIN, PLAYER_A, PLAYER_B

### Starting the Container

```bash
# Interactive shell
docker compose run --rm --service-ports sui-dev

# Run a single command
docker compose run --rm sui-dev bash -c "sui move test"
```

### First Run
On first run, the entrypoint script:
1. Creates three ed25519 keypairs (ADMIN, PLAYER_A, PLAYER_B)
2. Starts a local Sui node with `--force-regenesis`
3. Funds all accounts from the faucet
4. Writes credentials to `.env.sui`

Keys persist in a Docker volume (`sui-config`) across restarts.

### Local Sui Node
- RPC: `http://127.0.0.1:9000` (exposed to host)
- Faucet available for funding accounts
- `--force-regenesis` means a fresh chain on every start

### Environment File (.env.sui)
Generated automatically, contains:
```
SUI_NETWORK=localnet
SUI_RPC_URL=http://127.0.0.1:9000
ADMIN_ADDRESS=0x...
PLAYER_A_ADDRESS=0x...
PLAYER_B_ADDRESS=0x...
ADMIN_PRIVATE_KEY=suiprivkey...
PLAYER_A_PRIVATE_KEY=suiprivkey...
PLAYER_B_PRIVATE_KEY=suiprivkey...
```

## Building and Testing Move Contracts

### Makefile Targets

```bash
# Compile contracts
make move-build

# Run Move unit tests
make move-test
```

Both run inside the sui-dev container. The project is mounted at `/workspace` and world-contracts at `/workspace/world-contracts`.

### Manual Build/Test

```bash
# Enter the container
docker compose run --rm sui-dev

# Inside container:
cd /workspace/move-contracts/capsuleer_courier_service
sui move build -e testnet
sui move test
```

## Volume Mounts

```yaml
sui-dev:
  volumes:
    - sui-config:/root/.sui           # Persistent keys
    - .:/workspace                     # Project root
    - ../world-contracts:/workspace/world-contracts  # World contracts dependency
```

The Move.toml uses `local = "../world-contracts/contracts/world"` which resolves inside the container because of how the volumes are mounted.

## Known Issues

### Stale `Pub.localnet.toml` after regenesis

`--force-regenesis` creates a new chain with a new chain ID on every `sui start`. But `sui client test-publish` generates a `Pub.localnet.toml` file that contains the chain ID. If this file persists from a previous run (e.g. in the mounted world-contracts volume), the next `test-publish` will fail:

```
Ephemeral publication file "Pub.localnet.toml" has chain-id `9ff087ec`; it cannot be used to publish to chain with id `084a55b7`
```

**Fix:** `deploy.sh` cleans stale `Pub.localnet.toml` files before deploying. If you're running `test-publish` manually, delete them first:
```bash
find /workspace/world-contracts -name "Pub.localnet.toml" -delete
find /workspace/move-contracts -name "Pub.localnet.toml" -delete
```

### Scripts path: `/opt/sui-dev/scripts/`

The Dockerfile copies scripts to `/opt/sui-dev/scripts/` (NOT `/workspace/scripts/`). This is because the project volume mount `.:/workspace` would overwrite any files COPY'd to `/workspace/`. The entrypoint is at `/opt/sui-dev/scripts/entrypoint.sh`.

## app Container

Simple — builds the Nim project and serves static files:
```bash
docker compose build app
docker compose up app
# Visit http://localhost:8080
```

For dev, the `web/` directory is mounted so changes are reflected without rebuilding.
