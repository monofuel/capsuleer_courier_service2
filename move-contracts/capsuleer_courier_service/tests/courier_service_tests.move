#[test_only]
module capsuleer_courier_service::courier_service_tests;

use std::string::utf8;
use sui::{clock, test_scenario as ts};
use world::{
    access::{OwnerCap, AdminACL},
    character::{Self, Character},
    energy::EnergyConfig,
    inventory::Item,
    network_node::{Self, NetworkNode},
    object_registry::ObjectRegistry,
    storage_unit::{Self, StorageUnit},
    test_helpers::{Self, admin, user_a, user_b, tenant},
};
use capsuleer_courier_service::config::{Self, CourierAuth};
use capsuleer_courier_service::courier_service;

// === Test addresses ===
// admin() = @0xB (used for world setup operations)
// user_a() = receiver address
// user_b() = @0xD (courier address)

const RECEIVER_CHAR_ID: u32 = 1234;
const COURIER_CHAR_ID: u32 = 5678;

// Storage unit constants
const LOCATION_HASH: vector<u8> =
    x"7a8f3b2e9c4d1a6f5e8b2d9c3f7a1e5b7a8f3b2e9c4d1a6f5e8b2d9c3f7a1e5b";
const MAX_CAPACITY: u64 = 100000;
const STORAGE_TYPE_ID: u64 = 5555;
const STORAGE_ITEM_ID: u64 = 90002;

// Network node constants
const MS_PER_SECOND: u64 = 1000;
const NWN_TYPE_ID: u64 = 111000;
const NWN_ITEM_ID: u64 = 5000;
const FUEL_MAX_CAPACITY: u64 = 1000;
const FUEL_BURN_RATE_IN_MS: u64 = 3600 * MS_PER_SECOND;
const MAX_PRODUCTION: u64 = 100;
const FUEL_TYPE_ID: u64 = 1;
const FUEL_VOLUME: u64 = 10;

// Item constants for deliveries
const ITEM_TYPE_ID: u64 = 77800;
const ITEM_ITEM_ID: u64 = 1000004145107;
const ITEM_VOLUME: u64 = 100;
const ITEM_QUANTITY: u32 = 50;

// === Helper Functions ===

fun setup_world(ts: &mut ts::Scenario) {
    test_helpers::setup_world(ts);
    test_helpers::configure_assembly_energy(ts);
    test_helpers::register_server_address(ts);
}

fun create_character(ts: &mut ts::Scenario, user: address, item_id: u32): ID {
    ts::next_tx(ts, admin());
    let admin_acl = ts::take_shared<AdminACL>(ts);
    let mut registry = ts::take_shared<ObjectRegistry>(ts);
    let character = character::create_character(
        &mut registry,
        &admin_acl,
        item_id,
        tenant(),
        100,
        user,
        utf8(b"name"),
        ts.ctx(),
    );
    let character_id = object::id(&character);
    character.share_character(&admin_acl, ts.ctx());
    ts::return_shared(registry);
    ts::return_shared(admin_acl);
    character_id
}

fun create_network_node(ts: &mut ts::Scenario, character_id: ID): ID {
    ts::next_tx(ts, admin());
    let mut registry = ts::take_shared<ObjectRegistry>(ts);
    let character = ts::take_shared_by_id<Character>(ts, character_id);
    let admin_acl = ts::take_shared<AdminACL>(ts);

    let nwn = network_node::anchor(
        &mut registry,
        &character,
        &admin_acl,
        NWN_ITEM_ID,
        NWN_TYPE_ID,
        LOCATION_HASH,
        FUEL_MAX_CAPACITY,
        FUEL_BURN_RATE_IN_MS,
        MAX_PRODUCTION,
        ts.ctx(),
    );
    let id = object::id(&nwn);
    nwn.share_network_node(&admin_acl, ts.ctx());

    ts::return_shared(character);
    ts::return_shared(admin_acl);
    ts::return_shared(registry);
    id
}

fun create_storage_unit(ts: &mut ts::Scenario, character_id: ID): (ID, ID) {
    let nwn_id = create_network_node(ts, character_id);
    ts::next_tx(ts, admin());
    let mut registry = ts::take_shared<ObjectRegistry>(ts);
    let mut nwn = ts::take_shared_by_id<NetworkNode>(ts, nwn_id);
    let character = ts::take_shared_by_id<Character>(ts, character_id);
    let admin_acl = ts::take_shared<AdminACL>(ts);
    let storage_unit = storage_unit::anchor(
        &mut registry,
        &mut nwn,
        &character,
        &admin_acl,
        STORAGE_ITEM_ID,
        STORAGE_TYPE_ID,
        MAX_CAPACITY,
        LOCATION_HASH,
        ts.ctx(),
    );
    let storage_unit_id = object::id(&storage_unit);
    storage_unit.share_storage_unit(&admin_acl, ts.ctx());
    ts::return_shared(admin_acl);
    ts::return_shared(character);
    ts::return_shared(registry);
    ts::return_shared(nwn);
    (storage_unit_id, nwn_id)
}

