# Courier Service Design

## v1 Summary (Solidity/MUD)

The original capsuleer_courier_service was built on EVM with the MUD framework (Solidity). Core concept: "Death Stranding in space" — players request item deliveries to Smart Storage Units, and couriers fulfill them for reputation ("likes").

### v1 Data Model
- **Deliveries** table: deliveryId → (smartObjectId, itemId, itemQuantity, sender, receiver, delivered)
- **PlayerMetrics** table: playerAddress → (likes, deliveriesCompleted, pendingSupplyCount)
- **ItemLikes** table: itemId → likes (reward value per item type)

### v1 Core Flow
1. **Request**: Player calls `createDeliveryRequest(smartObjectId, typeId, itemQuantity)` — they become the receiver
2. **Fulfill**: Courier calls `delivered(deliveryId)` — transfers items from ephemeral to SSU inventory, earns likes
3. **Pickup**: Receiver calls `pickup(deliveryId)` — transfers items from SSU to ephemeral, deletes record

### v1 Validations
- Quantity: 1-500 per delivery
- Max 5 pending requests per player
- Items must have likes configured
- Only the original receiver can pickup
- Items validated against on-chain entity records

### v1 Known Issues
- Zustand state sync slow in Chrome, broken in in-game browser
- SELECT lists broken in game browser
- No fee/payment system (couriers work for social reputation only)

## v2 Design (Sui Move)

### Architecture Change
- v1: EVM/Solidity + MUD framework + React frontend
- v2: Sui Move + nimponents frontend (compiled to JS via `nim js`)
- v2 is a fully client-side dApp — browser talks directly to Sui chain, no backend server

### Data Model (Dynamic Fields on ExtensionConfig)

All state lives as dynamic fields on a single shared `ExtensionConfig` object:

```
ExtensionConfig
  ├── NextDeliveryIdKey → u64 (counter)
  ├── DeliveryKey { id: 0 } → Delivery { storage_unit_id, type_id, quantity, receiver, sender, delivered }
  ├── DeliveryKey { id: 1 } → Delivery { ... }
  ├── ...
  ├── PlayerMetricsKey { player: 0xABC } → PlayerMetrics { likes, deliveries_completed, pending_supply_count }
  ├── PlayerMetricsKey { player: 0xDEF } → PlayerMetrics { ... }
  ├── ItemLikesKey { type_id: 77800 } → ItemLikes { likes: 10 }
  └── ItemLikesKey { type_id: 77811 } → ItemLikes { likes: 5 }
```

### Entry Functions

| Function | Caller | What it does |
|----------|--------|-------------|
| `create_delivery_request` | Receiver | Creates a delivery request, increments pending count |
| `fulfill_delivery` | Courier | Marks delivered, awards likes, increments completed |
| `pickup` | Receiver | Removes delivery, decrements pending count |
| `set_likes` | Admin | Configures likes reward per item type |

### What Changed from v1

| Aspect | v1 | v2 |
|--------|----|----|
| Language | Solidity | Sui Move |
| Framework | MUD (tables, systems) | Dynamic fields on shared objects |
| Delivery IDs | Random hash | Incrementing counter |
| Item transfers | `ephemeralToInventoryTransfer` (MUD system call) | Storage unit extension API (typed witness) |
| Frontend | React + Zustand | Nimponents (Nim → JS) |
| State sync | MUD indexer (slow, buggy) | Direct Sui JSON-RPC queries |
| Auth | MUD access control | AdminCap + typed witness |
| Hosting | HTTP server | Static files (Walrus eventually) |

### Phased Approach to Item Transfers

Phase 2 (current): Track delivery state only (no actual item movement on-chain). This lets us build and test the core logic without needing a running game world.

Phase 3+: Integrate with storage unit extension API for real item transfers. This requires:
- Our `CourierAuth` registered on the target SSU
- Access to the storage unit as a shared object in the transaction
- The courier's character object for authorization

### Likes System

Same as v1 — purely social reputation, no economic value:
- Admin sets likes per item type via `set_likes`
- When a courier fulfills delivery: `likes_earned = item_likes * quantity`
- Player can query their total likes, deliveries completed, pending count
