# Sui Move Basics

## Move Language Essentials

Move is a resource-oriented programming language for Sui smart contracts. Key concepts:

### Structs and Abilities

Every struct declares its **abilities** — what the runtime can do with it:

| Ability | Meaning |
|---------|---------|
| `key`   | Can be stored as a top-level Sui object (must have `id: UID` as first field) |
| `store` | Can be stored inside other objects or as dynamic fields |
| `copy`  | Can be duplicated |
| `drop`  | Can be discarded (destroyed implicitly) |

Common patterns:
- `has key` — a standalone Sui object (like a shared config)
- `has key, store` — an object that can also be stored inside others
- `has copy, drop, store` — a lightweight value (like a dynamic field key)
- `has store, drop` — a value stored as a dynamic field that can be cleaned up
- `has drop` — a witness type (exists only to prove authorization)

### Entry Functions

```move
// Can be called directly from a transaction
public entry fun do_thing(ctx: &mut TxContext) { ... }

// Can be called from other modules AND from transactions
public fun helper() { ... }

// Can only be called within this package
public(package) fun internal_helper() { ... }
```

### Module and Package Structure

```
my_package/
  Move.toml          # package config + dependencies
  sources/           # .move source files
    module_a.move
    module_b.move
  tests/             # test files
    test_a.move
```

A module is declared with:
```move
module package_name::module_name;
```

## Sui Object Model

### Owned vs Shared Objects

- **Owned objects**: belong to a single address. Only the owner can use them in transactions. Fast (no consensus needed).
- **Shared objects**: accessible by anyone. Use `transfer::share_object(obj)` to share. Requires consensus (slower).

Our `ExtensionConfig` is shared — anyone can call our courier functions against it.
Our `AdminCap` is owned — only the deployer has it.

### UID and Object Identity

Every object with `key` ability needs a `UID`:
```move
public struct MyObject has key {
    id: UID,   // must be first field
}

// Create:
let obj = MyObject { id: object::new(ctx) };
```

### Dynamic Fields

Attach key-value data to any object with a UID:
```move
use sui::dynamic_field as df;

// Add
df::add(&mut obj.id, MyKey { }, MyValue { ... });

// Read
let val: &MyValue = df::borrow(&obj.id, MyKey { });

// Mutate
let val: &mut MyValue = df::borrow_mut(&mut obj.id, MyKey { });

// Remove
let val: MyValue = df::remove(&mut obj.id, MyKey { });

// Check existence
let exists: bool = df::exists_(&obj.id, MyKey { });
```

Key type must have `copy + drop + store`. Value type must have `store`.

## Building and Testing

### Build
```bash
sui move build -e testnet
```
The `-e testnet` flag selects the environment from `Move.toml`'s `[environments]` section, which sets the chain ID for address resolution.

### Test
```bash
sui move test
```

### Test Structure
```move
#[test_only]
module my_package::my_tests;

#[test]
fun test_something() {
    // assertions with assert!()
    assert!(1 + 1 == 2);
}

#[test, expected_failure(abort_code = my_package::my_module::EMyError)]
fun test_failure_case() {
    // this should abort with the specified error
    my_module::function_that_fails();
}
```

## Move.toml Structure

```toml
[package]
name = "my_extension"
edition = "2024"

[dependencies]
# Local dependency (for dev):
world = { local = "../../../world-contracts/contracts/world" }

# Git dependency (for CI/production):
# world = { git = "https://github.com/evefrontier/world-contracts.git",
#            subdir = "contracts/world", rev = "v0.0.18" }

[environments]
testnet_internal = "4c78adac"   # chain ID
testnet_utopia = "4c78adac"
testnet_stillness = "4c78adac"
```

The `[environments]` section maps alias names to Sui chain IDs. When building with `-e testnet`, it resolves published package addresses for that chain.