fun online_storage_unit(
    ts: &mut ts::Scenario,
    user: address,
    character_id: ID,
    storage_id: ID,
    nwn_id: ID,
) {
    // Deposit fuel and bring network node online
    let clock = clock::create_for_testing(ts.ctx());
    ts::next_tx(ts, user);
    let mut character = ts::take_shared_by_id<Character>(ts, character_id);
    let (owner_cap, receipt) = character.borrow_owner_cap<NetworkNode>(
        ts::most_recent_receiving_ticket<OwnerCap<NetworkNode>>(&character_id),
        ts.ctx(),
    );
    ts::next_tx(ts, user);
    {
        let mut nwn = ts::take_shared_by_id<NetworkNode>(ts, nwn_id);
        nwn.deposit_fuel_test(
            &owner_cap,
            FUEL_TYPE_ID,
            FUEL_VOLUME,
            10,
            &clock,
        );
        ts::return_shared(nwn);
    };

    ts::next_tx(ts, user);
    {
        let mut nwn = ts::take_shared_by_id<NetworkNode>(ts, nwn_id);
        nwn.online(&owner_cap, &clock);
        ts::return_shared(nwn);
    };
    character.return_owner_cap(owner_cap, receipt);

    // Bring storage unit online
    ts::next_tx(ts, user);
    {
        let mut storage_unit = ts::take_shared_by_id<StorageUnit>(ts, storage_id);
        let mut nwn = ts::take_shared_by_id<NetworkNode>(ts, nwn_id);
        let energy_config = ts::take_shared<EnergyConfig>(ts);
        let (owner_cap, receipt) = character.borrow_owner_cap<StorageUnit>(
            ts::most_recent_receiving_ticket<OwnerCap<StorageUnit>>(&character_id),
            ts.ctx(),
        );
        storage_unit.online(&mut nwn, &energy_config, &owner_cap);
        // Authorize our courier extension
        storage_unit.authorize_extension<CourierAuth>(&owner_cap);
        character.return_owner_cap(owner_cap, receipt);
        ts::return_shared(storage_unit);
        ts::return_shared(nwn);
        ts::return_shared(energy_config);
    };

    ts::return_shared(character);
    clock.destroy_for_testing();
}

/// Mint items into a character's owned inventory on the SSU.
/// Uses the character's own OwnerCap<Character> for inventory access.
fun mint_items(
    ts: &mut ts::Scenario,
    storage_id: ID,
    character_id: ID,
    user: address,
    item_id: u64,
    type_id: u64,
    volume: u64,
    quantity: u32,
) {
    ts::next_tx(ts, user);
    let mut character = ts::take_shared_by_id<Character>(ts, character_id);
    let (owner_cap, receipt) = character.borrow_owner_cap<Character>(
        ts::most_recent_receiving_ticket<OwnerCap<Character>>(&character_id),
        ts.ctx(),
    );
    let mut storage_unit = ts::take_shared_by_id<StorageUnit>(ts, storage_id);
    storage_unit.game_item_to_chain_inventory_test<Character>(
        &character,
        &owner_cap,
        item_id,
        type_id,
        volume,
        quantity,
        ts.ctx(),
    );
    character.return_owner_cap(owner_cap, receipt);
    ts::return_shared(character);
    ts::return_shared(storage_unit);
}

/// Withdraw items from a character's owned inventory, returning the Item object.
/// Uses the character's own OwnerCap<Character> for inventory access.
fun char_withdraw(
    ts: &mut ts::Scenario,
    storage_id: ID,
    character_id: ID,
    user: address,
    type_id: u64,
    quantity: u32,
): Item {
    ts::next_tx(ts, user);
    let mut character = ts::take_shared_by_id<Character>(ts, character_id);
    let (owner_cap, receipt) = character.borrow_owner_cap<Character>(
        ts::most_recent_receiving_ticket<OwnerCap<Character>>(&character_id),
        ts.ctx(),
    );
    let mut storage_unit = ts::take_shared_by_id<StorageUnit>(ts, storage_id);
    let item = storage_unit.withdraw_by_owner(
        &character,
        &owner_cap,
        type_id,
        quantity,
        ts.ctx(),
    );
    character.return_owner_cap(owner_cap, receipt);
    ts::return_shared(character);
    ts::return_shared(storage_unit);
    item
}

/// Full test infrastructure: world + characters + SSU online + extension authorized.
/// Returns (config, admin_cap, receiver_char_id, courier_char_id, storage_unit_id).
fun setup_full(ts: &mut ts::Scenario): (ID, ID, ID) {
    setup_world(ts);

    // Create characters — receiver is user_a, courier is user_b
    let receiver_id = create_character(ts, user_a(), RECEIVER_CHAR_ID);
    let courier_id = create_character(ts, user_b(), COURIER_CHAR_ID);

    // Create and online storage unit (owned by receiver/user_a)
    let (storage_id, nwn_id) = create_storage_unit(ts, receiver_id);
    online_storage_unit(ts, user_a(), receiver_id, storage_id, nwn_id);

    (receiver_id, courier_id, storage_id)
}

// ============================================================
// === Tests: Bookkeeping (create_delivery_request, set_likes) ===
// ============================================================

