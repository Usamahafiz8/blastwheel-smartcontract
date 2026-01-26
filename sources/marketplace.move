module blastwheelz_nft_smart_contract::marketplace {
    use sui::transfer;
    use sui::tx_context;
    use sui::event;
    use sui::coin;
    use sui::sui::SUI;
    use sui::dynamic_object_field as dof;
    use sui::object;
    use blastwheelz_nft_smart_contract::cars::Car;

    // === Error codes ===
    const EInsufficientPayment: u64 = 0;
    const EExcessPayment: u64 = 1;
    const EUnauthorizedCancel: u64 = 2;
    const EInvalidPrice: u64 = 3;

    // === Structs ===

    /// A listing for an NFT on the marketplace
    public struct Listing<phantom T> has key, store {
        id: object::UID,
        /// The NFT being sold (stored as dynamic object field internally)
        nft_id: object::ID,
        /// Address of the seller
        seller: address,
        /// Price in SUI
        price: u64,
        /// Timestamp when listing was created
        created_at: u64,
    }

    /// Represents a shared listing board for a car type
    /// Tracks marketplace statistics
    public struct ListingBoard<phantom T> has key, store {
        id: object::UID,
        /// Total number of completed sales
        completed_sales: u64,
        /// Total sales volume in SUI
        total_volume: u64,
    }

    // === Events ===

    /// Emitted when an NFT is listed for sale
    public struct ListingCreated has copy, drop {
        listing_id: object::ID,
        nft_id: object::ID,
        seller: address,
        price: u64,
        timestamp: u64,
    }

    /// Emitted when an NFT is purchased
    public struct PurchaseCompleted has copy, drop {
        listing_id: object::ID,
        nft_id: object::ID,
        seller: address,
        buyer: address,
        price: u64,
        timestamp: u64,
    }

    /// Emitted when a listing is cancelled
    public struct ListingCancelled has copy, drop {
        listing_id: object::ID,
        nft_id: object::ID,
        seller: address,
        timestamp: u64,
    }

    // === Listing Functions ===

    /// List an NFT for sale on the marketplace
    /// The NFT is transferred to the listing and held in escrow
    public fun list_nft<T>(
        car: Car<T>,
        price: u64,
        ctx: &mut tx_context::TxContext
    ): object::ID {
        assert!(price > 0, EInvalidPrice);
        
        let nft_id = object::id(&car);
        let seller = tx_context::sender(ctx);
        let created_at = tx_context::epoch_timestamp_ms(ctx);
        
        let mut listing = Listing<T> {
            id: object::new(ctx),
            nft_id,
            seller,
            price,
            created_at,
        };

        let listing_id = object::id(&listing);

        event::emit(ListingCreated {
            listing_id,
            nft_id,
            seller,
            price,
            timestamp: created_at,
        });

        // Store the NFT in a dynamic object field within the listing
        dof::add(&mut listing.id, NFTKey {}, car);

        // Share the listing object so anyone can view and purchase
        transfer::public_share_object(listing);

        listing_id
    }

    /// Purchase an NFT from a listing
    /// Requires exact payment in SUI
    #[allow(lint(self_transfer))]
    public fun buy_nft<T>(
        mut listing: Listing<T>,
        payment: coin::Coin<SUI>,
        ctx: &mut tx_context::TxContext
    ) {
        let buyer = tx_context::sender(ctx);
        let purchase_timestamp = tx_context::epoch_timestamp_ms(ctx);

        // Validate payment
        assert!(coin::value(&payment) >= listing.price, EInsufficientPayment);
        assert!(coin::value(&payment) == listing.price, EExcessPayment);

        // Extract the NFT from the listing
        let car: Car<T> = dof::remove(&mut listing.id, NFTKey {});
        
        let listing_id = object::id(&listing);
        let nft_id = listing.nft_id;
        let seller = listing.seller;

        // Emit purchase event
        event::emit(PurchaseCompleted {
            listing_id,
            nft_id,
            seller,
            buyer,
            price: listing.price,
            timestamp: purchase_timestamp,
        });

        // Transfer payment to seller
        transfer::public_transfer(payment, seller);

        // Transfer NFT to buyer
        transfer::public_transfer(car, buyer);

        // Delete the listing
        let Listing { id, nft_id: _, seller: _, price: _, created_at: _ } = listing;
        object::delete(id);
    }

    /// Cancel a listing and return the NFT to the seller
    /// Only the seller can cancel their own listing
    public fun cancel_listing<T>(
        mut listing: Listing<T>,
        ctx: &mut tx_context::TxContext
    ): Car<T> {
        let sender = tx_context::sender(ctx);
        assert!(sender == listing.seller, EUnauthorizedCancel);

        let cancel_timestamp = tx_context::epoch_timestamp_ms(ctx);

        // Extract the NFT from the listing
        let car: Car<T> = dof::remove(&mut listing.id, NFTKey {});

        let listing_id = object::id(&listing);
        let nft_id = listing.nft_id;

        // Emit cancellation event
        event::emit(ListingCancelled {
            listing_id,
            nft_id,
            seller: listing.seller,
            timestamp: cancel_timestamp,
        });

        // Delete the listing
        let Listing { id, nft_id: _, seller: _, price: _, created_at: _ } = listing;
        object::delete(id);

        // Return the NFT to the seller
        car
    }

    // === Query Functions ===

    /// Get the price of a listing
    public fun listing_price<T>(listing: &Listing<T>): u64 {
        listing.price
    }

    /// Get the seller of a listing
    public fun listing_seller<T>(listing: &Listing<T>): address {
        listing.seller
    }

    /// Get the NFT ID from a listing
    public fun listing_nft_id<T>(listing: &Listing<T>): object::ID {
        listing.nft_id
    }

    /// Get the creation timestamp of a listing
    public fun listing_created_at<T>(listing: &Listing<T>): u64 {
        listing.created_at
    }

    // === ListingBoard Functions ===

    /// Create a new listing board for a car type
    /// Typically called during package initialization or by admin
    public fun create_listing_board<T>(
        ctx: &mut TxContext
    ) {
        let board = ListingBoard<T> {
            id: object::new(ctx),
            completed_sales: 0,
            total_volume: 0,
        };
        
        transfer::public_share_object(board);
    }

    /// Get completed sales count from the board
    public fun get_completed_sales<T>(board: &ListingBoard<T>): u64 {
        board.completed_sales
    }

    /// Get total sales volume from the board
    public fun get_total_volume<T>(board: &ListingBoard<T>): u64 {
        board.total_volume
    }

    // === Internal Key Struct ===
    /// Used as a key for dynamic object field storage
    public struct NFTKey has copy, drop, store {}
}
