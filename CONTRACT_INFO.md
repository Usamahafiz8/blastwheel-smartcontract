# BlastWheelz NFT Smart Contract - Deployment Information

## Contract Details

**Package ID:** `0xbf0d05f73a949b2c9e3b0db93c99a5826da45b9c2beaefb04cf61ad10ececf22`

**Network:** Testnet (`https://fullnode.testnet.sui.io:443`)

**Published:** Latest version with supply tracking

## Admin Objects

- **Admin Cap ID:** `0xcffad96c7f7de9f95fd5808770ec38017c9d4869be4722e62775aec536f9a86a`
- **Publisher ID:** `0x166e8c8a1c6e392ac3bab73097e03da241e5d54200be853aee811c25d42d56fb`
- **Upgrade Cap ID:** `0xc68e8564e4d6b7cff29e7385ab54af74bc70b1c1c18274e006543b1ef5408ac5`

## Supply Objects

Supply objects track the max supply and current minted count for each car type.

### Created Supplies

| Car Type | Supply ID | Max Supply | Status |
|----------|-----------|------------|--------|
| HeBoomanator | `0xabc6cf4b24dde31faeb7b6c8c8c4296abcbaacf7cf912dcf83ad6928a47ce0bf` | 1000 | Active |

### To Create Supplies for Other Car Types

```bash
npm run create-supply -- <carType> <maxSupply>
```

Example:
```bash
npm run create-supply -- SuipremeSupra 500
npm run create-supply -- BlastFun 1000
```

## Wallet Information

- **Wallet Address:** `0x1145dfd28e06685d6e5b5f612ea5afdabddc41befec2a41c066aba3faab2b0a8`
- **Private Key:** Stored in `.env` file (Bech32 format)

## Contract Functions

### Supply Management
- `create_supply<T>(_: &AdminCap, max_supply: u64, ctx: &mut TxContext)` - Create supply for a car type
- `update_supply<T>(_: &AdminCap, supply: &mut Supply<T>, new_max_supply: u64)` - Update max supply
- `get_supply_info<T>(supply: &Supply<T>): (u64, u64)` - Get (minted, max_supply)
- `get_minted_count<T>(supply: &Supply<T>): u64` - Get minted count
- `get_max_supply<T>(supply: &Supply<T>): u64` - Get max supply

### Minting
- `mint_and_transfer<T>(_: &AdminCap, supply: &mut Supply<T>, recipient: address, ctx: &mut TxContext)` - Mint NFT with supply check

### NFT Functions
- `mint_number<T>(car: &Car<T>): u64` - Get mint number of an NFT

## Available Scripts

```bash
# Create supply for a car type
npm run create-supply -- <carType> <maxSupply>

# Mint NFT
npm run mint -- <carType> [recipient]

# Setup display
npm run setup-display -- [carType]

# Update display
npm run update-display -- <carType> <field> <value>

# Update NFT display by object ID
npm run update-nft-display -- <nftObjectId> <field>=<value> [field2=value2 ...]
```

## Car Types (32 Total)

1. HeBoomanator
2. SuipremeSupra
3. GoldenToiletGT
4. FordFMBP1974
5. SuiverseRegera
6. AquaGTR
7. SkelSuiEnergyGT25
8. MercedesBuildersG550
9. ArkLiveCyberVenture
10. AstonManni
11. Juggernaut
12. NightViper
13. BlazeHowler
14. CrimsonPhantom
15. IronNomad
16. NeonFang
17. RedlineReaper
18. BlueRupture
19. VenomCircuit
20. UltraPulse
21. ScarletDominion
22. SolarDrift
23. AzureStrike
24. BloodApex
25. VelocityWarden
26. ToxicSurge
27. GoldenRevenant
28. MidnightBrawler
29. PhantomVector
30. EmeraldHavoc
31. HyperDune
32. BlastFun

## Environment Variables

All required environment variables are stored in `.env`:

```env
PACKAGE_ID=0xbf0d05f73a949b2c9e3b0db93c99a5826da45b9c2beaefb04cf61ad10ececf22
ADMIN_CAP_ID=0xcffad96c7f7de9f95fd5808770ec38017c9d4869be4722e62775aec536f9a86a
PUBLISHER_ID=0x166e8c8a1c6e392ac3bab73097e03da241e5d54200be853aee811c25d42d56fb
UPGRADE_CAP_ID=0xc68e8564e4d6b7cff29e7385ab54af74bc70b1c1c18274e006543b1ef5408ac5
PRIVATE_KEY=suiprivkey1qrh5jellr0ycewxv74pqt7r2w4tykfl33uppnnz7cg9769qu6zxzymsf2ss
SUI_NETWORK=https://fullnode.testnet.sui.io:443
SUPPLY_HEBOOMANATOR=0xabc6cf4b24dde31faeb7b6c8c8c4296abcbaacf7cf912dcf83ad6928a47ce0bf
```

## Files

- `supplies.json` - Stores supply IDs for all car types
- `.env` - Environment variables with all contract IDs
- `CONTRACT_INFO.md` - This file with all deployment information

## Test Mint

Successfully minted NFT:
- **NFT ID:** `0x7bb6324b752d5267fa5028666082ddee946b710a7263f081216e973281631c00`
- **Car Type:** HeBoomanator
- **Mint Number:** 1
- **Transaction:** `4A98PKDhephQKW28b7TsnXtWWhxb5dMKDbNpXufE1uxg`
Display ID: 0xd7a8bd1bef74e31941c1ef320133998f81c83e3d8b39e810d6e59f893dfd6732

## Display Objects

| Car Type | Display ID | Status |
|----------|------------|--------|
| HeBoomanator | `0xd7a8bd1bef74e31941c1ef320133998f81c83e3d8b39e810d6e59f893dfd6732` | Active |