#[test]
fun test_set_likes() {
    let mut ts = ts::begin(admin());
    let (mut config, admin_cap) = config::create_for_testing(ts.ctx());

    courier_service::set_likes(&mut config, &admin_cap, 77800, 10);
    assert!(courier_service::get_item_likes(&config, 77800) == 10);

    // Update existing
    courier_service::set_likes(&mut config, &admin_cap, 77800, 20);
    assert!(courier_service::get_item_likes(&config, 77800) == 20);

    // Unconfigured item returns 0
    assert!(courier_service::get_item_likes(&config, 99999) == 0);

    config::destroy_for_testing(config, admin_cap);
    ts.end();
}

#[test]
fun test_create_delivery_request() {
    let mut ts = ts::begin(admin());
    let (mut config, admin_cap) = config::create_for_testing(ts.ctx());
    courier_service::set_likes(&mut config, &admin_cap, ITEM_TYPE_ID, 10);

    ts.next_tx(user_a());
    let ssu_id = object::id_from_address(@0x1234);
    courier_service::create_delivery_request(&mut config, ssu_id, ITEM_TYPE_ID, 50, ts.ctx());

    let (storage_unit_id, type_id, quantity, receiver, sender, delivered) =
        courier_service::get_delivery(&config, 0);
    assert!(storage_unit_id == ssu_id);
    assert!(type_id == ITEM_TYPE_ID);
    assert!(quantity == 50);
    assert!(receiver == user_a());
    assert!(sender == @0x0);
    assert!(!delivered);

    let (likes, completed, pending) = courier_service::get_player_metrics(&config, user_a());
    assert!(likes == 0);
    assert!(completed == 0);
    assert!(pending == 1);

    config::destroy_for_testing(config, admin_cap);
    ts.end();
}

#[test, expected_failure(abort_code = courier_service::EInvalidQuantity)]
fun test_create_delivery_bad_quantity_zero() {
    let mut ts = ts::begin(admin());
    let (mut config, admin_cap) = config::create_for_testing(ts.ctx());
    courier_service::set_likes(&mut config, &admin_cap, ITEM_TYPE_ID, 10);

    ts.next_tx(user_a());
    let ssu_id = object::id_from_address(@0x1234);
    courier_service::create_delivery_request(&mut config, ssu_id, ITEM_TYPE_ID, 0, ts.ctx());

    config::destroy_for_testing(config, admin_cap);
    ts.end();
}

#[test, expected_failure(abort_code = courier_service::EInvalidQuantity)]
fun test_create_delivery_bad_quantity_over_500() {
    let mut ts = ts::begin(admin());
    let (mut config, admin_cap) = config::create_for_testing(ts.ctx());
    courier_service::set_likes(&mut config, &admin_cap, ITEM_TYPE_ID, 10);

    ts.next_tx(user_a());
    let ssu_id = object::id_from_address(@0x1234);
    courier_service::create_delivery_request(&mut config, ssu_id, ITEM_TYPE_ID, 501, ts.ctx());

    config::destroy_for_testing(config, admin_cap);
    ts.end();
}

#[test]
fun test_create_delivery_no_likes_defaults_to_one() {
    let mut ts = ts::begin(admin());
    let (mut config, admin_cap) = config::create_for_testing(ts.ctx());

    ts.next_tx(user_a());
    let ssu_id = object::id_from_address(@0x1234);
    courier_service::create_delivery_request(&mut config, ssu_id, 99999, 10, ts.ctx());
    assert!(courier_service::get_item_likes(&config, 99999) == 1);

    config::destroy_for_testing(config, admin_cap);
    ts.end();
}

#[test, expected_failure(abort_code = courier_service::ETooManyPending)]
fun test_create_delivery_max_pending() {
    let mut ts = ts::begin(admin());
    let (mut config, admin_cap) = config::create_for_testing(ts.ctx());
    courier_service::set_likes(&mut config, &admin_cap, ITEM_TYPE_ID, 10);

    ts.next_tx(user_a());
    let ssu_id = object::id_from_address(@0x1234);
    let mut i = 0u64;
    while (i < 5) {
        courier_service::create_delivery_request(&mut config, ssu_id, ITEM_TYPE_ID, 1, ts.ctx());
        i = i + 1;
    };
    // 6th should fail
    courier_service::create_delivery_request(&mut config, ssu_id, ITEM_TYPE_ID, 1, ts.ctx());

    config::destroy_for_testing(config, admin_cap);
    ts.end();
}

#[test, expected_failure(abort_code = courier_service::EDeliveryNotFound)]
fun test_fulfill_nonexistent() {
    let mut ts = ts::begin(admin());
    let (_receiver_id, courier_id, storage_id) = setup_full(&mut ts);
    let (mut config, admin_cap) = config::create_for_testing(ts.ctx());

    // Mint and withdraw an item for the courier
    mint_items(&mut ts, storage_id, courier_id, user_b(), ITEM_ITEM_ID, ITEM_TYPE_ID, ITEM_VOLUME, ITEM_QUANTITY);
    let item = char_withdraw(&mut ts, storage_id, courier_id, user_b(), ITEM_TYPE_ID, ITEM_QUANTITY);

    // Try to fulfill nonexistent delivery
    ts.next_tx(user_b());
    let mut storage_unit = ts::take_shared_by_id<StorageUnit>(&ts, storage_id);
    let character = ts::take_shared_by_id<Character>(&ts, courier_id);
    courier_service::fulfill_delivery(&mut config, &mut storage_unit, &character, item, 999, ts.ctx());
    ts::return_shared(storage_unit);
    ts::return_shared(character);

    config::destroy_for_testing(config, admin_cap);
    ts.end();
}

