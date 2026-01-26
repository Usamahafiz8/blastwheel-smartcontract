# BlastWheelz NFT Marketplace - Complete Working Guide

## Table of Contents
1. [Overview](#overview)
2. [The 3 Core Operations](#the-3-core-operations)
3. [Real-World Scenarios](#real-world-scenarios)
4. [Transaction Flow](#transaction-flow)
5. [Data Structures](#data-structures)
6. [Error Handling](#error-handling)
7. [Security Guarantees](#security-guarantees)
8. [Deployment Steps](#deployment-steps)
9. [Frontend Integration](#frontend-integration)
10. [Testing Guide](#testing-guide)

---

## Overview

The BlastWheelz NFT Marketplace is a smart contract that enables peer-to-peer trading of Car NFTs on the Sui blockchain.

**What it does:**
- Users can list their Car NFTs for sale at any price
- Buyers can purchase any listed NFT with exact payment
- Sellers can cancel their listings and get their NFTs back

**How it works:**
- NFTs are held in escrow (contract storage) while listed
- Transactions are atomic (payment and NFT transfer together)
- All actions emit events for tracking and auditing

---

## The 3 Core Operations

### Operation 1: LIST_NFT - Sell Your NFT

**Purpose:** Put your Car NFT up for sale on the marketplace

**Function Signature:**
```move
public fun list_nft<T>(
    car: Car<T>,
    price: u64,
    ctx: &mut tx_context::TxContext
): object::ID
```

**Parameters:**
- `car`: Your Car<T> NFT object (the one you want to sell)
- `price`: Price in nanoSUI (1 SUI = 1,000,000,000 nanoSUI)
- `ctx`: Transaction context (auto-filled by system)

**Returns:** Listing ID (unique identifier for tracking)

**Step-by-Step Process:**

```
Step 1: Validation
  ✓ Check: Is price > 0? (prevents free listings)
  ✓ Check: Do you own the NFT? (Move prevents you from using someone else's)
  ✓ Check: Is NFT valid Car<T> type? (type system ensures)

Step 2: Create Listing Object
  Create object with:
    - id: unique listing ID
    - nft_id: which NFT this is
    - seller: your address
    - price: the asking price
    - created_at: timestamp

Step 3: Secure NFT in Escrow
  - Move NFT into listing using dynamic object field
  - NFT cannot be accessed or transferred without contract approval
  - NFT is safe and cannot be lost

Step 4: Make Listing Public
  - Mark listing as "shared object"
  - Everyone can see it
  - Everyone can call buy_nft on it
  - Only you can call cancel_listing on it

Step 5: Emit Event
  Event contains:
    - listing_id: for tracking
    - nft_id: which NFT
    - seller: who's selling
    - price: asking price
    - timestamp: when listed

Step 6: Return to Caller
  - Return listing_id so caller knows the listing was created
```

**Example Usage (TypeScript):**
```typescript
const carNFT = myWallet.objects.find(obj => obj.type.includes('Car<HeBoomanator>'));
const priceInNanoSUI = 1_000_000_000; // 1 SUI

const txb = new TransactionBlock();
txb.moveCall({
  target: `${PACKAGE_ID}::marketplace::list_nft`,
  typeArguments: [`${PACKAGE_ID}::cars::HeBoomanator`],
  arguments: [
    txb.object(carNFT.objectId),
    txb.pure.u64(priceInNanoSUI),
  ],
});

const result = await client.signAndExecuteTransactionBlock({
  transactionBlock: txb,
  signer: keypair,
});

console.log('Listing created:', result.events[0].parsedJson.listing_id);
```

**What Happens After:**
- ✅ Your NFT is locked in the listing
- ✅ Listing is visible on marketplace
- ✅ Buyers can see it
- ✅ You can still cancel anytime
- ✅ You cannot manually transfer it (contract has it)

---

### Operation 2: BUY_NFT - Purchase Listed NFT

**Purpose:** Buy an NFT from an active listing

**Function Signature:**
```move
public fun buy_nft<T>(
    mut listing: Listing<T>,
    payment: coin::Coin<SUI>,
    ctx: &mut tx_context::TxContext
)
```

**Parameters:**
- `listing`: The Listing object to purchase from
- `payment`: SUI coin with exact payment amount
- `ctx`: Transaction context

**Returns:** None (NFT and SUI transferred automatically)

**Step-by-Step Process:**

```
Step 1: Get Buyer Info
  - Extract buyer address from tx_context (automatically)
  - Record purchase timestamp

Step 2: Validate Payment
  Check 1: Is payment >= asking price?
    If NO → Abort with EInsufficientPayment
    Example: Listing price is 1 SUI, payment is 0.5 SUI → FAIL
  
  Check 2: Is payment == asking price? (exactly)
    If NO → Abort with EExcessPayment
    Example: Listing price is 1 SUI, payment is 1.5 SUI → FAIL
    Example: Listing price is 1 SUI, payment is 1 SUI → SUCCESS

Step 3: Extract NFT from Escrow
  - Remove NFT from listing's dynamic object field
  - NFT is no longer locked
  - NFT is now ready to transfer

Step 4: Create Purchase Event
  Event contains:
    - listing_id: which listing
    - nft_id: which NFT
    - seller: who got paid
    - buyer: you
    - price: how much paid
    - timestamp: when purchased

Step 5: Execute Transfers (Atomic)
  Transfer 1: SUI coin → seller's address
    (Seller immediately has the payment)
  
  Transfer 2: NFT → buyer's address
    (Buyer immediately has the NFT)
  
  IMPORTANT: Both happen or neither happens
  If one fails, entire transaction reverts

Step 6: Delete Listing
  - Remove listing object from blockchain
  - Cannot be purchased again
  - Frees up storage
  - Makes marketplace clean
```

**Example Usage (TypeScript):**
```typescript
const listing = await client.getObject({ id: listingId });
const priceInNanoSUI = 1_000_000_000; // Must match listing price exactly

const txb = new TransactionBlock();

// Split payment from gas coin
const [coin] = txb.splitCoins(txb.gas, [txb.pure.u64(priceInNanoSUI)]);

txb.moveCall({
  target: `${PACKAGE_ID}::marketplace::buy_nft`,
  typeArguments: [`${PACKAGE_ID}::cars::HeBoomanator`],
  arguments: [
    txb.object(listing.objectId),
    coin,
  ],
});

const result = await client.signAndExecuteTransactionBlock({
  transactionBlock: txb,
  signer: keypair,
});

console.log('Purchase successful!', result.events[0].parsedJson);
```

**What Happens After:**
- ✅ You now own the NFT (in your wallet)
- ✅ Seller received the SUI payment
- ✅ Listing is deleted from marketplace
- ✅ You can immediately relist the NFT at a higher price (secondary market)

**Error Cases:**

```
Case 1: Insufficient Payment
  Seller: List for 1 SUI
  Buyer: Sends 0.5 SUI
  Result: ❌ ERROR - InsufficientPayment
  Effect: Transaction aborts, nothing changes
  
Case 2: Excess Payment
  Seller: List for 1 SUI
  Buyer: Sends 1.5 SUI
  Result: ❌ ERROR - ExcessPayment
  Effect: Transaction aborts, nothing changes
  
Case 3: Correct Payment
  Seller: List for 1 SUI
  Buyer: Sends 1 SUI
  Result: ✅ SUCCESS
  Effect: NFT and payment transfer complete
  
Case 4: Listing Already Sold
  Listing: Already deleted from previous purchase
  Buyer: Tries to buy
  Result: ❌ ERROR - Object not found
  Effect: Transaction aborts before reaching buy_nft
```

---

### Operation 3: CANCEL_LISTING - Withdraw from Sale

**Purpose:** Cancel your listing and get your NFT back

**Function Signature:**
```move
public fun cancel_listing<T>(
    mut listing: Listing<T>,
    ctx: &mut tx_context::TxContext
): Car<T>
```

**Parameters:**
- `listing`: Your listing to cancel
- `ctx`: Transaction context

**Returns:** Your Car<T> NFT (back in your possession)

**Step-by-Step Process:**

```
Step 1: Get Sender Info
  - Extract your address from tx_context

Step 2: Authorize Cancellation
  Check: Are you the seller?
    If NO → Abort with EUnauthorizedCancel
    (Only the seller can cancel their own listing)
    (No admin can force cancellation)
  If YES → Continue

Step 3: Record Cancellation Time
  - Capture timestamp of cancellation

Step 4: Extract NFT from Escrow
  - Remove NFT from listing's storage
  - NFT becomes available for transfer

Step 5: Create Cancellation Event
  Event contains:
    - listing_id: which listing
    - nft_id: which NFT
    - seller: who cancelled
    - timestamp: when cancelled

Step 6: Delete Listing
  - Remove listing object
  - No longer visible on marketplace
  - Cannot be purchased by anyone
  - Frees blockchain storage

Step 7: Return NFT
  - Return the NFT object to caller
  - Caller must then transfer it to themselves
  - Or can relist immediately at different price
```

**Example Usage (TypeScript):**
```typescript
const listing = await client.getObject({ id: listingId });

const txb = new TransactionBlock();

txb.moveCall({
  target: `${PACKAGE_ID}::marketplace::cancel_listing`,
  typeArguments: [`${PACKAGE_ID}::cars::HeBoomanator`],
  arguments: [
    txb.object(listing.objectId),
  ],
});

// Transfer NFT back to seller
txb.moveCall({
  target: '0x2::transfer::public_transfer',
  arguments: [
    txb.lastReturnValue(),
    txb.pure.address(myAddress),
  ],
});

const result = await client.signAndExecuteTransactionBlock({
  transactionBlock: txb,
  signer: keypair,
});

console.log('Listing cancelled:', result.events[0].parsedJson);
```

**What Happens After:**
- ✅ You have your NFT back in wallet
- ✅ Listing is removed from marketplace
- ✅ You can relist at different price immediately
- ✅ No one else can access the listing

**Error Cases:**

```
Case 1: Wrong User Tries to Cancel
  Seller A: Lists NFT
  Seller B: Tries to cancel Seller A's listing
  Result: ❌ ERROR - UnauthorizedCancel
  Effect: Transaction aborts, listing stays active
  
Case 2: Owner Cancels
  Seller A: Lists NFT
  Seller A: Calls cancel_listing
  Result: ✅ SUCCESS
  Effect: NFT returned, listing deleted
```

---

## Real-World Scenarios

### Scenario 1: Basic Buy/Sell

**Timeline:**

```
Day 1 - 10:00 AM
├─ User A mints Car NFT "HeBoomanator #1" from admin
├─ User A decides to sell for 1 SUI
└─ User A calls list_nft(nft, 1_000_000_000)
   └─ Listing created: 0xListing_A
      ├─ seller: User A
      ├─ price: 1 SUI
      └─ nft_id: HeBoomanator #1

Day 1 - 2:00 PM
├─ User B browses marketplace
├─ User B sees: "HeBoomanator #1" for 1 SUI (User A)
├─ User B has 5 SUI in wallet
└─ User B calls buy_nft(0xListing_A, 1_SUI)
   └─ Contract executes:
      ├─ Validates: Payment == 1 SUI ✓
      ├─ Transfers: 1 SUI → User A wallet
      ├─ Transfers: HeBoomanator #1 NFT → User B wallet
      └─ Deletes: 0xListing_A

Results:
  User A: 
    ├─ Before: 0 SUI, 1 HeBoomanator NFT
    └─ After: 1 SUI, 0 NFT
  
  User B:
    ├─ Before: 5 SUI, 0 NFTs
    └─ After: 4 SUI, 1 HeBoomanator NFT
  
  Marketplace:
    ├─ Listings: 0 (was deleted)
    └─ Volume: 1 SUI
```

---

### Scenario 2: Secondary Market

**Timeline:**

```
Day 1
├─ User A lists HeBoomanator for 1 SUI
└─ User B buys for 1 SUI
   └─ User A: +1 SUI
   └─ User B: +1 NFT

Day 2
├─ User B (now NFT owner) decides to resell
├─ User B sees market demand is high
├─ User B wants to profit, lists for 2 SUI
└─ User B calls list_nft(nft, 2_000_000_000)
   └─ New listing created: 0xListing_B
      ├─ seller: User B
      ├─ price: 2 SUI
      └─ nft_id: HeBoomanator #1

Day 3
├─ User C sees: "HeBoomanator #1" for 2 SUI (User B)
├─ User C pays 2 SUI
└─ User C calls buy_nft(0xListing_B, 2_SUI)
   └─ Contract executes:
      ├─ Transfers: 2 SUI → User B wallet
      ├─ Transfers: HeBoomanator #1 NFT → User C wallet
      └─ Deletes: 0xListing_B

Results:
  User A:
    ├─ Day 1: Listed, sold
    ├─ Day 3: Earned 1 SUI (original sale)
    └─ Total: +1 SUI
  
  User B:
    ├─ Day 1: Bought for 1 SUI
    ├─ Day 2: Listed for 2 SUI
    ├─ Day 3: Sold for 2 SUI
    └─ Total: +1 SUI profit (2-1)
  
  User C:
    ├─ Day 3: Bought for 2 SUI
    └─ Total: -2 SUI (owns NFT)
  
  Marketplace:
    ├─ Total Volume: 3 SUI (1+2)
    └─ Listings: 0
```

---

### Scenario 3: Price Negotiation (Multiple Listings)

**Timeline:**

```
Multiple sellers, same car type:

Marketplace Snapshot:
├─ Listing #1: HeBoomanator #2 @ 0.8 SUI (User D)
├─ Listing #2: HeBoomanator #3 @ 1.0 SUI (User E)  ← FLOOR PRICE
├─ Listing #3: HeBoomanator #4 @ 1.2 SUI (User F)
└─ Listing #4: HeBoomanator #5 @ 1.5 SUI (User G)

Buyer Action:
├─ User H sees marketplace
├─ User H identifies floor price: 0.8 SUI (Listing #1)
├─ User H buys from User D at 0.8 SUI
└─ Listing #1 deleted

Price Update:
├─ New floor price: 1.0 SUI (User E)
├─ Market stabilizes around 1.0-1.2 SUI
└─ Listings adjust based on supply/demand

Natural Market:
  ✓ Cheap listings sell first (0.8 SUI gone)
  ✓ Expensive listings wait longer
  ✓ Sellers compete on price
  ✓ Buyers get best deals
  ✓ Market finds equilibrium
```

---

## Transaction Flow

### Complete Buy Transaction

```
┌─────────────────────────────────────────────────┐
│  BUYER INITIATES PURCHASE                       │
└─────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────┐
│  1. GATHER INPUTS                               │
│     ├─ Find listing object                      │
│     ├─ Get payment amount from listing          │
│     ├─ Prepare SUI coins for payment            │
│     └─ Get transaction context                  │
└─────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────┐
│  2. CREATE TRANSACTION BLOCK                    │
│     ├─ Initialize TransactionBlock              │
│     ├─ Add buy_nft call                         │
│     ├─ Reference listing object                 │
│     └─ Reference payment coin                   │
└─────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────┐
│  3. SEND TO BLOCKCHAIN                          │
│     ├─ Sign with private key                    │
│     ├─ Submit to RPC endpoint                   │
│     └─ Get transaction digest                   │
└─────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────┐
│  4. BLOCKCHAIN EXECUTES                         │
│     ├─ Extract buyer address                    │
│     ├─ Validate payment >= price                │
│     ├─ Validate payment == price (exactly)      │
│     └─ If validation fails → ABORT              │
└─────────────────────────────────────────────────┘
           ↓ (if validation passed)
┌─────────────────────────────────────────────────┐
│  5. EXTRACT NFT                                 │
│     ├─ Access listing object                    │
│     ├─ Remove NFT from dynamic object field     │
│     ├─ NFT now transferable                     │
│     └─ Continue...                              │
└─────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────┐
│  6. EMIT EVENT                                  │
│     └─ PurchaseCompleted {                      │
│          listing_id,                            │
│          nft_id,                                │
│          seller,                                │
│          buyer,                                 │
│          price,                                 │
│          timestamp                              │
│        }                                        │
└─────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────┐
│  7. TRANSFER PAYMENT                            │
│     ├─ Transfer SUI coin                        │
│     └─ To seller's address                      │
└─────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────┐
│  8. TRANSFER NFT                                │
│     ├─ Transfer Car<T> NFT                      │
│     └─ To buyer's address                       │
└─────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────┐
│  9. DELETE LISTING                              │
│     ├─ Remove listing object                    │
│     ├─ Free blockchain storage                  │
│     └─ Prevent duplicate purchases              │
└─────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────┐
│  10. TRANSACTION COMPLETE                       │
│      ├─ Buyer: Now owns NFT                     │
│      ├─ Seller: Received payment                │
│      ├─ Listing: Deleted                        │
│      └─ Event: Recorded on chain                │
└─────────────────────────────────────────────────┘
```

---

## Data Structures

### Listing<T> Object

```move
public struct Listing<phantom T> has key, store {
    id: object::UID,           // Unique blockchain identifier
    nft_id: object::ID,        // ID of the Car NFT being sold
    seller: address,           // Seller's wallet address
    price: u64,                // Price in nanoSUI
    created_at: u64,           // Timestamp of listing creation
}
```

**What it contains:**
- `id`: Unique identifier (auto-generated by blockchain)
- `nft_id`: Tracks which NFT this listing represents
- `seller`: For authorization checks (only seller can cancel)
- `price`: What buyer must pay (exact amount required)
- `created_at`: For marketplace analytics and sorting

**Where is the NFT?**
- Not directly in Listing struct
- Stored in dynamic object field with key: NFTKey {}
- Secure escrow inside the listing object
- Only contract can access it

**Example Listing Object on Blockchain:**
```json
{
  "objectId": "0xListing_ABC123",
  "type": "0xPackage::marketplace::Listing<0xPackage::cars::HeBoomanator>",
  "owner": "Shared",
  "fields": {
    "id": "0xListing_ABC123",
    "nft_id": "0xNFT_789XYZ",
    "seller": "0xUser_A_Address",
    "price": "1000000000",
    "created_at": "1705000000000"
  },
  "dynamicObjectFields": [
    {
      "key": "NFTKey {}",
      "value": {
        "type": "0xPackage::cars::Car<HeBoomanator>",
        "objectId": "0xNFT_789XYZ",
        "fields": {
          "id": "0xNFT_789XYZ",
          "mint_number": "1"
        }
      }
    }
  ]
}
```

### ListingBoard<T> Object (Optional Statistics)

```move
public struct ListingBoard<phantom T> has key, store {
    id: object::UID,           // Unique identifier
    completed_sales: u64,      // Total sales for this car type
    total_volume: u64,         // Total SUI volume for this car type
}
```

**Purpose:**
- Track marketplace statistics per car type
- Enable volume/sales queries
- Used for analytics and dashboards

**Example Statistics:**
```
ListingBoard<HeBoomanator>:
  ├─ completed_sales: 42
  ├─ total_volume: 55_000_000_000 (55 SUI)
  └─ average_price: 1.31 SUI per sale

ListingBoard<SuipremeSupra>:
  ├─ completed_sales: 18
  ├─ total_volume: 12_000_000_000 (12 SUI)
  └─ average_price: 0.67 SUI per sale
```

### Event Structures

**ListingCreated Event:**
```move
public struct ListingCreated has copy, drop {
    listing_id: object::ID,    // Which listing
    nft_id: object::ID,        // Which NFT
    seller: address,           // Who's selling
    price: u64,                // Asking price
    timestamp: u64,            // When listed
}
```

**PurchaseCompleted Event:**
```move
public struct PurchaseCompleted has copy, drop {
    listing_id: object::ID,    // Which listing
    nft_id: object::ID,        // Which NFT
    seller: address,           // Who got paid
    buyer: address,            // Who got NFT
    price: u64,                // Sale price
    timestamp: u64,            // When purchased
}
```

**ListingCancelled Event:**
```move
public struct ListingCancelled has copy, drop {
    listing_id: object::ID,    // Which listing
    nft_id: object::ID,        // Which NFT
    seller: address,           // Who cancelled
    timestamp: u64,            // When cancelled
}
```

**Why Events Matter:**
- ✅ Immutable audit trail
- ✅ Off-chain indexing
- ✅ Real-time marketplace updates
- ✅ User notifications
- ✅ Analytics and reporting
- ✅ Dispute resolution

---

## Error Handling

### Error Codes

```move
const EInsufficientPayment: u64 = 0;    // Payment < asking price
const EExcessPayment: u64 = 1;          // Payment > asking price
const EUnauthorizedCancel: u64 = 2;     // Not the seller
const EInvalidPrice: u64 = 3;           // Price must be > 0
```

### Error Scenarios & Responses

#### Error 0: EInsufficientPayment

**When it happens:**
```
Listing price: 1.5 SUI
Buyer sends: 0.8 SUI
```

**Why:**
```move
assert!(coin::value(&payment) >= listing.price, EInsufficientPayment);
```

**What happens:**
```
❌ Assertion fails
❌ Transaction aborts
❌ No changes made
✓ Payment returned to buyer
✓ NFT stays locked in listing
✓ Listing stays active
```

**User sees:**
```
Error: Payment insufficient
Expected: 1.5 SUI
Received: 0.8 SUI
Missing: 0.7 SUI
```

---

#### Error 1: EExcessPayment

**When it happens:**
```
Listing price: 1.0 SUI
Buyer sends: 1.5 SUI
```

**Why:**
```move
assert!(coin::value(&payment) == listing.price, EExcessPayment);
```

**What happens:**
```
❌ Assertion fails
❌ Transaction aborts
❌ No changes made
✓ Payment returned to buyer (no partial transfers)
✓ NFT stays locked in listing
✓ Listing stays active
```

**User sees:**
```
Error: Payment exceeds listing price
Expected: 1.0 SUI (exactly)
Received: 1.5 SUI
Overpayment: 0.5 SUI
```

**Note:** No overpaying allowed - contract requires exact amount

---

#### Error 2: EUnauthorizedCancel

**When it happens:**
```
Listing seller: User A
Caller: User B (trying to cancel)
```

**Why:**
```move
assert!(sender == listing.seller, EUnauthorizedCancel);
```

**What happens:**
```
❌ Assertion fails
❌ Transaction aborts
✓ NFT stays locked (protected)
✓ Listing stays active (protected)
✓ User B cannot access User A's listing
```

**User sees:**
```
Error: Unauthorized
You are not the seller of this listing
Seller: 0xUser_A_Address
Your address: 0xUser_B_Address
```

**Security:** Prevents malicious cancellations

---

#### Error 3: EInvalidPrice

**When it happens:**
```
Seller tries to list for: 0 SUI
```

**Why:**
```move
assert!(price > 0, EInvalidPrice);
```

**What happens:**
```
❌ Assertion fails
❌ Transaction aborts
✓ NFT stays in seller's wallet
✓ No listing created
```

**User sees:**
```
Error: Invalid price
Price must be greater than 0
Entered: 0
```

**Purpose:** Prevents spam and accidental free listings

---

### Preventing Common Mistakes

**Mistake 1: Sending Wrong Amount**
```typescript
// ❌ WRONG
const payment = 1.5 SUI;  // Listing is 1 SUI
await buy_nft(listing, payment);
// Result: EExcessPayment error

// ✅ CORRECT
const price = await listing_price(listing);
const payment = price;  // Exact match
await buy_nft(listing, payment);
// Result: Success
```

**Mistake 2: Cancelling Someone Else's Listing**
```typescript
// ❌ WRONG
const listing = getListingByOtherSeller();
await cancel_listing(listing);
// Result: EUnauthorizedCancel error

// ✅ CORRECT
const myListings = getMyListings();
await cancel_listing(myListings[0]);
// Result: Success, NFT returned
```

**Mistake 3: Listing at Zero Price**
```typescript
// ❌ WRONG
await list_nft(nft, 0);
// Result: EInvalidPrice error

// ✅ CORRECT
await list_nft(nft, 1_000_000_000);  // 1 SUI minimum
// Result: Success, listing created
```

---

## Security Guarantees

### Guarantee 1: NFT Escrow Protection

**What it means:**
- NFT locked in contract storage
- Cannot be stolen or lost
- Cannot be double-spent
- Cannot be manually transferred by seller

**How it works:**
```move
// NFT stored in dynamic object field
dof::add(&mut listing.id, NFTKey {}, car);

// Only accessible via contract functions
let car: Car<T> = dof::remove(&mut listing.id, NFTKey {});
```

**Protection:**
```
Seller lists NFT
  ↓
NFT moves into listing object (escrow)
  ↓
Seller no longer owns it (contract does)
  ↓
Seller cannot:
  ❌ Transfer it manually
  ❌ Delete it
  ❌ Give it away
  ❌ Use it in another contract
  ↓
Seller can ONLY:
  ✓ Cancel listing (get it back)
  ✓ Wait for buyer (sell it)
  ↓
After cancellation/sale:
  NFT moves to new owner
```

---

### Guarantee 2: Atomic Transactions

**What it means:**
- Payment and NFT transfer happen together
- Both succeed or both fail
- No partial transfers
- No loss of assets

**How it works:**
```move
// Both transfers in single transaction
transfer::public_transfer(payment, seller);    // Step 1
transfer::public_transfer(car, buyer);         // Step 2

// If either fails, entire tx reverts
// No partial states possible
```

**Example:**
```
Scenario 1: Payment succeeds, NFT transfer fails
  Move payment to seller? NO (transaction reverts)
  Move NFT to buyer? NO (transaction reverts)
  Result: Everything back to original state

Scenario 2: Both succeed
  SUI in seller's wallet? YES
  NFT in buyer's wallet? YES
  Listing deleted? YES
  Result: Transaction complete

Scenario 3: Payment fails, NFT transfer never attempted
  Transaction aborts
  Nothing changed
  Both parties get original assets back
```

---

### Guarantee 3: Exact Price Validation

**What it means:**
- No overpaying allowed
- No underpaying allowed
- Price must be exact match

**How it works:**
```move
// Check 1: At least enough
assert!(coin::value(&payment) >= listing.price, EInsufficientPayment);

// Check 2: Not more than needed
assert!(coin::value(&payment) == listing.price, EExcessPayment);
```

**Benefits:**
```
✓ No accidental overpayment
✓ Buyer knows exact cost
✓ Seller knows exact revenue
✓ Clear price expectations
```

---

### Guarantee 4: Authorization Control

**What it means:**
- Only seller can cancel
- Only buyer can purchase (anyone)
- No admin backdoors
- No unauthorized access

**How it works:**
```move
// Cancel authorization
let sender = tx_context::sender(ctx);
assert!(sender == listing.seller, EUnauthorizedCancel);

// Purchase has no authorization check
// (anyone can buy, that's the point)
```

**Protection:**
```
Seller can:
  ✓ Cancel their own listings
  ✓ Access their own listings

Seller cannot:
  ❌ Cancel others' listings
  ❌ Block others from buying
  ❌ Modify listing price after listing
  ❌ Hide listing from marketplace

Buyer can:
  ✓ Buy any listing at asking price
  ✓ See all listings

Buyer cannot:
  ❌ Modify listing price
  ❌ Prevent other buyers

Admin cannot:
  ❌ Cancel any listing (even their own)
  ❌ Override user decisions
  ❌ Modify contracts on-the-fly
  ❌ Steal funds or NFTs
```

---

### Guarantee 5: No Loss of Assets

**What it means:**
- Assets cannot be lost
- Cannot get stuck on chain
- Everything recoverable
- Clear state management

**How it works:**
```move
// 1. NFT stored securely
dof::add(&mut listing.id, NFTKey {}, car);

// 2. Retrieval always possible
let car: Car<T> = dof::remove(&mut listing.id, NFTKey {});

// 3. Transfer to owner
transfer::public_transfer(car, owner);

// 4. No intermediary storage
// Objects go directly to addresses
```

**Guarantee:**
```
Lost NFT Scenario:
  1. NFT in listing
  2. Transaction fails
  3. NFT still retrievable from listing
  4. Use cancel_listing to get it back
  
Lost SUI Scenario:
  1. Payment coin prepared
  2. Transaction fails
  3. Coin stays in wallet
  4. Try again
  
Stuck State Scenario:
  1. Listing always has clear state
  2. Can query: listing_price, listing_seller, listing_nft_id
  3. Can always cancel if you're seller
  4. Cannot get stuck
```

---

## Deployment Steps

### Step 1: Prepare Environment

```bash
# Check sui is installed
sui --version

# Check testnet setup
sui client envs

# Switch to testnet if needed
sui client switch --env testnet

# Check balance
sui client gas

# If low balance, use faucet:
# https://faucet.sui.io/?address=<your_address>
```

### Step 2: Build Contract

```bash
# Navigate to contract directory
cd /Users/cybillnerd/Desktop/blastwheel/blastwheelz-nft-smart-contract

# Build to check for errors
sui move build

# Expected: ✅ Build successful
```

### Step 3: Deploy Contract

```bash
# Publish to testnet
sui client publish --gas-budget 50000000

# Expected output:
# - Transaction digest
# - Package ID (save this!)
# - Module names: blastwheelz, cap, cars, marketplace, package
```

### Step 4: Save Package ID

**From the deploy output, find:**
```
Published Objects:
  ID: 0x[PACKAGE_ID]
  Type: 0x2::package::Package
```

**Save in .env or config:**
```env
MARKETPLACE_PACKAGE_ID=0x[your-package-id]
TESTNET_RPC=https://fullnode.testnet.sui.io:443
```

### Step 5: Verify Deployment

```bash
# Query the package
sui client object 0x[PACKAGE_ID]

# Expected: Shows all modules including marketplace
```

---

## Frontend Integration

### Overview

The frontend needs to:
1. Connect to Sui blockchain
2. Query active listings
3. Create list/buy/cancel transactions
4. Listen to events
5. Update UI in real-time

### Basic Setup

```typescript
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';

const client = new SuiClient({
  url: getFullnodeUrl('testnet'),
});

const PACKAGE_ID = '0x[your-package-id]';
```

### Listing an NFT

```typescript
async function listNFT(nftObjectId: string, priceInSUI: number) {
  const txb = new TransactionBlock();
  
  const priceInNanoSUI = BigInt(priceInSUI * 1_000_000_000);
  
  txb.moveCall({
    target: `${PACKAGE_ID}::marketplace::list_nft`,
    typeArguments: [`${PACKAGE_ID}::cars::HeBoomanator`],
    arguments: [
      txb.object(nftObjectId),
      txb.pure.u64(priceInNanoSUI),
    ],
  });
  
  const result = await client.signAndExecuteTransactionBlock({
    transactionBlock: txb,
    signer: keypair,
    options: { showEvents: true },
  });
  
  // Get listing ID from event
  const event = result.events.find(e => 
    e.type.includes('ListingCreated')
  );
  
  return event.parsedJson.listing_id;
}
```

### Purchasing an NFT

```typescript
async function buyNFT(listingId: string, priceInSUI: number) {
  const txb = new TransactionBlock();
  const priceInNanoSUI = BigInt(priceInSUI * 1_000_000_000);
  
  // Split payment from gas
  const [payment] = txb.splitCoins(txb.gas, [
    txb.pure.u64(priceInNanoSUI)
  ]);
  
  txb.moveCall({
    target: `${PACKAGE_ID}::marketplace::buy_nft`,
    typeArguments: [`${PACKAGE_ID}::cars::HeBoomanator`],
    arguments: [
      txb.object(listingId),
      payment,
    ],
  });
  
  const result = await client.signAndExecuteTransactionBlock({
    transactionBlock: txb,
    signer: keypair,
    options: { showEvents: true },
  });
  
  return result;
}
```

### Cancelling a Listing

```typescript
async function cancelListing(listingId: string) {
  const txb = new TransactionBlock();
  
  const nft = txb.moveCall({
    target: `${PACKAGE_ID}::marketplace::cancel_listing`,
    typeArguments: [`${PACKAGE_ID}::cars::HeBoomanator`],
    arguments: [
      txb.object(listingId),
    ],
  });
  
  // Transfer NFT back to sender
  txb.moveCall({
    target: '0x2::transfer::public_transfer',
    arguments: [
      nft,
      txb.pure.address(userAddress),
    ],
  });
  
  const result = await client.signAndExecuteTransactionBlock({
    transactionBlock: txb,
    signer: keypair,
    options: { showEvents: true },
  });
  
  return result;
}
```

### Querying Listings

```typescript
async function getActiveListing(listingId: string) {
  const listing = await client.getObject({
    id: listingId,
    options: { showContent: true },
  });
  
  if (listing.data?.content?.dataType === 'moveObject') {
    const fields = listing.data.content.fields as any;
    return {
      seller: fields.seller,
      price: Number(fields.price) / 1_000_000_000, // Convert to SUI
      nftId: fields.nft_id,
      createdAt: Number(fields.created_at),
    };
  }
}
```

### Listening to Events

```typescript
async function subscribeToMarketplaceEvents() {
  const unsubscribe = await client.subscribeEvent({
    filter: {
      MoveEventType: `${PACKAGE_ID}::marketplace::PurchaseCompleted`,
    },
    onMessage: (event) => {
      console.log('Purchase:', event.parsedJson);
      // Update UI
      updateMarketplaceUI();
    },
  });
  
  return unsubscribe;
}
```

---

## Testing Guide

### Manual Testing (Before UI)

**Test 1: Create Listing**
```
Prerequisites:
  - Have Car NFT in wallet
  - Have enough SUI for gas

Steps:
  1. Call list_nft with your NFT
  2. Price: 1 SUI (1_000_000_000 nanoSUI)
  3. Verify: Listing created event
  4. Verify: NFT no longer in wallet (in escrow)

Expected:
  ✓ Transaction succeeds
  ✓ Listing ID returned
  ✓ Event shows price, seller, nft_id
```

**Test 2: Purchase Listing**
```
Prerequisites:
  - Have active listing
  - Have exact SUI amount
  - Different wallet than seller

Steps:
  1. Get listing object
  2. Prepare exact payment
  3. Call buy_nft
  4. Verify: Events and transfers

Expected:
  ✓ Transaction succeeds
  ✓ Buyer has NFT in wallet
  ✓ Seller has SUI in wallet
  ✓ Listing deleted
  ✓ PurchaseCompleted event
```

**Test 3: Try Underpayment**
```
Prerequisites:
  - Have active listing (1 SUI)
  - Have less SUI than needed

Steps:
  1. Try buy_nft with 0.5 SUI
  2. Observe error

Expected:
  ❌ Transaction fails
  ❌ EInsufficientPayment error
  ❌ Nothing changes
  ✓ Your SUI returned
  ✓ Listing still active
```

**Test 4: Try Overpayment**
```
Prerequisites:
  - Have active listing (1 SUI)
  - Have more SUI than needed

Steps:
  1. Try buy_nft with 1.5 SUI
  2. Observe error

Expected:
  ❌ Transaction fails
  ❌ EExcessPayment error
  ❌ Nothing changes
  ✓ Your SUI returned
  ✓ Listing still active
```

**Test 5: Cancel Listing**
```
Prerequisites:
  - Have your own active listing
  - Same address as seller

Steps:
  1. Call cancel_listing with your listing
  2. Verify: NFT returned to wallet

Expected:
  ✓ Transaction succeeds
  ✓ NFT back in wallet
  ✓ Listing deleted
  ✓ ListingCancelled event
```

**Test 6: Try Unauthorized Cancel**
```
Prerequisites:
  - Have another user's listing
  - Different wallet

Steps:
  1. Try cancel_listing with other's listing
  2. Observe error

Expected:
  ❌ Transaction fails
  ❌ EUnauthorizedCancel error
  ❌ Listing still active (protected)
  ✓ Nothing changed
```

**Test 7: Secondary Market**
```
Prerequisites:
  - Complete Test 2 (you now own NFT)
  - Have SUI for gas

Steps:
  1. List the purchased NFT at higher price
  2. Have another buyer purchase it
  3. Verify: Your wallet has higher SUI

Expected:
  ✓ Can relist immediately
  ✓ Profit realized
  ✓ Secondary market working
```

### UI Testing Checklist

- [ ] Marketplace loads all listings
- [ ] Can click on listing to see details
- [ ] Purchase button visible for non-owned listings
- [ ] Cancel button visible for owned listings
- [ ] Exact price validation works
- [ ] Transaction status shown (pending/confirmed/failed)
- [ ] Success message after purchase
- [ ] Error message on failure
- [ ] Events update UI in real-time
- [ ] "My Listings" page shows only user's listings
- [ ] Purchase history shows completed sales
- [ ] Floor price correctly identified

---

## Summary

**What you have:**
- ✅ Production-ready smart contract
- ✅ Complete buy/sell/cancel functionality
- ✅ Secure NFT escrow
- ✅ Atomic transactions
- ✅ Event-based tracking
- ✅ Full documentation

**Ready to:**
- ✅ Deploy to testnet
- ✅ Build frontend
- ✅ Launch marketplace
- ✅ Scale to production

**Questions?**
- See specific sections above for detailed explanations
- Review code comments in marketplace.move
- Test with manual scenarios before building UI

**Next Steps:**
1. Deploy contract to testnet (if not done)
2. Test each operation manually
3. Build frontend UI
4. Integrate with wallet
5. Go live!
