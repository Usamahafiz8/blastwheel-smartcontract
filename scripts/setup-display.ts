/**
 * Setup Display Script
 * 
 * Creates display metadata for Car NFTs. Display allows NFTs to show
 * metadata like name, image_url, description, etc. in wallets and explorers.
 * 
 * Usage:
 *   npx ts-node scripts/setup-display.ts [carType]
 * 
 * Example:
 *   npx ts-node scripts/setup-display.ts HeBoomanator
 *   npx ts-node scripts/setup-display.ts  (creates display for all car types)
 * 
 * Required Environment Variables:
 *   - PACKAGE_ID: The package ID of the deployed contract
 *   - PUBLISHER_ID: The Publisher object ID (from package publish)
 *   - PRIVATE_KEY or MNEMONIC: Wallet credentials for signing transactions
 * 
 * Optional Environment Variables:
 *   - SUI_NETWORK: Network URL (defaults to mainnet)
 */

import { config } from 'dotenv';
import { SuiClient, SuiObjectChangeCreated } from '@mysten/sui/client';
import { bcs } from '@mysten/sui/bcs';
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

// Display fields template - uses {mint_number} placeholder for dynamic values
const DISPLAY_FIELDS = {
  keys: [
    'name',
    'image_url',
    'description',
    'project_url',
    'creator',
    'intellectual_property',
    'category',
    'type',
    'mint_number',
  ],
  values: [
    'BlastWheelz Car #{mint_number}',
    'https://blastwheelz.io/car.png',
    'BlastWheelz NFT Car Collection',
    'https://blastwheelz.io',
    'BlastWheelz',
    'BlastWheelz',
    'Collectible',
    'Car',
    '{mint_number}',
  ],
};

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
 * Create display for a specific car type
 */
async function createDisplayForCarType(carType: string): Promise<string> {
  if (!packageId) {
    throw new Error('PACKAGE_ID must be set in environment variables');
  }
  
  if (!publisherId) {
    throw new Error('PUBLISHER_ID must be set in environment variables');
  }
  
  if (!CAR_TYPES.includes(carType)) {
    throw new Error(`Invalid car type: ${carType}. Valid types: ${CAR_TYPES.join(', ')}`);
  }
  
  const keypair = getKeypair();
  const client = new SuiClient({ url: suiNetwork });
  const signerAddress = keypair.toSuiAddress();
  
  // Verify publisher object
  const publisherObj = await client.getObject({
    id: publisherId,
    options: { showType: true },
  });
  
  if (publisherObj.error || !publisherObj.data || publisherObj.data.type !== '0x2::package::Publisher') {
    throw new Error(`Invalid PUBLISHER_ID: ${publisherId} is not a valid Publisher object`);
  }
  
  const tx = new Transaction();
  const CAR_TYPE = `${packageId}::cars::${carType}`;
  const NFT_TYPE = `${packageId}::cars::Car<${CAR_TYPE}>`;
  
  console.log(`📋 Creating display for: ${carType}`);
  console.log(`📦 NFT Type: ${NFT_TYPE}\n`);
  
  // Create display with fields
  const carDisplay = tx.moveCall({
    target: '0x2::display::new_with_fields',
    arguments: [
      tx.object(publisherId),
      tx.pure(bcs.vector(bcs.string()).serialize(DISPLAY_FIELDS.keys)),
      tx.pure(bcs.vector(bcs.string()).serialize(DISPLAY_FIELDS.values)),
    ],
    typeArguments: [NFT_TYPE],
  });
  
  // Update display version (mutates in place)
  tx.moveCall({
    target: '0x2::display::update_version',
    arguments: [carDisplay],
    typeArguments: [NFT_TYPE],
  });
  
  // Note: Display objects should remain with Publisher (not transferred)
  // The Display will work for all NFTs of this type regardless of ownership
  // However, we need to transfer it to avoid "UnusedValueWithoutDrop" error
  // The display metadata will still apply to all NFTs of the type
  tx.transferObjects([carDisplay], signerAddress);
  tx.setGasBudget(GAS_BUDGET);
  
  console.log('📤 Executing transaction...\n');
  
  let result;
  try {
    result = await client.signAndExecuteTransaction({
      transaction: tx,
      signer: keypair,
      options: {
        showObjectChanges: true,
        showEffects: true,
        showEvents: true,
        showInput: true,
      },
    });
  } catch (error: any) {
    // Check if display already exists
    if (error.message?.includes('MoveAbort') || error.message?.includes('display')) {
      console.log('⚠️  Display already exists for this car type.');
      console.log('💡 To update an existing display, use the edit function or delete it first.\n');
      throw new Error(`Display already exists for ${carType}. Use update-display script to modify it.`);
    }
    throw error;
  }
  
  if (result.effects?.status.status !== 'success') {
    const errorMsg = result.effects?.status.error || JSON.stringify(result, null, 2);
    
    // Check if it's the "already exists" error
    if (errorMsg.includes('MoveAbort') || errorMsg.includes('display')) {
      console.log('⚠️  Display already exists for this car type.');
      console.log('💡 To update an existing display, use the edit function or delete it first.\n');
      throw new Error(`Display already exists for ${carType}. Use update-display script to modify it.`);
    }
    
    throw new Error(`Transaction failed: ${errorMsg}`);
  }
  
  // Find display object in result
  const objectChanges = result.objectChanges?.filter(
    (change): change is SuiObjectChangeCreated =>
      change.type === 'created' && change.objectType?.includes('0x2::display::Display')
  );
  
  const displayId = objectChanges?.find((change) =>
    change.objectType?.includes('Car')
  )?.objectId;
  
  if (!displayId) {
    throw new Error('Failed to retrieve Display object ID');
  }
  
  return displayId;
}