// ============================================================
// === Tests: Full inventory lifecycle ===
// ============================================================

#[test]
fun test_fulfill_delivery_with_inventory() {
    let mut ts = ts::begin(admin());
    let (_receiver_id, courier_id, storage_id) = setup_full(&mut ts);
    let (mut config, admin_cap) = config::create_for_testing(ts.ctx());
    courier_service::set_likes(&mut config, &admin_cap, ITEM_TYPE_ID, 10);

    // Receiver creates a delivery request
    ts.next_tx(user_a());
    courier_service::create_delivery_request(
        &mut config, storage_id, ITEM_TYPE_ID, ITEM_QUANTITY, ts.ctx(),
    );

    // Mint items into courier's owned inventory on this SSU
    mint_items(&mut ts, storage_id, courier_id, user_b(), ITEM_ITEM_ID, ITEM_TYPE_ID, ITEM_VOLUME, ITEM_QUANTITY);

    // Courier withdraws items from owned inventory
    let item = char_withdraw(&mut ts, storage_id, courier_id, user_b(), ITEM_TYPE_ID, ITEM_QUANTITY);

    // Courier fulfills the delivery (deposits to open inventory)
    ts.next_tx(user_b());
    let mut storage_unit = ts::take_shared_by_id<StorageUnit>(&ts, storage_id);
    let character = ts::take_shared_by_id<Character>(&ts, courier_id);
    courier_service::fulfill_delivery(&mut config, &mut storage_unit, &character, item, 0, ts.ctx());
    ts::return_shared(storage_unit);
    ts::return_shared(character);

    // Verify delivery state
    let (_ssu, _type_id, _qty, _receiver, sender, delivered) =
        courier_service::get_delivery(&config, 0);
    assert!(sender == user_b());
    assert!(delivered);

    // Verify courier metrics: 10 likes * 50 quantity = 500
    let (likes, completed, pending) = courier_service::get_player_metrics(&config, user_b());
    assert!(likes == 500);
    assert!(completed == 1);
    assert!(pending == 0);

    // Verify open inventory has the items
    ts.next_tx(admin());
    {
        let storage_unit = ts::take_shared_by_id<StorageUnit>(&ts, storage_id);
        let open_key = storage_unit.open_storage_key();
        assert!(storage_unit.has_inventory(open_key));
        let inv = storage_unit.inventory(open_key);
        assert!(inv.contains_item(ITEM_TYPE_ID));
        assert!(inv.item_quantity(ITEM_TYPE_ID) == ITEM_QUANTITY);
        ts::return_shared(storage_unit);
    };

    config::destroy_for_testing(config, admin_cap);
    ts.end();
}

#[test]
fun test_pickup_with_inventory() {
    let mut ts = ts::begin(admin());
    let (receiver_id, courier_id, storage_id) = setup_full(&mut ts);
    let (mut config, admin_cap) = config::create_for_testing(ts.ctx());
    courier_service::set_likes(&mut config, &admin_cap, ITEM_TYPE_ID, 10);

    // Create delivery
    ts.next_tx(user_a());
    courier_service::create_delivery_request(
        &mut config, storage_id, ITEM_TYPE_ID, ITEM_QUANTITY, ts.ctx(),
    );

    // Courier mints, withdraws, fulfills
    mint_items(&mut ts, storage_id, courier_id, user_b(), ITEM_ITEM_ID, ITEM_TYPE_ID, ITEM_VOLUME, ITEM_QUANTITY);
    let item = char_withdraw(&mut ts, storage_id, courier_id, user_b(), ITEM_TYPE_ID, ITEM_QUANTITY);
    ts.next_tx(user_b());
    {
        let mut storage_unit = ts::take_shared_by_id<StorageUnit>(&ts, storage_id);
        let character = ts::take_shared_by_id<Character>(&ts, courier_id);
        courier_service::fulfill_delivery(&mut config, &mut storage_unit, &character, item, 0, ts.ctx());
        ts::return_shared(storage_unit);
        ts::return_shared(character);
    };

    // Receiver picks up
    ts.next_tx(user_a());
    {
        let mut storage_unit = ts::take_shared_by_id<StorageUnit>(&ts, storage_id);
        let character = ts::take_shared_by_id<Character>(&ts, receiver_id);
        courier_service::pickup(&mut config, &mut storage_unit, &character, 0, ts.ctx());
        ts::return_shared(storage_unit);
        ts::return_shared(character);
    };

    // Verify pending count decremented
    let (_likes, _completed, pending) = courier_service::get_player_metrics(&config, user_a());
    assert!(pending == 0);

    // Verify receiver's owned inventory has the items
    ts.next_tx(admin());
    {
        let storage_unit = ts::take_shared_by_id<StorageUnit>(&ts, storage_id);
        let character = ts::take_shared_by_id<Character>(&ts, receiver_id);
        let owner_cap_id = character.owner_cap_id();
        assert!(storage_unit.has_inventory(owner_cap_id));
        let inv = storage_unit.inventory(owner_cap_id);
        assert!(inv.contains_item(ITEM_TYPE_ID));
        assert!(inv.item_quantity(ITEM_TYPE_ID) == ITEM_QUANTITY);
        ts::return_shared(storage_unit);
        ts::return_shared(character);
    };

    // Verify open inventory is empty
    ts.next_tx(admin());
    {
        let storage_unit = ts::take_shared_by_id<StorageUnit>(&ts, storage_id);
        let open_key = storage_unit.open_storage_key();
        let inv = storage_unit.inventory(open_key);
        assert!(!inv.contains_item(ITEM_TYPE_ID));
        ts::return_shared(storage_unit);
    };

    config::destroy_for_testing(config, admin_cap);
    ts.end();
}

