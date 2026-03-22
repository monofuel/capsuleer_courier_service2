# Storage Unit API

## Overview

Smart Storage Units are programmable on-chain inventories. They're the core assembly type for our courier service — players request deliveries to a storage unit, couriers deposit items, receivers pick them up.

Source: `world-contracts/contracts/world/sources/assemblies/storage_unit.move`

## Two-Form Item Model

Items exist in two forms:

### ItemEntry (at-rest)
Stored inside an Inventory's VecMap. Lightweight, no UID.
```move
public struct ItemEntry has copy, drop, store {
    tenant: String,
    type_id: u64,
    item_id: u64,
    volume: u64,
    quantity: u32,
}
```

### Item (in-transit)
A full Sui object with its own UID. Created when withdrawn, consumed when deposited.
```move
public struct Item has key, store {
    id: UID,
    parent_id: ID,
    tenant: String,
    type_id: u64,
    item_id: u64,
    volume: u64,
    quantity: u32,
    location: Location,
}
```

The conversion: `withdraw` creates an Item from an ItemEntry, `deposit` consumes an Item back into an ItemEntry.

## Inventory Structure

```move
public struct Inventory has store {
    max_capacity: u64,
    used_capacity: u64,
    items: VecMap<u64, ItemEntry>,  // type_id → ItemEntry
}
```

Each inventory tracks capacity. Items are keyed by `type_id` within the VecMap.

## Three Access Modes

### 1. Owner Access (via OwnerCap)
Direct access for the storage unit owner:
```move
// Deposit
storage_unit.deposit_by_owner<T>(owner_cap, item, ctx)

// Withdraw
let item = storage_unit.withdraw_by_owner<T>(owner_cap, type_id, quantity, tenant, clock, ctx)
```

### 2. Extension Access (via typed witness)
For authorized extensions like our courier service:
```move
// Deposit into main inventory
storage_unit.deposit_item<Auth>(character, item, auth_witness, ctx)

// Withdraw from main inventory
let item = storage_unit.withdraw_item<Auth>(character, type_id, quantity, tenant, auth_witness, clock, ctx)
```

### 3. Open Inventory Access (via typed witness)
A separate inventory accessible to extensions:
```move
// Deposit to open inventory
storage_unit.deposit_to_open_inventory<Auth>(character, item, auth_witness, ctx)

// Withdraw from open inventory
let item = storage_unit.withdraw_from_open_inventory<Auth>(character, type_id, quantity, tenant, auth_witness, clock, ctx)
```

## Registering as an Extension

Before calling extension functions, the storage unit owner must register your witness type:
```move
storage_unit.register_extension<CourierAuth>(owner_cap)
```

This adds `CourierAuth`'s type name to the storage unit's extension set. The deposit/withdraw functions check this set before allowing operations.

## Key Considerations for Courier Service

- **Courier deposits**: When a courier fulfills a delivery, they deposit items into the storage unit. This requires our `CourierAuth` witness to be registered on the SSU.
- **Receiver pickups**: The receiver needs to withdraw items. This could go through our extension (using `CourierAuth`) or the owner could use `withdraw_by_owner`.
- **Capacity**: Each inventory has a max capacity. Deposits fail if there's not enough room.
- **Item identity**: Items are keyed by `type_id`. The `item_id` is a more specific identifier within a type.
