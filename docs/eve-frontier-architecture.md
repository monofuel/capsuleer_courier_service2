# EVE Frontier Architecture

## Three-Layer Design

EVE Frontier's on-chain architecture has three layers:

### Layer 1: Composable Primitives
Reusable building blocks that are NOT directly exposed to builders:
- `location` — hashed location storage with proximity verification
- `inventory` — item storage with capacity tracking
- `fuel` — energy/resource consumption
- `status` — assembly lifecycle (Anchor/Online/Offline/Unanchor)
- `energy` — energy production and reservation
- `metadata` — name/description/URL
- `character` — player identity with capability-based access

### Layer 2: Smart Assemblies
Game-defined objects that builders can extend:
- **StorageUnit** — programmable on-chain inventory (the one we care about most)
- **Gate** — warp structures with linkable jump points
- **NetworkNode** — power source that fuels assemblies
- **Turret** — combat structures

### Layer 3: Player Extensions
Custom logic attached to assemblies via the **typed witness pattern**. This is where our courier service lives.

## Typed Witness Pattern

The core authorization mechanism for extensions. Three parts:

### 1. Define a witness type
```move
public struct CourierAuth has drop {}
```
Only our package can construct this type. That's the security guarantee.

### 2. Register on an assembly
The assembly owner registers your extension's witness type, granting it permission to call privileged functions.

### 3. Call assembly functions with the witness
```move
storage_unit.deposit_item<CourierAuth>(
    character,
    item,
    config::courier_auth(),  // only our package can mint this
    ctx,
);
```

The assembly checks: "is `CourierAuth` registered as an authorized extension?" If yes, the call proceeds.

## ExtensionConfig + AdminCap Pattern

Every extension follows this pattern:

```move
// Shared — anyone can read, but mutations need the right function
public struct ExtensionConfig has key {
    id: UID,
}

// Owned by deployer — proves admin authority
public struct AdminCap has key, store {
    id: UID,
}

// Created at publish time
fun init(ctx: &mut TxContext) {
    transfer::transfer(AdminCap { id: object::new(ctx) }, ctx.sender());
    transfer::share_object(ExtensionConfig { id: object::new(ctx) });
}
```

Configuration is stored as **dynamic fields** on ExtensionConfig:
```move
// Define a key type and value type for each config
public struct MyConfigKey has copy, drop, store {}
public struct MyConfig has store, drop { value: u64 }

// Set config (requires AdminCap)
public fun set_rule<K, V>(config: &mut ExtensionConfig, _: &AdminCap, key: K, value: V)

// Read config (anyone)
public fun borrow_rule<K, V>(config: &ExtensionConfig, key: K): &V
```

## OwnerCap Capability Model

Assemblies use a three-tier access control:

| Capability | Who Has It | What It Does |
|-----------|-----------|-------------|
| `GovernorCap` | Top-level governance | System administration |
| `AdminACL` | Server/admin addresses | Shared object with authorized sponsors |
| `OwnerCap<T>` | Assembly owner | Object-level keycard for mutable access |

`OwnerCap` is the one builders interact with most. It's a generic type parameterized on the assembly type (e.g., `OwnerCap<StorageUnit>`). The owner can transfer it without moving the underlying assembly.

## Privacy and Location

- Locations are stored as **Poseidon2 hashes** (not cleartext coordinates)
- Proximity verification uses **signed server messages** (temporary solution)
- Future: zero-knowledge proofs for trustless proximity validation