#[test]
fun test_full_delivery_lifecycle() {
    // End-to-end: create → fulfill → pickup, verifying inventory at each step.
    let mut ts = ts::begin(admin());
    let (receiver_id, courier_id, storage_id) = setup_full(&mut ts);
    let (mut config, admin_cap) = config::create_for_testing(ts.ctx());
    courier_service::set_likes(&mut config, &admin_cap, ITEM_TYPE_ID, 5);

    // Step 1: Receiver creates delivery request
    ts.next_tx(user_a());
    courier_service::create_delivery_request(
        &mut config, storage_id, ITEM_TYPE_ID, 10, ts.ctx(),
    );
    let (_likes, _completed, pending) = courier_service::get_player_metrics(&config, user_a());
    assert!(pending == 1);

    // Step 2: Courier mints 100 items, withdraws exactly 10 for delivery
    mint_items(&mut ts, storage_id, courier_id, user_b(), ITEM_ITEM_ID, ITEM_TYPE_ID, ITEM_VOLUME, 100);

    // Verify courier has 100 items in owned inventory
    ts.next_tx(admin());
    {
        let storage_unit = ts::take_shared_by_id<StorageUnit>(&ts, storage_id);
        let character = ts::take_shared_by_id<Character>(&ts, courier_id);
        let owner_cap_id = character.owner_cap_id();
        let inv = storage_unit.inventory(owner_cap_id);
        assert!(inv.item_quantity(ITEM_TYPE_ID) == 100);
        ts::return_shared(storage_unit);
        ts::return_shared(character);
    };

    // Courier withdraws exactly 10 (partial stack split)
    let item = char_withdraw(&mut ts, storage_id, courier_id, user_b(), ITEM_TYPE_ID, 10);

    // Verify courier has 90 remaining in owned inventory
    ts.next_tx(admin());
    {
        let storage_unit = ts::take_shared_by_id<StorageUnit>(&ts, storage_id);
        let character = ts::take_shared_by_id<Character>(&ts, courier_id);
        let owner_cap_id = character.owner_cap_id();
        let inv = storage_unit.inventory(owner_cap_id);
        assert!(inv.item_quantity(ITEM_TYPE_ID) == 90);
        ts::return_shared(storage_unit);
        ts::return_shared(character);
    };

    // Step 3: Courier fulfills
    ts.next_tx(user_b());
    {
        let mut storage_unit = ts::take_shared_by_id<StorageUnit>(&ts, storage_id);
        let character = ts::take_shared_by_id<Character>(&ts, courier_id);
        courier_service::fulfill_delivery(&mut config, &mut storage_unit, &character, item, 0, ts.ctx());
        ts::return_shared(storage_unit);
        ts::return_shared(character);
    };

    // Verify likes: 5 * 10 = 50
    let (likes, completed, _) = courier_service::get_player_metrics(&config, user_b());
    assert!(likes == 50);
    assert!(completed == 1);

    // Verify items in open inventory
    ts.next_tx(admin());
    {
        let storage_unit = ts::take_shared_by_id<StorageUnit>(&ts, storage_id);
        let open_key = storage_unit.open_storage_key();
        let inv = storage_unit.inventory(open_key);
        assert!(inv.item_quantity(ITEM_TYPE_ID) == 10);
        ts::return_shared(storage_unit);
    };

    // Step 4: Receiver picks up
    ts.next_tx(user_a());
    {
        let mut storage_unit = ts::take_shared_by_id<StorageUnit>(&ts, storage_id);
        let character = ts::take_shared_by_id<Character>(&ts, receiver_id);
        courier_service::pickup(&mut config, &mut storage_unit, &character, 0, ts.ctx());
        ts::return_shared(storage_unit);
        ts::return_shared(character);
    };

    // Verify receiver got items in their owned inventory
    ts.next_tx(admin());
    {
        let storage_unit = ts::take_shared_by_id<StorageUnit>(&ts, storage_id);
        let character = ts::take_shared_by_id<Character>(&ts, receiver_id);
        let owner_cap_id = character.owner_cap_id();
        let inv = storage_unit.inventory(owner_cap_id);
        assert!(inv.item_quantity(ITEM_TYPE_ID) == 10);
        ts::return_shared(storage_unit);
        ts::return_shared(character);
    };

    // Verify open inventory is now empty
    ts.next_tx(admin());
    {
        let storage_unit = ts::take_shared_by_id<StorageUnit>(&ts, storage_id);
        let open_key = storage_unit.open_storage_key();
        let inv = storage_unit.inventory(open_key);
        assert!(!inv.contains_item(ITEM_TYPE_ID));
        ts::return_shared(storage_unit);
    };

    // Verify pending decremented
    let (_, _, pending) = courier_service::get_player_metrics(&config, user_a());
    assert!(pending == 0);

    config::destroy_for_testing(config, admin_cap);
    ts.end();
}

