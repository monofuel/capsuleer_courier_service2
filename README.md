# capsuleer_courier_service2

- EVE Frontiers cycle 5 hackathon project

- rough spec is available at ./rough-spec.md

## TODO

### Phase 1: Project Scaffolding
- [ ] set up Nim project structure (scriptorium-style)
  - [ ] `.nimble` file with dependencies
  - [ ] `nim.cfg`
  - [ ] `src/` directory with main entry point
  - [ ] `tests/` directory (unit, integration, e2e naming convention)
  - [ ] `Makefile` with build, test, integration-test, e2e-test, docker-build targets
- [ ] set up Docker environment
  - [ ] `Dockerfile` based on `monolab-nim:latest`
  - [ ] `docker-compose.yml` for local dev (nim server + sui local node)
  - [ ] verify base image builds and runs

### Phase 2: Sui Move Smart Contracts
- [ ] set up Move project structure
  - [ ] `move-contracts/capsuleer_courier_service/` directory
  - [ ] `Move.toml` with world-contracts dependency (local path for dev, git for CI)
  - [ ] `sources/` and `tests/` directories
- [ ] implement courier service contracts (port v1 logic to Sui Move)
  - [ ] `config.move` — shared ExtensionConfig, AdminCap, typed witness (CourierAuth)
  - [ ] `delivery.move` — core delivery data structures
    - delivery request (smart_object_id, item_type, quantity, sender, receiver, status)
    - player metrics (likes, deliveries_completed, pending_count)
    - item likes mapping (item_type → likes reward)
  - [ ] `courier_service.move` — entry functions
    - `create_delivery_request(storage_unit, type_id, quantity)` — request an item delivery
    - `fulfill_delivery(delivery_id)` — courier marks delivery complete, transfers items
    - `pickup(delivery_id)` — receiver picks up delivered items
    - `set_likes(type_id, amount)` — admin: configure likes per item type
    - `get_likes(player)` — view player's earned likes
  - [ ] validations: quantity 1-500, max 5 pending per player, receiver-only pickup
- [ ] Move unit tests
  - [ ] test delivery creation and state
  - [ ] test fulfillment flow and likes award
  - [ ] test pickup and delivery cleanup
  - [ ] test validation failures (bad quantity, too many pending, wrong receiver)
- [ ] add `make move-build` and `make move-test` targets

### Phase 3: Local Sui Dev Environment
- [ ] add Sui node to docker-compose (reference builder-scaffold/docker/)
  - [ ] local Sui node with pre-funded test accounts
  - [ ] persist keys in docker volume
- [ ] create deployment scripts
  - [ ] deploy world contracts to local node
  - [ ] publish courier service extension
  - [ ] extract BUILDER_PACKAGE_ID and EXTENSION_CONFIG_ID from publish output
- [ ] create `.env.example` with all required config vars
- [ ] add `make deploy-local` target
- [ ] verify: deploy contracts → query state → confirm objects exist

### Phase 4: Contract Integration Scripts
- [ ] TypeScript (or Nim) scripts for contract interaction
  - [ ] `configure-likes` — set likes values for item types
  - [ ] `create-delivery` — create a test delivery request
  - [ ] `fulfill-delivery` — fulfill a delivery as courier
  - [ ] `pickup-delivery` — pickup as receiver
  - [ ] `query-deliveries` — list active deliveries for a storage unit
  - [ ] `query-player-metrics` — check likes and stats
- [ ] integration tests: full delivery lifecycle against local node
  - [ ] create request → fulfill → pickup → verify metrics
  - [ ] test error cases (duplicate pickup, wrong receiver, etc.)
- [ ] add `make integration-test` target

### Phase 5: HTMX + Nim JS Frontend (fully client-side dApp)
- [ ] set up frontend structure
  - [ ] `web/` directory with HTML shells, CSS, images
  - [ ] bundle HTMX locally (no CDN dependency)
  - [ ] nimponents compiled to JS via `nim js` for client-side logic
- [ ] Sui client-side integration (all in Nim JS / nimponents)
  - [ ] connect to EVE Vault wallet extension
  - [ ] query chain state via Sui JSON-RPC / GraphQL directly from browser
  - [ ] build and sign transactions client-side
  - [ ] sponsored transaction support (EVE Vault)
- [ ] pages and components
  - [ ] main layout / app shell
  - [ ] wallet connect / disconnect
  - [ ] storage unit view — list delivery requests for an SSU (queried from chain)
  - [ ] create delivery form — select item type, quantity, sign & submit tx
  - [ ] courier view — unfulfilled requests available to deliver
  - [ ] pickup view — items ready for receiver to collect
  - [ ] player stats — likes earned, deliveries completed
- [ ] add `make frontend-build` target (nim js compilation)

### Phase 6: Static File Serving (for local dev)
- [ ] simple Nim static file server (mummy) — serves `web/` directory only
  - [ ] no API endpoints, no server-side logic
  - [ ] just serves HTML/JS/CSS for local testing
- [ ] alternatively: use `python -m http.server` or similar during dev
- [ ] docker-compose for local dev
  - [ ] Sui local node
  - [ ] contract deployment (init container or script)
  - [ ] static file server
- [ ] `make up` / `make down` / `make serve` targets

### Phase 8: Testnet Deployment (requires manual steps)
- [ ] obtain Sui testnet credentials and faucet tokens
- [ ] deploy world contracts to testnet (or connect to existing EVE Frontier world)
- [ ] publish courier service contracts to testnet
- [ ] configure `.env` with testnet values
- [ ] deploy frontend (initially localhost, later Walrus blob storage)
- [ ] **MANUAL**: test in-game — link dApp URL to a Smart Storage Unit, interact via game client

### Phase 9: Polish & Stretch Goals
- [ ] Walrus blob storage for frontend hosting (replace HTTP server for static assets)
- [ ] scriptorium integration for iterating on the project
- [ ] courier quotes / flavor text (port from v1)
- [ ] improved item type display (names, images from gateway)
- [ ] fee system for deliveries (v1 had none, noted as future feature)

### Notes
- v1 used EVM/Solidity + MUD framework + React. v2 uses Sui Move + Nim/HTMX.
- v1 contract namespace was `borp2`, core logic: createDeliveryRequest, delivered, pickup, setLikes
- v1 had known issues: zustand sync slow in Chrome, broken in in-game browser → pure client-side dApp with no server dependency should avoid this
- builder-scaffold typed witness pattern: define `CourierAuth has drop {}`, register on storage unit extension
- storage units have ephemeral inventories (per-character temp storage) which map well to courier drop-off mechanics
- all phases up through Phase 6 can be tested locally without game credentials
- the dApp is fully client-side: browser talks directly to Sui chain, no backend API needed
- the only "server" is static file hosting (localhost for dev, Walrus for prod)
