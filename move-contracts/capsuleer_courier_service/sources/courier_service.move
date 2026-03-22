/// Core business logic for the Capsuleer Courier Service.
///
/// Players request item deliveries to Smart Storage Units.
/// Couriers fulfill requests and earn "likes" (reputation).
/// Flow: Request → Fulfill → Pickup → Done.
module capsuleer_courier_service::courier_service;

use sui::dynamic_field as df;
use sui::event;
use capsuleer_courier_service::config::{ExtensionConfig, AdminCap};

// === Error codes ===

#[error]
const EInvalidQuantity: vector<u8> = b"Quantity must be between 1 and 500";

#[error]
const EItemNotConfigured: vector<u8> = b"Item type has no likes configured";

#[error]
const ETooManyPending: vector<u8> = b"Max 5 pending delivery requests per player";

#[error]
const EDeliveryNotFound: vector<u8> = b"Delivery does not exist";

#[error]
const EAlreadyDelivered: vector<u8> = b"Delivery has already been fulfilled";

#[error]
const ENotDelivered: vector<u8> = b"Delivery has not been fulfilled yet";

#[error]
const ENotReceiver: vector<u8> = b"Only the receiver can pickup this delivery";

// === Data structures (stored as dynamic fields on ExtensionConfig) ===

public struct DeliveryKey has copy, drop, store { id: u64 }
public struct Delivery has store, drop {
    storage_unit_id: ID,
    type_id: u64,
    quantity: u32,
    receiver: address,
    sender: address,
    delivered: bool,
}

public struct PlayerMetricsKey has copy, drop, store { player: address }
public struct PlayerMetrics has store, drop {
    likes: u64,
    deliveries_completed: u64,
    pending_supply_count: u64,
}

public struct ItemLikesKey has copy, drop, store { type_id: u64 }
public struct ItemLikes has store, drop {
    likes: u64,
}

public struct NextDeliveryIdKey has copy, drop, store {}

// === Events ===

public struct DeliveryCreated has copy, drop {
    delivery_id: u64,
    storage_unit_id: ID,
    type_id: u64,
    quantity: u32,
    receiver: address,
}

public struct DeliveryFulfilled has copy, drop {
    delivery_id: u64,
    courier: address,
    likes_earned: u64,
}

public struct DeliveryPickedUp has copy, drop {
    delivery_id: u64,
    receiver: address,
}

// === Public functions ===

/// Request a delivery. Caller becomes the receiver.
public fun create_delivery_request(
    config: &mut ExtensionConfig,
    storage_unit_id: ID,
    type_id: u64,
    quantity: u32,
    ctx: &mut TxContext,
) {
    // Validate quantity
    assert!(quantity >= 1 && quantity <= 500, EInvalidQuantity);

    // Validate item type has likes configured
    assert!(
        df::exists_(config.uid(), ItemLikesKey { type_id }),
        EItemNotConfigured,
    );

    // Check pending count
    let receiver = ctx.sender();
    ensure_player_metrics(config, receiver);
    let metrics: &mut PlayerMetrics = df::borrow_mut(
        config.uid_mut(),
        PlayerMetricsKey { player: receiver },
    );
    assert!(metrics.pending_supply_count < 5, ETooManyPending);
    metrics.pending_supply_count = metrics.pending_supply_count + 1;

    // Get next delivery ID
    let delivery_id = next_delivery_id(config);

    // Create delivery record
    df::add(
        config.uid_mut(),
        DeliveryKey { id: delivery_id },
        Delivery {
            storage_unit_id,
            type_id,
            quantity,
            receiver,
            sender: @0x0,
            delivered: false,
        },
    );

    event::emit(DeliveryCreated {
        delivery_id,
        storage_unit_id,
        type_id,
        quantity,
        receiver,
    });
}

