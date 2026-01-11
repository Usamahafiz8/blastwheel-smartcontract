# BlastWheelz NFT Smart Contract

A simple Sui Move NFT project for minting car-themed NFTs with custom metadata.

## Features

- 30 different car types
- Custom NFT metadata (name, image, rim, texture, speed, brake, control)
- Supply management with minting limits
- Sui Display system integration
- Simple, clean, and readable code

## Project Structure

- `sources/` - Move smart contracts
  - `blastwheelz.move` - Main NFT contract
  - `cap.move` - Admin capabilities
  - `package.move` - Package versioning

## Getting Started

1. Build the Move contract:
```bash
sui move build
```

2. Publish the package:
```bash
sui client publish --gas-budget 100000000
```

## Car Types

The project supports 30 car types including:
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

## NFT Metadata

Each NFT includes:
- `name`: Car name
- `image_url`: Image URL
- `project_url`: Project URL
- `mint_number`: Sequential mint number
- `rim`: Rim type
- `texture`: Texture type
- `speed`: Speed attribute
- `brake`: Brake attribute
- `control`: Control attribute

## License

Copyright (c) Mysten Labs, Inc.
SPDX-License-Identifier: Apache-2.0