// ============================================================
// === Tests: Error cases with inventory ===
// ============================================================

#[test, expected_failure(abort_code = courier_service::EAlreadyDelivered)]
fun test_fulfill_already_delivered() {
    let mut ts = ts::begin(admin());
    let (_receiver_id, courier_id, storage_id) = setup_full(&mut ts);
    let (mut config, admin_cap) = config::create_for_testing(ts.ctx());
    courier_service::set_likes(&mut config, &admin_cap, ITEM_TYPE_ID, 10);

    // Create delivery
    ts.next_tx(user_a());
    courier_service::create_delivery_request(
        &mut config, storage_id, ITEM_TYPE_ID, ITEM_QUANTITY, ts.ctx(),
    );

    // First fulfill
    mint_items(&mut ts, storage_id, courier_id, user_b(), ITEM_ITEM_ID, ITEM_TYPE_ID, ITEM_VOLUME, ITEM_QUANTITY);
    let item = char_withdraw(&mut ts, storage_id, courier_id, user_b(), ITEM_TYPE_ID, ITEM_QUANTITY);
    ts.next_tx(user_b());
    {
        let mut storage_unit = ts::take_shared_by_id<StorageUnit>(&ts, storage_id);
        let character = ts::take_shared_by_id<Character>(&ts, courier_id);
        courier_service::fulfill_delivery(&mut config, &mut storage_unit, &character, item, 0, ts.ctx());
        ts::return_shared(storage_unit);
        ts::return_shared(character);
    };

    // Second fulfill should fail
    mint_items(&mut ts, storage_id, courier_id, user_b(), ITEM_ITEM_ID + 1, ITEM_TYPE_ID, ITEM_VOLUME, ITEM_QUANTITY);
    let item2 = char_withdraw(&mut ts, storage_id, courier_id, user_b(), ITEM_TYPE_ID, ITEM_QUANTITY);
    ts.next_tx(user_b());
    {
        let mut storage_unit = ts::take_shared_by_id<StorageUnit>(&ts, storage_id);
        let character = ts::take_shared_by_id<Character>(&ts, courier_id);
        courier_service::fulfill_delivery(&mut config, &mut storage_unit, &character, item2, 0, ts.ctx());
        ts::return_shared(storage_unit);
        ts::return_shared(character);
    };

    config::destroy_for_testing(config, admin_cap);
    ts.end();
}

#[test, expected_failure(abort_code = courier_service::EItemMismatch)]
fun test_fulfill_wrong_item_type() {
    let mut ts = ts::begin(admin());
    let (_receiver_id, courier_id, storage_id) = setup_full(&mut ts);
    let (mut config, admin_cap) = config::create_for_testing(ts.ctx());
    courier_service::set_likes(&mut config, &admin_cap, ITEM_TYPE_ID, 10);

    // Create delivery for ITEM_TYPE_ID
    ts.next_tx(user_a());
    courier_service::create_delivery_request(
        &mut config, storage_id, ITEM_TYPE_ID, ITEM_QUANTITY, ts.ctx(),
    );

    // Courier mints a DIFFERENT item type
    let wrong_type_id: u64 = 99999;
    mint_items(&mut ts, storage_id, courier_id, user_b(), ITEM_ITEM_ID + 100, wrong_type_id, ITEM_VOLUME, ITEM_QUANTITY);
    let item = char_withdraw(&mut ts, storage_id, courier_id, user_b(), wrong_type_id, ITEM_QUANTITY);

    // Fulfill with wrong type should fail
    ts.next_tx(user_b());
    let mut storage_unit = ts::take_shared_by_id<StorageUnit>(&ts, storage_id);
    let character = ts::take_shared_by_id<Character>(&ts, courier_id);
    courier_service::fulfill_delivery(&mut config, &mut storage_unit, &character, item, 0, ts.ctx());
    ts::return_shared(storage_unit);
    ts::return_shared(character);

    config::destroy_for_testing(config, admin_cap);
    ts.end();
}

