/**
 * Update Display Script
 * 
 * Updates display metadata for existing Car NFT displays.
 * 
 * Usage:
 *   npx ts-node scripts/update-display.ts <carType> [field] [value]
 * 
 * Example:
 *   npx ts-node scripts/update-display.ts HeBoomanator image_url https://new-url.com/image.png
 *   npx ts-node scripts/update-display.ts SuipremeSupra name "New Car Name"
 * 
 * Required Environment Variables:
 *   - PACKAGE_ID: The package ID of the deployed contract
 *   - PUBLISHER_ID: The Publisher object ID (from package publish)
 *   - PRIVATE_KEY or MNEMONIC: Wallet credentials for signing transactions
 *   - DISPLAY_ID_<CARTYPE>: Display object ID (or will try to find it)
 * 
 * Optional Environment Variables:
 *   - SUI_NETWORK: Network URL (defaults to mainnet)
 */

import { config } from 'dotenv';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import * as path from 'path';

// Load environment variables
config({ path: path.join(__dirname, '../.env.local') });
config({ path: path.join(__dirname, '../.env') });

// All 32 car types
const CAR_TYPES = [
  'HeBoomanator',
  'SuipremeSupra',
  'GoldenToiletGT',
  'FordFMBP1974',
  'SuiverseRegera',
  'AquaGTR',
  'SkelSuiEnergyGT25',
  'MercedesBuildersG550',
  'ArkLiveCyberVenture',
  'AstonManni',
  'Juggernaut',
  'NightViper',
  'BlazeHowler',
  'CrimsonPhantom',
  'IronNomad',
  'NeonFang',
  'RedlineReaper',
  'BlueRupture',
  'VenomCircuit',
  'UltraPulse',
  'ScarletDominion',
  'SolarDrift',
  'AzureStrike',
  'BloodApex',
  'VelocityWarden',
  'ToxicSurge',
  'GoldenRevenant',
  'MidnightBrawler',
  'PhantomVector',
  'EmeraldHavoc',
  'HyperDune',
  'BlastFun',
];

const packageId = process.env.PACKAGE_ID || process.env.NFT_PACKAGE_ID;
const publisherId = process.env.PUBLISHER_ID || '';
const suiNetwork = process.env.SUI_NETWORK || 'https://fullnode.mainnet.sui.io:443';
const privateKey = process.env.PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY || '';
const mnemonic = process.env.MNEMONIC || process.env.ADMIN_MNEMONIC || '';
const GAS_BUDGET = 60_000_000; // 0.06 SUI

// Valid display fields
const VALID_FIELDS = [
  'name',
  'image_url',
  'description',
  'project_url',
  'creator',
  'intellectual_property',
  'category',
  'type',
  'mint_number',
];

/**
 * Get keypair from private key or mnemonic
 */
function getKeypair(): Ed25519Keypair {
  if (mnemonic) {
    return Ed25519Keypair.deriveKeypair(mnemonic);
  }
  
  if (privateKey) {
    try {
      if (privateKey.startsWith('suiprivkey')) {
        const { secretKey } = decodeSuiPrivateKey(privateKey.trim());
        return Ed25519Keypair.fromSecretKey(secretKey);
      }
      
      let privateKeyBytes: Uint8Array;
      const trimmed = privateKey.trim();
      
      if (trimmed.startsWith('0x')) {
        privateKeyBytes = Uint8Array.from(Buffer.from(trimmed.slice(2), 'hex'));
      } else {
        try {
          privateKeyBytes = Uint8Array.from(Buffer.from(trimmed, 'hex'));
        } catch {
          privateKeyBytes = Uint8Array.from(Buffer.from(trimmed, 'base64'));
        }
      }
      
      return Ed25519Keypair.fromSecretKey(privateKeyBytes);
    } catch (error) {
      throw new Error(`Failed to create keypair: ${error}`);
    }
  }
  
  throw new Error('PRIVATE_KEY or MNEMONIC must be set in environment variables');
}

/**
 * Find display object ID for a car type
 */
async function findDisplayId(carType: string, client: SuiClient, signerAddress: string): Promise<string | null> {
  if (!packageId) {
    throw new Error('PACKAGE_ID must be set');
  }
  
  // First try environment variable
  const envKey = `DISPLAY_ID_${carType.toUpperCase()}`;
  const envDisplayId = process.env[envKey];
  if (envDisplayId) {
    return envDisplayId;
  }
  
  const NFT_TYPE = `${packageId}::cars::Car<${packageId}::cars::${carType}>`;
  const displayType = `0x2::display::Display<${NFT_TYPE}>`;
  
  // Try to find display objects owned by the signer
  try {
    const displayObjects = await client.getOwnedObjects({
      owner: signerAddress,
      filter: {
        StructType: displayType,
      },
      options: {
        showType: true,
        showContent: true,
      },
    });
    
    if (displayObjects.data && displayObjects.data.length > 0) {
      const displayId = displayObjects.data[0].data?.objectId;
      if (displayId) {
        return displayId;
      }
    }
  } catch (error) {
    // Ignore - continue searching
  }
  
  // Try to find in publisher's objects
  if (publisherId) {
    try {
      const displayObjects = await client.getOwnedObjects({
        owner: publisherId,
        filter: {
          StructType: displayType,
        },
        options: {
          showType: true,
          showContent: true,
        },
      });
      
      if (displayObjects.data && displayObjects.data.length > 0) {
        const displayId = displayObjects.data[0].data?.objectId;
        if (displayId) {
          return displayId;
        }
      }
    } catch (error) {
      // Ignore - continue
    }
  }
  
  return null;
}

