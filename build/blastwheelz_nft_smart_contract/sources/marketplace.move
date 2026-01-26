module blastwheelz_nft_smart_contract::marketplace {
    use blastwheelz_nft_smart_contract::cars::Car;
    use sui::coin;
    use sui::coin::Coin;
    use sui::dynamic_object_field as dof;
    use sui::event;
    use sui::object;
    use sui::object::ID;
    use sui::object::UID;
    use sui::sui::SUI;
    use sui::tx_context::TxContext;
    use sui::transfer;

    #[error]
    const EPriceZero: u64 = 0;
    #[error]
    const EAlreadyListed: u64 = 1;
    #[error]
    const EUnauthorized: u64 = 2;
    #[error]
    const EIncorrectPayment: u64 = 3;
    #[error]
    const EMismatchedLock: u64 = 4;

    public struct Market has key, store {
        id: UID,
        owner: address,
    }

    public struct Locked<T: key + store> has key, store {
        id: UID,
        locked_item: T,
    }

    public struct Key<T: key + store> has key, store {
        id: UID,
        locked_id: ID,
    }

    public struct ListingKey has copy, drop, store {
        id: ID,
    }

    public struct Listing<phantom T> has key, store {
        id: UID,
        seller: address,
        price: u64,
        car_id: ID,
        locked_car: Locked<Car<T>>,
        key: Key<Car<T>>,
    }

    public struct ListingCreated<phantom T> has copy, drop {
        listing_id: ID,
        car_id: ID,
        seller: address,
        price: u64,
    }

    public struct ListingSold<phantom T> has copy, drop {
        listing_id: ID,
        car_id: ID,
        buyer: address,
        price: u64,
    }

    public struct ListingCancelled<phantom T> has copy, drop {
        listing_id: ID,
        car_id: ID,
        seller: address,
    }

    public fun new_market(ctx: &mut TxContext): Market {
        Market {
            id: object::new(ctx),
            owner: ctx.sender(),
        }
    }

    public entry fun init_market(ctx: &mut TxContext) {
        let market = new_market(ctx);
        transfer::public_share_object(market);
    }

    public fun lock<T: key + store>(item: T, ctx: &mut TxContext): (Locked<T>, Key<T>) {
        let locked = Locked {
            id: object::new(ctx),
            locked_item: item,
        };
        let locked_id = object::id(&locked);
        let key = Key {
            id: object::new(ctx),
            locked_id,
        };

        (locked, key)
    }

    public fun unlock<T: key + store>(locked: Locked<T>, key: Key<T>): T {
        let locked_id = object::id(&locked);
        let Key { id: key_id, locked_id: key_locked_id } = key;
        assert!(locked_id == key_locked_id, EMismatchedLock);

        key_id.delete();
        let Locked { id, locked_item } = locked;
        id.delete();

        locked_item
    }

    public fun listing_exists<T>(market: &Market, car_id: ID): bool {
        dof::exists_with_type<ListingKey, Listing<T>>(&market.id, ListingKey { id: car_id })
    }

    public fun listing_price<T>(market: &Market, car_id: ID): u64 {
        let listing = dof::borrow<ListingKey, Listing<T>>(&market.id, ListingKey { id: car_id });
        listing.price
    }

    public fun listing_seller<T>(market: &Market, car_id: ID): address {
        let listing = dof::borrow<ListingKey, Listing<T>>(&market.id, ListingKey { id: car_id });
        listing.seller
    }

    public fun owner(market: &Market): address {
        market.owner
    }

    public fun list<T>(
        market: &mut Market,
        car: Car<T>,
        price: u64,
        ctx: &mut TxContext,
    ) {
        assert!(price > 0, EPriceZero);
        let car_id = object::id(&car);
        assert!(
            !dof::exists_with_type<ListingKey, Listing<T>>(&market.id, ListingKey { id: car_id }),
            EAlreadyListed
        );

        let (locked_car, key) = lock(car, ctx);
        let seller = ctx.sender();
        let listing = Listing<T> {
            id: object::new(ctx),
            seller,
            price,
            car_id,
            locked_car,
            key,
        };

        let listing_id = object::id(&listing);
        dof::add(&mut market.id, ListingKey { id: car_id }, listing);

        event::emit(ListingCreated<T> {
            listing_id,
            car_id,
            seller,
            price,
        });
    }

    public fun delist<T>(
        market: &mut Market,
        car_id: ID,
        ctx: &mut TxContext,
    ) {
        let listing = dof::remove<ListingKey, Listing<T>>(&mut market.id, ListingKey { id: car_id });
        let listing_id = object::id(&listing);
        let Listing { id: listing_uid, seller, locked_car, key, car_id: stored_car_id, price: _, } = listing;
        object::delete(listing_uid);

        assert!(seller == ctx.sender(), EUnauthorized);

        let car = unlock(locked_car, key);
        transfer::public_transfer(car, seller);

        event::emit(ListingCancelled<T> {
            listing_id,
            car_id: stored_car_id,
            seller,
        });
    }

    public fun buy<T>(
        market: &mut Market,
        car_id: ID,
        payment: Coin<SUI>,
        ctx: &mut TxContext,
    ) {
        let listing = dof::remove<ListingKey, Listing<T>>(&mut market.id, ListingKey { id: car_id });
        let listing_id = object::id(&listing);
        let Listing { id: listing_uid, seller, price, locked_car, key, car_id: stored_car_id } = listing;
        object::delete(listing_uid);

        assert!(coin::value(&payment) == price, EIncorrectPayment);

        let car = unlock(locked_car, key);
        transfer::public_transfer(car, ctx.sender());
        transfer::public_transfer(payment, seller);

        event::emit(ListingSold<T> {
            listing_id,
            car_id: stored_car_id,
            buyer: ctx.sender(),
            price,
        });
    }

}

