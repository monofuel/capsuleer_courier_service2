#[test_only]
module capsuleer_courier_service::courier_service_tests;

use sui::test_scenario;
use capsuleer_courier_service::config;
use capsuleer_courier_service::courier_service;

const ADMIN: address = @0xAD;
const RECEIVER: address = @0xBB;
const COURIER: address = @0xCC;

#[test]
fun test_set_likes() {
    let mut scenario = test_scenario::begin(ADMIN);
    let (mut config, admin_cap) = config::create_for_testing(scenario.ctx());

    courier_service::set_likes(&mut config, &admin_cap, 77800, 10);
    assert!(courier_service::get_item_likes(&config, 77800) == 10);

    // Update existing
    courier_service::set_likes(&mut config, &admin_cap, 77800, 20);
    assert!(courier_service::get_item_likes(&config, 77800) == 20);

    // Unconfigured item returns 0
    assert!(courier_service::get_item_likes(&config, 99999) == 0);

    config::destroy_for_testing(config, admin_cap);
    scenario.end();
}

#[test]
fun test_create_delivery_request() {
    let mut scenario = test_scenario::begin(ADMIN);
    let (mut config, admin_cap) = config::create_for_testing(scenario.ctx());

    // Setup: configure likes for item type
    courier_service::set_likes(&mut config, &admin_cap, 77800, 10);

    // Create delivery as receiver
    scenario.next_tx(RECEIVER);
    let ssu_id = object::id_from_address(@0x1234);
    courier_service::create_delivery_request(&mut config, ssu_id, 77800, 50, scenario.ctx());

    // Verify delivery exists
    let (storage_unit_id, type_id, quantity, receiver, sender, delivered) =
        courier_service::get_delivery(&config, 0);
    assert!(storage_unit_id == ssu_id);
    assert!(type_id == 77800);
    assert!(quantity == 50);
    assert!(receiver == RECEIVER);
    assert!(sender == @0x0);
    assert!(!delivered);

    // Verify player metrics updated
    let (likes, completed, pending) = courier_service::get_player_metrics(&config, RECEIVER);
    assert!(likes == 0);
    assert!(completed == 0);
    assert!(pending == 1);

    config::destroy_for_testing(config, admin_cap);
    scenario.end();
}

#[test, expected_failure(abort_code = courier_service::EInvalidQuantity)]
fun test_create_delivery_bad_quantity_zero() {
    let mut scenario = test_scenario::begin(ADMIN);
    let (mut config, admin_cap) = config::create_for_testing(scenario.ctx());
    courier_service::set_likes(&mut config, &admin_cap, 77800, 10);

    scenario.next_tx(RECEIVER);
    let ssu_id = object::id_from_address(@0x1234);
    courier_service::create_delivery_request(&mut config, ssu_id, 77800, 0, scenario.ctx());

    config::destroy_for_testing(config, admin_cap);
    scenario.end();
}

#[test, expected_failure(abort_code = courier_service::EInvalidQuantity)]
fun test_create_delivery_bad_quantity_over_500() {
    let mut scenario = test_scenario::begin(ADMIN);
    let (mut config, admin_cap) = config::create_for_testing(scenario.ctx());
    courier_service::set_likes(&mut config, &admin_cap, 77800, 10);

    scenario.next_tx(RECEIVER);
    let ssu_id = object::id_from_address(@0x1234);
    courier_service::create_delivery_request(&mut config, ssu_id, 77800, 501, scenario.ctx());

    config::destroy_for_testing(config, admin_cap);
    scenario.end();
}

#[test, expected_failure(abort_code = courier_service::EItemNotConfigured)]
fun test_create_delivery_no_likes() {
    let mut scenario = test_scenario::begin(ADMIN);
    let (mut config, admin_cap) = config::create_for_testing(scenario.ctx());

    scenario.next_tx(RECEIVER);
    let ssu_id = object::id_from_address(@0x1234);
    // Item type 99999 has no likes configured
    courier_service::create_delivery_request(&mut config, ssu_id, 99999, 10, scenario.ctx());

    config::destroy_for_testing(config, admin_cap);
    scenario.end();
}

#[test, expected_failure(abort_code = courier_service::ETooManyPending)]
fun test_create_delivery_max_pending() {
    let mut scenario = test_scenario::begin(ADMIN);
    let (mut config, admin_cap) = config::create_for_testing(scenario.ctx());
    courier_service::set_likes(&mut config, &admin_cap, 77800, 10);

    scenario.next_tx(RECEIVER);
    let ssu_id = object::id_from_address(@0x1234);

    // Create 5 deliveries (the max)
    let mut i = 0u64;
    while (i < 5) {
        courier_service::create_delivery_request(&mut config, ssu_id, 77800, 1, scenario.ctx());
        i = i + 1;
    };

    // 6th should fail
    courier_service::create_delivery_request(&mut config, ssu_id, 77800, 1, scenario.ctx());

    config::destroy_for_testing(config, admin_cap);
    scenario.end();
}

