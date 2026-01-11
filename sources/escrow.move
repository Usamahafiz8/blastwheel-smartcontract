// module blastwheelz_nft_smart_contract::escrow {
//     use sui::object::{UID, ID};
//     use sui::transfer;
//     use sui::tx_context::TxContext;
//     use sui::dynamic_object_field as dof;
//     use sui::event;

//     // === Error codes ===

//     /// The `sender` and `recipient` of the two escrowed objects do not match
//     const EMismatchedSenderRecipient: u64 = 0;

//     /// The `exchange_for` fields of the two escrowed objects do not match
//     const EMismatchedExchangeObject: u64 = 1;

//     /// A locked object that cannot be modified without the corresponding Key
//     public struct Locked<T: store + key> has key, store {
//         id: UID,
//         locked_item: T,
//     }

//     /// A key that can unlock a Locked object. Must be consumed to unlock.
//     public struct Key<phantom T: store + key> has key, store {
//         id: UID,
//         locked_id: ID,
//     }

//     /// The `name` of the DOF that holds the Escrowed object.
//     /// Allows easy discoverability for the escrowed object.
//     public struct EscrowedObjectKey has copy, drop, store {}

//     /// An object held in escrow
//     ///
//     /// The escrowed object is added as a Dynamic Object Field so it can still be looked-up.
//     public struct Escrow<phantom T: key + store> has key, store {
//         id: UID,
//         /// Owner of `escrowed`
//         sender: address,
//         /// Intended recipient
//         recipient: address,
//         /// ID of the key that opens the lock on the object sender wants from
//         /// recipient.
//         exchange_key: ID,
//     }

//     // === Events ===

//     public struct EscrowCreated has copy, drop {
//         /// the ID of the escrow that was created
//         escrow_id: ID,
//         /// The ID of the `Key` that unlocks the requested object.
//         key_id: ID,
//         /// The id of the sender who'll receive `T` upon swap
//         sender: address,
//         /// The (original) recipient of the escrowed object
//         recipient: address,
//         /// The ID of the escrowed item
//         item_id: ID,
//     }

//     public struct EscrowSwapped has copy, drop {
//         escrow_id: ID,
//     }

//     public struct EscrowCancelled has copy, drop {
//         escrow_id: ID,
//     }

//     // === Public Functions ===

//     /// Lock an object, producing a Locked object and a Key
//     /// The Locked object can be transferred, but cannot be modified without the Key
//     public fun lock<T: store + key>(
//         item: T,
//         ctx: &mut TxContext
//     ): (Locked<T>, Key<T>) {
//         let locked = Locked {
//             id: sui::object::new(ctx),
//             locked_item: item,
//         };
        
//         let locked_id = sui::object::id(&locked);
        
//         let key = Key {
//             id: sui::object::new(ctx),
//             locked_id,
//         };
        
//         (locked, key)
//     }

//     /// Unlock a Locked object using its Key
//     /// The Key is consumed in the process
//     public fun unlock<T: store + key>(
//         locked: Locked<T>,
//         key: Key<T>,
//     ): T {
//         let locked_id = sui::object::id(&locked);
//         let Key { id: key_id, locked_id: key_locked_id } = key;
        
//         assert!(locked_id == key_locked_id, EMismatchedExchangeObject);
//         sui::object::delete(key_id);
        
//         let Locked { id, locked_item } = locked;
//         sui::object::delete(id);
        
//         locked_item
//     }

//     /// Create a new escrow and immediately share it
//     /// The escrowed object is stored as a dynamic object field
//     public fun create<T: key + store>(
//         escrowed: T,
//         exchange_key: ID,
//         recipient: address,
//         ctx: &mut TxContext,
//     ) {
//         let mut escrow = Escrow<T> {
//             id: sui::object::new(ctx),
//             sender: sui::tx_context::sender(ctx),
//             recipient,
//             exchange_key,
//         };

//         event::emit(EscrowCreated {
//             escrow_id: sui::object::id(&escrow),
//             key_id: exchange_key,
//             sender: escrow.sender,
//             recipient,
//             item_id: sui::object::id(&escrowed),
//         });

//         dof::add(&mut escrow.id, EscrowedObjectKey {}, escrowed);

//         transfer::public_share_object(escrow);
//     }

//     /// The `recipient` of the escrow can exchange `obj` with the escrowed item
//     public fun swap<T: key + store, U: key + store>(
//         mut escrow: Escrow<T>,
//         key: Key<U>,
//         locked: Locked<U>,
//         ctx: &TxContext,
//     ): T {
//         let escrowed = dof::remove<EscrowedObjectKey, T>(&mut escrow.id, EscrowedObjectKey {});

//         let Escrow {
//             id,
//             sender,
//             recipient,
//             exchange_key,
//         } = escrow;

//         assert!(recipient == sui::tx_context::sender(ctx), EMismatchedSenderRecipient);
//         assert!(exchange_key == sui::object::id(&key), EMismatchedExchangeObject);

//         // Do the actual swap
//         transfer::public_transfer(unlock(locked, key), sender);

//         event::emit(EscrowSwapped {
//             escrow_id: id.to_inner(),
//         });

//         sui::object::delete(id);

//         escrowed
//     }

//     /// The `creator` can cancel the escrow and get back the escrowed item
//     public fun return_to_sender<T: key + store>(mut escrow: Escrow<T>, ctx: &TxContext): T {
//         event::emit(EscrowCancelled {
//             escrow_id: sui::object::id(&escrow),
//         });

//         let escrowed = dof::remove<EscrowedObjectKey, T>(&mut escrow.id, EscrowedObjectKey {});

//         let Escrow {
//             id,
//             sender,
//             recipient: _,
//             exchange_key: _,
//         } = escrow;

//         assert!(sender == sui::tx_context::sender(ctx), EMismatchedSenderRecipient);
//         sui::object::delete(id);
//         escrowed
//     }

//     /// Get the sender address from an escrow
//     public fun sender<T: key + store>(escrow: &Escrow<T>): address {
//         escrow.sender
//     }

//     /// Get the recipient address from an escrow
//     public fun recipient<T: key + store>(escrow: &Escrow<T>): address {
//         escrow.recipient
//     }

//     /// Get the exchange key ID from an escrow
//     public fun exchange_key<T: key + store>(escrow: &Escrow<T>): ID {
//         escrow.exchange_key
//     }

//     /// Check if the escrow has an escrowed object
//     public fun has_escrowed_object<T: key + store>(escrow: &Escrow<T>): bool {
//         dof::exists_(&escrow.id, EscrowedObjectKey {})
//     }

//     /// Transfer a Locked object
//     public fun transfer_locked<T: store + key>(
//         locked: Locked<T>,
//         recipient: address,
//     ) {
//         transfer::public_transfer(locked, recipient);
//     }

//     /// Transfer a Key
//     public fun transfer_key<T: store + key>(
//         key: Key<T>,
//         recipient: address,
//     ) {
//         transfer::public_transfer(key, recipient);
//     }
// }
