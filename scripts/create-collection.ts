/**
 * Create Collection Script
 * 
 * Creates a collection for a specific car type.
 * 
 * Usage:
 *   npx ts-node scripts/create-collection.ts <carType>
 * 
 * Example:
 *   npx ts-node scripts/create-collection.ts HeBoomanator
 * 
 * Required Environment Variables:
 *   - PACKAGE_ID: The package ID of the deployed contract
 *   - ADMIN_CAP_ID: The AdminCap object ID
 *   - PRIVATE_KEY or MNEMONIC: Wallet credentials for signing transactions
 * 
 * Optional Environment Variables:
 *   - SUI_NETWORK: Network URL (defaults to mainnet)
 */

import { config } from 'dotenv';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import * as fs from 'fs';
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

// Configuration
const packageId = process.env.PACKAGE_ID || process.env.NFT_PACKAGE_ID;
const adminCapId = process.env.ADMIN_CAP_ID || process.env.ADMINCAP_ID;
const suiNetwork = process.env.SUI_NETWORK || 'https://fullnode.mainnet.sui.io:443';
const privateKey = process.env.PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY || '';
const mnemonic = process.env.MNEMONIC || process.env.ADMIN_MNEMONIC || '';

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
 * Create collection for a car type
 */
async function createCollection(carType: string): Promise<void> {
  // Validate inputs
  if (!packageId) {
    throw new Error('PACKAGE_ID must be set in environment variables');
  }
  
  if (!adminCapId) {
    throw new Error('ADMIN_CAP_ID must be set in environment variables');
  }
  
  if (!CAR_TYPES.includes(carType)) {
    throw new Error(`Invalid car type: ${carType}. Valid types: ${CAR_TYPES.join(', ')}`);
  }
  
  const keypair = getKeypair();
  const client = new SuiClient({ url: suiNetwork });
  const address = keypair.toSuiAddress();
  
  console.log('🚀 Creating Collection');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`📦 Package ID: ${packageId}`);
  console.log(`🔑 Admin Cap ID: ${adminCapId}`);
  console.log(`🚗 Car Type: ${carType}`);
  console.log(`🌐 Network: ${suiNetwork}`);
  console.log(`👤 Wallet: ${address}`);
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Check balance
  const balance = await client.getBalance({ owner: address });
  const balanceSui = parseInt(balance.totalBalance) / 1_000_000_000;
  console.log(`💰 Balance: ${balanceSui} SUI\n`);
  
  if (parseInt(balance.totalBalance) < 10_000_000) {
    console.warn('⚠️  Warning: Low balance. You may need more SUI for gas.\n');
  }
  
  const typeArgument = `${packageId}::cars::${carType}`;
  console.log(`📋 Type Argument: ${typeArgument}\n`);
  
  // Build transaction
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${packageId}::cars::create_collection`,
    arguments: [
      tx.object(adminCapId),
    ],
    typeArguments: [typeArgument],
  });
  
  tx.setGasBudget(10_000_000); // 0.01 SUI
  
  console.log('📤 Executing transaction...\n');
  
  // Execute transaction
  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: {
      showObjectChanges: true,
      showEffects: true,
      showEvents: true,
    },
  });
  
  if (result.effects?.status.status !== 'success') {
    throw new Error(`Transaction failed: ${result.effects?.status.error || 'Unknown error'}`);
  }
  
  // Find collection in result
  const collection = result.objectChanges?.find(
    (change: any) => 
      (change.type === 'created' || change.type === 'transferred') && 
      change.objectType?.includes('Collection')
  ) as { type: string; objectId: string; objectType: string } | undefined;
  
  if (!collection) {
    throw new Error('Collection created but object ID not found in result');
  }
  
  console.log('✅ Collection Created Successfully!');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`📋 Collection ID: ${collection.objectId}`);
  console.log(`🔗 Transaction: ${result.digest}`);
  console.log(`📦 Object Type: ${collection.objectType}`);
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Save to file
  const outputFile = path.join(__dirname, '../collections.json');
  let collections: Record<string, string> = {};
  
  if (fs.existsSync(outputFile)) {
    collections = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
  }
  
  collections[carType] = collection.objectId;
  
  fs.writeFileSync(outputFile, JSON.stringify(collections, null, 2));
  console.log(`💾 Collection ID saved to: ${outputFile}\n`);
  
  console.log('📝 Add to your .env file:');
  console.log(`COLLECTION_${carType.toUpperCase()}=${collection.objectId}\n`);
}

// Main execution
async function main() {
  const carType = process.argv[2];
  
  if (!carType) {
    console.error('❌ Error: Car type is required');
    console.log('\nUsage:');
    console.log('  npx ts-node scripts/create-collection.ts <carType>');
    console.log('\nExample:');
    console.log('  npx ts-node scripts/create-collection.ts HeBoomanator');
    console.log('\nValid car types:');
    CAR_TYPES.forEach(type => console.log(`  - ${type}`));
    process.exit(1);
  }
  
  try {
    await createCollection(carType);
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
