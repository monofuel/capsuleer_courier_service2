/// Shared extension configuration for the Capsuleer Courier Service.
///
/// Publishes a single shared `ExtensionConfig` object at package publish time.
/// All courier service state (deliveries, player metrics, item likes) is stored
/// as dynamic fields on this object.
module capsuleer_courier_service::config;

use sui::dynamic_field as df;

public struct ExtensionConfig has key {
    id: UID,
}

public struct AdminCap has key, store {
    id: UID,
}

/// Typed witness for storage unit extension authorization.
public struct CourierAuth has drop {}

fun init(ctx: &mut TxContext) {
    let admin_cap = AdminCap { id: object::new(ctx) };
    transfer::transfer(admin_cap, ctx.sender());

    let config = ExtensionConfig { id: object::new(ctx) };
    transfer::share_object(config);
}

// === Dynamic field helpers ===

public fun has_rule<K: copy + drop + store>(config: &ExtensionConfig, key: K): bool {
    df::exists_(&config.id, key)
}

public fun borrow_rule<K: copy + drop + store, V: store>(config: &ExtensionConfig, key: K): &V {
    df::borrow(&config.id, key)
}

public fun borrow_rule_mut<K: copy + drop + store, V: store>(
    config: &mut ExtensionConfig,
    _: &AdminCap,
    key: K,
): &mut V {
    df::borrow_mut(&mut config.id, key)
}

public fun add_rule<K: copy + drop + store, V: store>(
    config: &mut ExtensionConfig,
    _: &AdminCap,
    key: K,
    value: V,
) {
    df::add(&mut config.id, key, value);
}

/// Insert-or-overwrite a rule. If a value already exists for the key, it is removed and dropped.
public fun set_rule<K: copy + drop + store, V: store + drop>(
    config: &mut ExtensionConfig,
    _: &AdminCap,
    key: K,
    value: V,
) {
    if (df::exists_(&config.id, copy key)) {
        let _old: V = df::remove(&mut config.id, copy key);
    };
    df::add(&mut config.id, key, value);
}

public fun remove_rule<K: copy + drop + store, V: store>(
    config: &mut ExtensionConfig,
    _: &AdminCap,
    key: K,
): V {
    df::remove(&mut config.id, key)
}

/// Mint a `CourierAuth` witness. Restricted to this package.
public(package) fun courier_auth(): CourierAuth {
    CourierAuth {}
}

// === Package-level UID accessors ===
// These let other modules in this package use dynamic fields directly
// (without requiring AdminCap for every operation).

public(package) fun uid(config: &ExtensionConfig): &UID {
    &config.id
}

public(package) fun uid_mut(config: &mut ExtensionConfig): &mut UID {
    &mut config.id
}

// === Test helpers ===

#[test_only]
public fun create_for_testing(ctx: &mut TxContext): (ExtensionConfig, AdminCap) {
    let config = ExtensionConfig { id: object::new(ctx) };
    let admin_cap = AdminCap { id: object::new(ctx) };
    (config, admin_cap)
}

#[test_only]
public fun destroy_for_testing(config: ExtensionConfig, admin_cap: AdminCap) {
    let ExtensionConfig { id } = config;
    object::delete(id);
    let AdminCap { id } = admin_cap;
    object::delete(id);
}