#[test]
fun test_fulfill_delivery() {
    let mut scenario = test_scenario::begin(ADMIN);
    let (mut config, admin_cap) = config::create_for_testing(scenario.ctx());
    courier_service::set_likes(&mut config, &admin_cap, 77800, 10);

    // Create delivery
    scenario.next_tx(RECEIVER);
    let ssu_id = object::id_from_address(@0x1234);
    courier_service::create_delivery_request(&mut config, ssu_id, 77800, 5, scenario.ctx());

    // Fulfill as courier
    scenario.next_tx(COURIER);
    courier_service::fulfill_delivery(&mut config, 0, scenario.ctx());

    // Verify delivery state
    let (_ssu, _type_id, _qty, _receiver, sender, delivered) =
        courier_service::get_delivery(&config, 0);
    assert!(sender == COURIER);
    assert!(delivered);

    // Verify courier metrics
    let (likes, completed, pending) = courier_service::get_player_metrics(&config, COURIER);
    assert!(likes == 50); // 10 likes * 5 quantity
    assert!(completed == 1);
    assert!(pending == 0);

    config::destroy_for_testing(config, admin_cap);
    scenario.end();
}

#[test, expected_failure(abort_code = courier_service::EAlreadyDelivered)]
fun test_fulfill_already_delivered() {
    let mut scenario = test_scenario::begin(ADMIN);
    let (mut config, admin_cap) = config::create_for_testing(scenario.ctx());
    courier_service::set_likes(&mut config, &admin_cap, 77800, 10);

    scenario.next_tx(RECEIVER);
    let ssu_id = object::id_from_address(@0x1234);
    courier_service::create_delivery_request(&mut config, ssu_id, 77800, 1, scenario.ctx());

    scenario.next_tx(COURIER);
    courier_service::fulfill_delivery(&mut config, 0, scenario.ctx());
    // Second fulfill should fail
    courier_service::fulfill_delivery(&mut config, 0, scenario.ctx());

    config::destroy_for_testing(config, admin_cap);
    scenario.end();
}

#[test]
fun test_pickup() {
    let mut scenario = test_scenario::begin(ADMIN);
    let (mut config, admin_cap) = config::create_for_testing(scenario.ctx());
    courier_service::set_likes(&mut config, &admin_cap, 77800, 10);

    // Create and fulfill
    scenario.next_tx(RECEIVER);
    let ssu_id = object::id_from_address(@0x1234);
    courier_service::create_delivery_request(&mut config, ssu_id, 77800, 1, scenario.ctx());

    scenario.next_tx(COURIER);
    courier_service::fulfill_delivery(&mut config, 0, scenario.ctx());

    // Pickup as receiver
    scenario.next_tx(RECEIVER);
    courier_service::pickup(&mut config, 0, scenario.ctx());

    // Verify pending count decremented
    let (_likes, _completed, pending) = courier_service::get_player_metrics(&config, RECEIVER);
    assert!(pending == 0);

    config::destroy_for_testing(config, admin_cap);
    scenario.end();
}

#[test, expected_failure(abort_code = courier_service::ENotReceiver)]
fun test_pickup_wrong_receiver() {
    let mut scenario = test_scenario::begin(ADMIN);
    let (mut config, admin_cap) = config::create_for_testing(scenario.ctx());
    courier_service::set_likes(&mut config, &admin_cap, 77800, 10);

    scenario.next_tx(RECEIVER);
    let ssu_id = object::id_from_address(@0x1234);
    courier_service::create_delivery_request(&mut config, ssu_id, 77800, 1, scenario.ctx());

    scenario.next_tx(COURIER);
    courier_service::fulfill_delivery(&mut config, 0, scenario.ctx());

    // Courier tries to pickup (not the receiver) — should fail
    courier_service::pickup(&mut config, 0, scenario.ctx());

    config::destroy_for_testing(config, admin_cap);
    scenario.end();
}

#[test, expected_failure(abort_code = courier_service::ENotDelivered)]
fun test_pickup_not_delivered() {
    let mut scenario = test_scenario::begin(ADMIN);
    let (mut config, admin_cap) = config::create_for_testing(scenario.ctx());
    courier_service::set_likes(&mut config, &admin_cap, 77800, 10);

    scenario.next_tx(RECEIVER);
    let ssu_id = object::id_from_address(@0x1234);
    courier_service::create_delivery_request(&mut config, ssu_id, 77800, 1, scenario.ctx());

    // Try to pickup before delivery — should fail
    courier_service::pickup(&mut config, 0, scenario.ctx());

    config::destroy_for_testing(config, admin_cap);
    scenario.end();
}

#[test, expected_failure(abort_code = courier_service::EDeliveryNotFound)]
fun test_fulfill_nonexistent() {
    let mut scenario = test_scenario::begin(ADMIN);
    let (mut config, admin_cap) = config::create_for_testing(scenario.ctx());

    scenario.next_tx(COURIER);
    courier_service::fulfill_delivery(&mut config, 999, scenario.ctx());

    config::destroy_for_testing(config, admin_cap);
    scenario.end();
}