/**
 * Create display for all car types
 */
async function createDisplayForAll(): Promise<void> {
  console.log('🎨 Setting up Display for All Car Types');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`📦 Package ID: ${packageId}`);
  console.log(`📚 Publisher ID: ${publisherId}`);
  console.log(`🌐 Network: ${suiNetwork}`);
  console.log(`🚗 Total Car Types: ${CAR_TYPES.length}`);
  console.log('═══════════════════════════════════════════════════════\n');
  
  const results: Record<string, string> = {};
  let successCount = 0;
  let failCount = 0;
  
  for (const carType of CAR_TYPES) {
    try {
      const displayId = await createDisplayForCarType(carType);
      results[carType] = displayId;
      successCount++;
      console.log(`✅ ${carType}: ${displayId}\n`);
      
      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error: any) {
      failCount++;
      console.error(`❌ ${carType}: ${error.message}\n`);
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log('═══════════════════════════════════════════════════════\n');
  
  if (Object.keys(results).length > 0) {
    console.log('📝 Display IDs:');
    Object.entries(results).forEach(([carType, displayId]) => {
      console.log(`  ${carType}: ${displayId}`);
    });
  }
}

/**
 * Create display for a single car type
 */
async function createDisplayForSingle(carType: string): Promise<void> {
  console.log('🎨 Setting up Display');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`📦 Package ID: ${packageId}`);
  console.log(`📚 Publisher ID: ${publisherId}`);
  console.log(`🚗 Car Type: ${carType}`);
  console.log(`🌐 Network: ${suiNetwork}`);
  console.log('═══════════════════════════════════════════════════════\n');
  
  try {
    const displayId = await createDisplayForCarType(carType);
    
    console.log('✅ Display Created Successfully!');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`🎨 Display ID: ${displayId}`);
    console.log(`🚗 Car Type: ${carType}`);
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('💡 Note: Display objects remain with Publisher.');
    console.log('   All NFTs of this type will use this display.\n');
  } catch (error: any) {
    throw error;
  }
}

// Main execution
async function main() {
  const carType = process.argv[2];
  
  try {
    if (carType) {
      await createDisplayForSingle(carType);
    } else {
      await createDisplayForAll();
    }
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
