/**
 * Mint NFT Script
 * 
 * Mints an NFT for a specific car type to a recipient address.
 * 
 * Usage:
 *   npx ts-node scripts/mint.ts <carType> [recipient]
 * 
 * Example:
 *   npx ts-node scripts/mint.ts HeBoomanator
 *   npx ts-node scripts/mint.ts SuipremeSupra 0x1234...
 * 
 * Required Environment Variables:
 *   - PACKAGE_ID: The package ID of the deployed contract
 *   - ADMIN_CAP_ID: The AdminCap object ID
 *   - PRIVATE_KEY or MNEMONIC: Wallet credentials for signing transactions
 *   - SUPPLY_<CARTYPE>: Supply ID for the car type (or will use supplies.json)
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
 * Get supply ID for a car type
 */
function getSupplyId(carType: string): string {
  // First try environment variable
  const envKey = `SUPPLY_${carType.toUpperCase()}`;
  const envSupplyId = process.env[envKey];
  if (envSupplyId) {
    return envSupplyId;
  }
  
  // Try supplies.json
  const suppliesFile = path.join(__dirname, '../supplies.json');
  if (fs.existsSync(suppliesFile)) {
    const supplies = JSON.parse(fs.readFileSync(suppliesFile, 'utf-8'));
    if (supplies[carType]) {
      return supplies[carType];
    }
  }
  
  throw new Error(
    `Supply ID not found for ${carType}. ` +
    `Please set ${envKey} in .env or create supply first using create-supply.ts`
  );
}

/**
 * Mint NFT for a car type
 */
async function mintNFT(carType: string, recipient?: string): Promise<void> {
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
  
  const supplyId = getSupplyId(carType);
  const keypair = getKeypair();
  const client = new SuiClient({ url: suiNetwork });
  const senderAddress = keypair.toSuiAddress();
  const recipientAddress = recipient || senderAddress;
  
  console.log('🎨 Minting NFT');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`📦 Package ID: ${packageId}`);
  console.log(`🔑 Admin Cap ID: ${adminCapId}`);
  console.log(`📊 Supply ID: ${supplyId}`);
  console.log(`🚗 Car Type: ${carType}`);
  console.log(`🌐 Network: ${suiNetwork}`);
  console.log(`👤 Sender: ${senderAddress}`);
  console.log(`🎁 Recipient: ${recipientAddress}`);
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Check balance
  const balance = await client.getBalance({ owner: senderAddress });
  const balanceSui = parseInt(balance.totalBalance) / 1_000_000_000;
  console.log(`💰 Balance: ${balanceSui} SUI\n`);
  
  if (parseInt(balance.totalBalance) < 10_000_000) {
    console.warn('⚠️  Warning: Low balance. You may need more SUI for gas.\n');
  }
  
  // Get current supply info
  try {
    const supplyObject = await client.getObject({
      id: supplyId,
      options: { showContent: true },
    });
    
    if (!supplyObject.data || supplyObject.error) {
      throw new Error(`Supply not found: ${supplyId}`);
    }
    
    const content = supplyObject.data.content;
    if (content && 'fields' in content) {
      const minted = (content.fields as any).minted;
      const maxSupply = (content.fields as any).max_supply;
      console.log(`📊 Supply Info: ${minted} / ${maxSupply} minted\n`);
      
      if (minted >= maxSupply) {
        throw new Error(`Supply exhausted: ${minted}/${maxSupply} already minted`);
      }
    }
  } catch (error: any) {
    throw new Error(`Failed to fetch supply: ${error.message}`);
  }
  
  const typeArgument = `${packageId}::cars::${carType}`;
  console.log(`📋 Type Argument: ${typeArgument}\n`);
  
  // Build transaction
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${packageId}::cars::mint_and_transfer`,
    arguments: [
      tx.object(adminCapId),
      tx.object(supplyId),
      tx.pure.address(recipientAddress),
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
  
  // Find NFT in result
  const nft = result.objectChanges?.find(
    (change: any) => 
      (change.type === 'created' || change.type === 'transferred') && 
      change.objectType?.includes('Car')
  ) as { type: string; objectId: string; objectType: string } | undefined;
  
  if (!nft) {
    throw new Error('NFT minted but object ID not found in result');
  }
  
  // Get updated supply info
  try {
    const supplyObject = await client.getObject({
      id: supplyId,
      options: { showContent: true },
    });
    
    if (supplyObject.data && 'content' in supplyObject.data) {
      const content = supplyObject.data.content;
      if (content && 'fields' in content) {
        const minted = (content.fields as any).minted;
        const maxSupply = (content.fields as any).max_supply;
        console.log('✅ NFT Minted Successfully!');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`🎨 NFT ID: ${nft.objectId}`);
        console.log(`🔗 Transaction: ${result.digest}`);
        console.log(`📦 Object Type: ${nft.objectType}`);
        console.log(`📊 Supply: ${minted} / ${maxSupply} minted`);
        console.log('═══════════════════════════════════════════════════════\n');
      }
    }
  } catch (error) {
    // Fallback if we can't get supply info
    console.log('✅ NFT Minted Successfully!');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`🎨 NFT ID: ${nft.objectId}`);
    console.log(`🔗 Transaction: ${result.digest}`);
    console.log('═══════════════════════════════════════════════════════\n');
  }
  
  console.log('🎉 Mint complete!');
}

// Main execution
async function main() {
  const carType = process.argv[2];
  const recipient = process.argv[3];
  
  if (!carType) {
    console.error('❌ Error: Car type is required');
    console.log('\nUsage:');
    console.log('  npx ts-node scripts/mint.ts <carType> [recipient]');
    console.log('\nExample:');
    console.log('  npx ts-node scripts/mint.ts HeBoomanator');
    console.log('  npx ts-node scripts/mint.ts SuipremeSupra 0x1234...');
    console.log('\nValid car types:');
    CAR_TYPES.forEach(type => console.log(`  - ${type}`));
    process.exit(1);
  }
  
  try {
    await mintNFT(carType, recipient);
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