/// Fulfill a delivery request. Caller becomes the sender (courier).
/// Awards likes to the courier based on item type and quantity.
public fun fulfill_delivery(
    config: &mut ExtensionConfig,
    delivery_id: u64,
    ctx: &mut TxContext,
) {
    let key = DeliveryKey { id: delivery_id };
    assert!(df::exists_(config.uid(), key), EDeliveryNotFound);

    let delivery: &mut Delivery = df::borrow_mut(config.uid_mut(), key);
    assert!(!delivery.delivered, EAlreadyDelivered);

    // Mark as delivered
    let courier = ctx.sender();
    delivery.delivered = true;
    delivery.sender = courier;

    // Calculate and award likes
    let type_id = delivery.type_id;
    let quantity = delivery.quantity;
    let item_likes: &ItemLikes = df::borrow(config.uid(), ItemLikesKey { type_id });
    let likes_earned = item_likes.likes * (quantity as u64);

    // Update courier metrics
    ensure_player_metrics(config, courier);
    let metrics: &mut PlayerMetrics = df::borrow_mut(
        config.uid_mut(),
        PlayerMetricsKey { player: courier },
    );
    metrics.likes = metrics.likes + likes_earned;
    metrics.deliveries_completed = metrics.deliveries_completed + 1;

    event::emit(DeliveryFulfilled {
        delivery_id,
        courier,
        likes_earned,
    });
}

/// Pickup a delivered item. Only the original receiver can call this.
public fun pickup(
    config: &mut ExtensionConfig,
    delivery_id: u64,
    ctx: &mut TxContext,
) {
    let key = DeliveryKey { id: delivery_id };
    assert!(df::exists_(config.uid(), key), EDeliveryNotFound);

    let delivery: &Delivery = df::borrow(config.uid(), key);
    assert!(delivery.delivered, ENotDelivered);
    assert!(delivery.receiver == ctx.sender(), ENotReceiver);

    // Decrement receiver's pending count
    let receiver = delivery.receiver;
    let metrics: &mut PlayerMetrics = df::borrow_mut(
        config.uid_mut(),
        PlayerMetricsKey { player: receiver },
    );
    metrics.pending_supply_count = metrics.pending_supply_count - 1;

    // Remove delivery record
    let _delivery: Delivery = df::remove(config.uid_mut(), key);

    event::emit(DeliveryPickedUp {
        delivery_id,
        receiver,
    });
}

/// Admin: configure likes reward for an item type.
public fun set_likes(
    config: &mut ExtensionConfig,
    admin_cap: &AdminCap,
    type_id: u64,
    likes: u64,
) {
    config.set_rule(admin_cap, ItemLikesKey { type_id }, ItemLikes { likes });
}

// === View functions ===

/// Get a player's metrics. Returns (likes, deliveries_completed, pending_supply_count).
public fun get_player_metrics(config: &ExtensionConfig, player: address): (u64, u64, u64) {
    let key = PlayerMetricsKey { player };
    if (!df::exists_(config.uid(), key)) {
        return (0, 0, 0)
    };
    let metrics: &PlayerMetrics = df::borrow(config.uid(), key);
    (metrics.likes, metrics.deliveries_completed, metrics.pending_supply_count)
}

/// Get the likes reward configured for an item type.
public fun get_item_likes(config: &ExtensionConfig, type_id: u64): u64 {
    let key = ItemLikesKey { type_id };
    if (!df::exists_(config.uid(), key)) {
        return 0
    };
    let item_likes: &ItemLikes = df::borrow(config.uid(), key);
    item_likes.likes
}

/// Get a delivery by ID.
public fun get_delivery(
    config: &ExtensionConfig,
    delivery_id: u64,
): (ID, u64, u32, address, address, bool) {
    let key = DeliveryKey { id: delivery_id };
    let delivery: &Delivery = df::borrow(config.uid(), key);
    (
        delivery.storage_unit_id,
        delivery.type_id,
        delivery.quantity,
        delivery.receiver,
        delivery.sender,
        delivery.delivered,
    )
}

// === Internal helpers ===

/// Ensure a PlayerMetrics record exists for the given player.
fun ensure_player_metrics(config: &mut ExtensionConfig, player: address) {
    let key = PlayerMetricsKey { player };
    if (!df::exists_(config.uid(), key)) {
        df::add(
            config.uid_mut(),
            key,
            PlayerMetrics {
                likes: 0,
                deliveries_completed: 0,
                pending_supply_count: 0,
            },
        );
    };
}

/// Get the next delivery ID and increment the counter.
fun next_delivery_id(config: &mut ExtensionConfig): u64 {
    let key = NextDeliveryIdKey {};
    if (!df::exists_(config.uid(), key)) {
        df::add(config.uid_mut(), key, 0u64);
    };
    let counter: &mut u64 = df::borrow_mut(config.uid_mut(), key);
    let id = *counter;
    *counter = *counter + 1;
    id
}