#[test, expected_failure(abort_code = courier_service::EItemMismatch)]
fun test_fulfill_wrong_quantity() {
    let mut ts = ts::begin(admin());
    let (_receiver_id, courier_id, storage_id) = setup_full(&mut ts);
    let (mut config, admin_cap) = config::create_for_testing(ts.ctx());
    courier_service::set_likes(&mut config, &admin_cap, ITEM_TYPE_ID, 10);

    // Create delivery for 50 items
    ts.next_tx(user_a());
    courier_service::create_delivery_request(
        &mut config, storage_id, ITEM_TYPE_ID, ITEM_QUANTITY, ts.ctx(),
    );

    // Courier mints 100 but only withdraws 25 (wrong quantity)
    mint_items(&mut ts, storage_id, courier_id, user_b(), ITEM_ITEM_ID, ITEM_TYPE_ID, ITEM_VOLUME, 100);
    let item = char_withdraw(&mut ts, storage_id, courier_id, user_b(), ITEM_TYPE_ID, 25);

    // Fulfill with wrong quantity should fail
    ts.next_tx(user_b());
    let mut storage_unit = ts::take_shared_by_id<StorageUnit>(&ts, storage_id);
    let character = ts::take_shared_by_id<Character>(&ts, courier_id);
    courier_service::fulfill_delivery(&mut config, &mut storage_unit, &character, item, 0, ts.ctx());
    ts::return_shared(storage_unit);
    ts::return_shared(character);

    config::destroy_for_testing(config, admin_cap);
    ts.end();
}

#[test, expected_failure(abort_code = courier_service::EStorageUnitMismatch)]
fun test_fulfill_wrong_storage_unit() {
    let mut ts = ts::begin(admin());
    let (_receiver_id, courier_id, storage_id) = setup_full(&mut ts);
    let (mut config, admin_cap) = config::create_for_testing(ts.ctx());
    courier_service::set_likes(&mut config, &admin_cap, ITEM_TYPE_ID, 10);

    // Create delivery for a DIFFERENT storage unit ID
    ts.next_tx(user_a());
    let fake_ssu_id = object::id_from_address(@0xDEAD);
    courier_service::create_delivery_request(
        &mut config, fake_ssu_id, ITEM_TYPE_ID, ITEM_QUANTITY, ts.ctx(),
    );

    // Courier mints and withdraws items from the real SSU
    mint_items(&mut ts, storage_id, courier_id, user_b(), ITEM_ITEM_ID, ITEM_TYPE_ID, ITEM_VOLUME, ITEM_QUANTITY);
    let item = char_withdraw(&mut ts, storage_id, courier_id, user_b(), ITEM_TYPE_ID, ITEM_QUANTITY);

    // Fulfill with wrong SSU should fail
    ts.next_tx(user_b());
    let mut storage_unit = ts::take_shared_by_id<StorageUnit>(&ts, storage_id);
    let character = ts::take_shared_by_id<Character>(&ts, courier_id);
    courier_service::fulfill_delivery(&mut config, &mut storage_unit, &character, item, 0, ts.ctx());
    ts::return_shared(storage_unit);
    ts::return_shared(character);

    config::destroy_for_testing(config, admin_cap);
    ts.end();
}

#[test, expected_failure(abort_code = courier_service::ENotReceiver)]
fun test_pickup_wrong_receiver() {
    let mut ts = ts::begin(admin());
    let (_receiver_id, courier_id, storage_id) = setup_full(&mut ts);
    let (mut config, admin_cap) = config::create_for_testing(ts.ctx());
    courier_service::set_likes(&mut config, &admin_cap, ITEM_TYPE_ID, 10);

    // Create and fulfill delivery
    ts.next_tx(user_a());
    courier_service::create_delivery_request(
        &mut config, storage_id, ITEM_TYPE_ID, ITEM_QUANTITY, ts.ctx(),
    );
    mint_items(&mut ts, storage_id, courier_id, user_b(), ITEM_ITEM_ID, ITEM_TYPE_ID, ITEM_VOLUME, ITEM_QUANTITY);
    let item = char_withdraw(&mut ts, storage_id, courier_id, user_b(), ITEM_TYPE_ID, ITEM_QUANTITY);
    ts.next_tx(user_b());
    {
        let mut storage_unit = ts::take_shared_by_id<StorageUnit>(&ts, storage_id);
        let character = ts::take_shared_by_id<Character>(&ts, courier_id);
        courier_service::fulfill_delivery(&mut config, &mut storage_unit, &character, item, 0, ts.ctx());
        ts::return_shared(storage_unit);
        ts::return_shared(character);
    };

    // Courier (not receiver) tries to pickup — should fail
    ts.next_tx(user_b());
    {
        let mut storage_unit = ts::take_shared_by_id<StorageUnit>(&ts, storage_id);
        let character = ts::take_shared_by_id<Character>(&ts, courier_id);
        courier_service::pickup(&mut config, &mut storage_unit, &character, 0, ts.ctx());
        ts::return_shared(storage_unit);
        ts::return_shared(character);
    };

    config::destroy_for_testing(config, admin_cap);
    ts.end();
}

