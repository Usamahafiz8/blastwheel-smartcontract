# BlastWheelz NFT Scripts

Scripts for interacting with the BlastWheelz NFT smart contract.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the project root:
```env
PACKAGE_ID=your_package_id_here
ADMIN_CAP_ID=your_admin_cap_id_here
PRIVATE_KEY=your_private_key_here
# OR
MNEMONIC=your_mnemonic_here

# Optional
SUI_NETWORK=https://fullnode.mainnet.sui.io:443
```

## Create Collection

Create a collection for a specific car type:

```bash
npx ts-node scripts/create-collection.ts <carType>
```

### Examples:

```bash
# Create collection for HeBoomanator
npx ts-node scripts/create-collection.ts HeBoomanator

# Create collection for BlastFun
npx ts-node scripts/create-collection.ts BlastFun
```

### Valid Car Types:

- HeBoomanator
- SuipremeSupra
- GoldenToiletGT
- FordFMBP1974
- SuiverseRegera
- AquaGTR
- SkelSuiEnergyGT25
- MercedesBuildersG550
- ArkLiveCyberVenture
- AstonManni
- Juggernaut
- NightViper
- BlazeHowler
- CrimsonPhantom
- IronNomad
- NeonFang
- RedlineReaper
- BlueRupture
- VenomCircuit
- UltraPulse
- ScarletDominion
- SolarDrift
- AzureStrike
- BloodApex
- VelocityWarden
- ToxicSurge
- GoldenRevenant
- MidnightBrawler
- PhantomVector
- EmeraldHavoc
- HyperDune
- BlastFun

### Output

The script will:
- Create the collection on-chain
- Display the collection ID
- Save the collection ID to `collections.json`
- Show the environment variable format to add to your `.env` file

## Mint NFT

Mint an NFT for a specific car type. The collection must already exist.

```bash
npx ts-node scripts/mint.ts <carType> [recipient]
```

### Examples:

```bash
# Mint HeBoomanator to your own address
npx ts-node scripts/mint.ts HeBoomanator

# Mint SuipremeSupra to a specific address
npx ts-node scripts/mint.ts SuipremeSupra 0x1234...
```

### Requirements:

- The collection for the car type must already exist (created via `create-collection.ts`)
- Collection ID must be in `collections.json` or set as `COLLECTION_<CARTYPE>` in `.env`

### Output

The script will:
- Mint the NFT on-chain
- Display the NFT ID and transaction digest
- Show the current and new minted count for the collection
- Transfer the NFT to the recipient address (defaults to sender if not specified)

## Setup Display

Create display metadata for Car NFTs. Display allows NFTs to show metadata like name, image_url, description, etc. in wallets and explorers.

```bash
npx ts-node scripts/setup-display.ts [carType]
```

### Examples:

```bash
# Create display for a specific car type
npx ts-node scripts/setup-display.ts HeBoomanator

# Create displays for all car types
npx ts-node scripts/setup-display.ts
```

### Requirements:

- The package must be published
- PUBLISHER_ID must be set in `.env`

### Output

The script will:
- Create display metadata on-chain
- Display the display ID and transaction digest
- Show that the display applies to all NFTs of that type

## Update Display

Update existing display metadata for Car NFTs.

```bash
npx ts-node scripts/update-display.ts <carType> <field> <value>
```

### Examples:

```bash
# Update image URL
npx ts-node scripts/update-display.ts HeBoomanator image_url https://new-url.com/image.png

# Update name
npx ts-node scripts/update-display.ts SuipremeSupra name "New Car Name"

# Update description
npx ts-node scripts/update-display.ts BlastFun description "Updated description"
```

### Valid Fields:

- `name` - NFT name
- `image_url` - Image URL
- `description` - Description
- `project_url` - Project website URL
- `creator` - Creator name
- `intellectual_property` - IP owner
- `category` - Category (e.g., "Collectible")
- `type` - Type (e.g., "Car")
- `mint_number` - Mint number (uses {mint_number} placeholder)

### Requirements:

- Display must already exist (created via `setup-display.ts`)
- Display ID must be in your wallet or set as `DISPLAY_ID_<CARTYPE>` in `.env`

### Output

The script will:
- Update the display field on-chain
- Display the transaction digest
- Show that all NFTs of this type will use the updated display

## Update NFT Display (by Object ID)

Update display metadata by providing an NFT object ID. The script automatically detects the car type.

```bash
npx ts-node scripts/update-nft-display.ts <nftObjectId> <field> <value>
```

### Examples:

```bash
# Update image URL for a specific NFT (updates display for all NFTs of that type)
npx ts-node scripts/update-nft-display.ts 0x1234... image_url https://new-url.com/image.png

# Update name
npx ts-node scripts/update-nft-display.ts 0x1234... name "New Car Name"
```

### How It Works:

1. Fetches the NFT object to determine its car type
2. Finds the display object for that car type
3. Updates the display field
4. All NFTs of that type (including the one you specified) will use the updated display

### Note:

- Display metadata applies to all NFTs of the same type, not just the individual NFT
- The script automatically detects the car type from the NFT object
- You don't need to know the car type - just provide the NFT object ID