/**
 * Update display field for a car type
 */
async function updateDisplay(carType: string, field: string, value: string): Promise<void> {
  if (!packageId) {
    throw new Error('PACKAGE_ID must be set in environment variables');
  }
  
  if (!CAR_TYPES.includes(carType)) {
    throw new Error(`Invalid car type: ${carType}. Valid types: ${CAR_TYPES.join(', ')}`);
  }
  
  if (!VALID_FIELDS.includes(field)) {
    throw new Error(`Invalid field: ${field}. Valid fields: ${VALID_FIELDS.join(', ')}`);
  }
  
  const keypair = getKeypair();
  const client = new SuiClient({ url: suiNetwork });
  const signerAddress = keypair.toSuiAddress();
  
  // Find display object
  const displayId = await findDisplayId(carType, client, signerAddress);
  
  if (!displayId) {
    throw new Error(
      `Display object not found for ${carType}. ` +
      `Please set DISPLAY_ID_${carType.toUpperCase()} in .env or ensure the display exists.`
    );
  }
  
  // Verify display object exists
  const displayObj = await client.getObject({
    id: displayId,
    options: { showContent: true, showDisplay: true },
  });
  
  if (displayObj.error || !displayObj.data) {
    throw new Error(`Failed to fetch display object: ${displayId}`);
  }
  
  const currentDisplay = displayObj.data.display?.data as any;
  const currentValue = currentDisplay?.[field] || '(not set)';
  
  console.log('🎨 Updating Display');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`📦 Package ID: ${packageId}`);
  console.log(`📚 Publisher ID: ${publisherId}`);
  console.log(`🎨 Display ID: ${displayId}`);
  console.log(`🚗 Car Type: ${carType}`);
  console.log(`📝 Field: ${field}`);
  console.log(`🔄 Current Value: ${currentValue}`);
  console.log(`✨ New Value: ${value}`);
  console.log(`🌐 Network: ${suiNetwork}`);
  console.log('═══════════════════════════════════════════════════════\n');
  
  const NFT_TYPE = `${packageId}::cars::Car<${packageId}::cars::${carType}>`;
  
  // Build transaction
  const tx = new Transaction();
  
  // Edit the field
  tx.moveCall({
    target: '0x2::display::edit',
    arguments: [
      tx.object(displayId),
      tx.pure.string(field),
      tx.pure.string(value),
    ],
    typeArguments: [NFT_TYPE],
  });
  
  // Update version to apply changes
  tx.moveCall({
    target: '0x2::display::update_version',
    arguments: [tx.object(displayId)],
    typeArguments: [NFT_TYPE],
  });
  
  tx.setGasBudget(GAS_BUDGET);
  
  console.log('📤 Executing transaction...\n');
  
  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
    options: {
      showObjectChanges: true,
      showEffects: true,
      showEvents: true,
    },
  });
  
  if (result.effects?.status.status !== 'success') {
    throw new Error(
      `Transaction failed: ${result.effects?.status.error || JSON.stringify(result, null, 2)}`
    );
  }
  
  console.log('✅ Display Updated Successfully!');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`🎨 Display ID: ${displayId}`);
  console.log(`📝 Field: ${field}`);
  console.log(`✨ New Value: ${value}`);
  console.log(`🔗 Transaction: ${result.digest}`);
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('💡 All NFTs of this type will now use the updated display.\n');
}

// Main execution
async function main() {
  const carType = process.argv[2];
  const field = process.argv[3];
  const value = process.argv[4];
  
  if (!carType || !field || !value) {
    console.error('❌ Error: Car type, field, and value are required');
    console.log('\nUsage:');
    console.log('  npx ts-node scripts/update-display.ts <carType> <field> <value>');
    console.log('\nExample:');
    console.log('  npx ts-node scripts/update-display.ts HeBoomanator image_url https://new-url.com/image.png');
    console.log('  npx ts-node scripts/update-display.ts SuipremeSupra name "New Car Name"');
    console.log('\nValid car types:');
    CAR_TYPES.forEach(type => console.log(`  - ${type}`));
    console.log('\nValid fields:');
    VALID_FIELDS.forEach(f => console.log(`  - ${f}`));
    process.exit(1);
  }
  
  try {
    await updateDisplay(carType, field, value);
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