#[test, expected_failure(abort_code = courier_service::ENotDelivered)]
fun test_pickup_not_delivered() {
    let mut ts = ts::begin(admin());
    let (receiver_id, _courier_id, storage_id) = setup_full(&mut ts);
    let (mut config, admin_cap) = config::create_for_testing(ts.ctx());
    courier_service::set_likes(&mut config, &admin_cap, ITEM_TYPE_ID, 10);

    // Create delivery but don't fulfill
    ts.next_tx(user_a());
    courier_service::create_delivery_request(
        &mut config, storage_id, ITEM_TYPE_ID, ITEM_QUANTITY, ts.ctx(),
    );

    // Try to pickup before delivery — should fail
    ts.next_tx(user_a());
    {
        let mut storage_unit = ts::take_shared_by_id<StorageUnit>(&ts, storage_id);
        let character = ts::take_shared_by_id<Character>(&ts, receiver_id);
        courier_service::pickup(&mut config, &mut storage_unit, &character, 0, ts.ctx());
        ts::return_shared(storage_unit);
        ts::return_shared(character);
    };

    config::destroy_for_testing(config, admin_cap);
    ts.end();
}

// Note: test_pickup_wrong_storage_unit is not needed because
// fulfill_delivery already validates SSU match — you can never get a
// delivered delivery pointing to a different SSU than the one it was
// fulfilled on. The fulfill-side EStorageUnitMismatch test covers this.

#[test]
fun test_multiple_deliveries() {
    // Multiple deliveries on the same SSU, fulfilled and picked up independently.
    let mut ts = ts::begin(admin());
    let (receiver_id, courier_id, storage_id) = setup_full(&mut ts);
    let (mut config, admin_cap) = config::create_for_testing(ts.ctx());
    courier_service::set_likes(&mut config, &admin_cap, ITEM_TYPE_ID, 2);

    // Create 2 deliveries
    ts.next_tx(user_a());
    courier_service::create_delivery_request(
        &mut config, storage_id, ITEM_TYPE_ID, 10, ts.ctx(),
    );
    courier_service::create_delivery_request(
        &mut config, storage_id, ITEM_TYPE_ID, 20, ts.ctx(),
    );

    let (_, _, pending) = courier_service::get_player_metrics(&config, user_a());
    assert!(pending == 2);

    // Mint enough for both (30 total)
    mint_items(&mut ts, storage_id, courier_id, user_b(), ITEM_ITEM_ID, ITEM_TYPE_ID, ITEM_VOLUME, 30);

    // Fulfill delivery 0 (10 items)
    let item0 = char_withdraw(&mut ts, storage_id, courier_id, user_b(), ITEM_TYPE_ID, 10);
    ts.next_tx(user_b());
    {
        let mut storage_unit = ts::take_shared_by_id<StorageUnit>(&ts, storage_id);
        let character = ts::take_shared_by_id<Character>(&ts, courier_id);
        courier_service::fulfill_delivery(&mut config, &mut storage_unit, &character, item0, 0, ts.ctx());
        ts::return_shared(storage_unit);
        ts::return_shared(character);
    };

    // Fulfill delivery 1 (20 items)
    let item1 = char_withdraw(&mut ts, storage_id, courier_id, user_b(), ITEM_TYPE_ID, 20);
    ts.next_tx(user_b());
    {
        let mut storage_unit = ts::take_shared_by_id<StorageUnit>(&ts, storage_id);
        let character = ts::take_shared_by_id<Character>(&ts, courier_id);
        courier_service::fulfill_delivery(&mut config, &mut storage_unit, &character, item1, 1, ts.ctx());
        ts::return_shared(storage_unit);
        ts::return_shared(character);
    };

    // Verify courier metrics: 2 * (10 + 20) = 60 likes, 2 deliveries
    let (likes, completed, _) = courier_service::get_player_metrics(&config, user_b());
    assert!(likes == 60);
    assert!(completed == 2);

    // Pickup delivery 1 first (out of order)
    ts.next_tx(user_a());
    {
        let mut storage_unit = ts::take_shared_by_id<StorageUnit>(&ts, storage_id);
        let character = ts::take_shared_by_id<Character>(&ts, receiver_id);
        courier_service::pickup(&mut config, &mut storage_unit, &character, 1, ts.ctx());
        ts::return_shared(storage_unit);
        ts::return_shared(character);
    };

    let (_, _, pending) = courier_service::get_player_metrics(&config, user_a());
    assert!(pending == 1);

    // Pickup delivery 0
    ts.next_tx(user_a());
    {
        let mut storage_unit = ts::take_shared_by_id<StorageUnit>(&ts, storage_id);
        let character = ts::take_shared_by_id<Character>(&ts, receiver_id);
        courier_service::pickup(&mut config, &mut storage_unit, &character, 0, ts.ctx());
        ts::return_shared(storage_unit);
        ts::return_shared(character);
    };

    let (_, _, pending) = courier_service::get_player_metrics(&config, user_a());
    assert!(pending == 0);

    // Verify receiver has all 30 items
    ts.next_tx(admin());
    {
        let storage_unit = ts::take_shared_by_id<StorageUnit>(&ts, storage_id);
        let character = ts::take_shared_by_id<Character>(&ts, receiver_id);
        let owner_cap_id = character.owner_cap_id();
        let inv = storage_unit.inventory(owner_cap_id);
        assert!(inv.item_quantity(ITEM_TYPE_ID) == 30);
        ts::return_shared(storage_unit);
        ts::return_shared(character);
    };

    config::destroy_for_testing(config, admin_cap);
    ts.end();
}
