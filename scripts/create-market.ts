/**
 * Create Marketplace Script with Database Integration
 * 
 * Spins up a shared Market object so listing/delisting/buying can work.
 * Automatically saves the Market ID to the database and updates environment variables.
 * 
 * Usage:
 *   npx ts-node scripts/create-market.ts
 */

import { config } from 'dotenv';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

config({ path: path.join(__dirname, '../.env.local') });
config({ path: path.join(__dirname, '../.env') });

const packageId = process.env.PACKAGE_ID || process.env.SUI_PACKAGE_ID;
const privateKey = process.env.PRIVATE_KEY || '';
const mnemonic = process.env.MNEMONIC || '';
const suiNetwork = process.env.SUI_NETWORK || 'https://fullnode.testnet.sui.io:443';
const prisma = new PrismaClient();

function getKeypair(): Ed25519Keypair {
  if (mnemonic) {
    return Ed25519Keypair.deriveKeypair(mnemonic);
  }
  if (privateKey) {
    if (privateKey.startsWith('suiprivkey')) {
      const { secretKey } = decodeSuiPrivateKey(privateKey.trim());
      return Ed25519Keypair.fromSecretKey(secretKey);
    }
    const trimmed = privateKey.trim();
    const hex = trimmed.startsWith('0x') ? trimmed.slice(2) : trimmed;
    return Ed25519Keypair.fromSecretKey(Uint8Array.from(Buffer.from(hex, 'hex')));
  }
  throw new Error('PRIVATE_KEY or MNEMONIC must be set');
}

async function createMarket() {
  if (!packageId) {
    throw new Error('PACKAGE_ID or SUI_PACKAGE_ID must be set');
  }

  const keypair = getKeypair();
  const client = new SuiClient({ url: suiNetwork });

  console.log('🚀 Creating shared marketplace object...\n');

  const tx = new Transaction();
  tx.moveCall({
    target: `${packageId}::marketplace::init_market`,
    arguments: [],
    typeArguments: [],
  });
  tx.setGasBudget(10_000_000);

  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: { showEffects: true, showEvents: true },
  });

  if (result.effects?.status.status !== 'success') {
    throw new Error(`Failed to create market: ${result.effects?.status.error ?? 'Unknown'}`);
  }

  const created = (result.effects?.created ?? []) as any[];
  console.log('created objects:', created);
  const marketRef = created[0]?.reference;
  if (!marketRef) {
    throw new Error('Created object missing reference');
  }
  const market = await client.getObject({
    id: marketRef.objectId,
    options: { showType: true },
  });
  if (!market.data?.type || !market.data.type.includes('marketplace::Market')) {
    throw new Error('Created object is not a Market');
  }

  const marketId = marketRef.objectId;
  console.log('\n✅ Market created successfully!');
  console.log(`📍 Market ID: ${marketId}\n`);

  // Save to database
  console.log('💾 Saving to database...');
  try {
    const config = await prisma.marketplaceConfig.upsert({
      where: { id: 'default' },
      update: {
        marketId,
        packageId,
      },
      create: {
        id: 'default',
        marketId,
        packageId,
        suiNetwork: 'testnet',
      },
    });

    console.log('✅ Database saved successfully!\n');
    console.log('Configuration Details:');
    console.log(`  Package ID: ${config.packageId}`);
    console.log(`  Market ID: ${config.marketId}`);
    console.log(`  Network: ${config.suiNetwork}\n`);
  } catch (error) {
    console.warn('⚠️  Warning: Could not save to database');
    console.warn('  This may happen if database connection is not available');
    console.warn('  You can manually add the Market ID to .env.local\n');
  }

  // Update .env.local file
  console.log('📝 Updating .env.local...');
  const envLocalPath = path.join(__dirname, '../.env.local');
  
  try {
    let envContent = '';
    if (fs.existsSync(envLocalPath)) {
      envContent = fs.readFileSync(envLocalPath, 'utf-8');
    }

    // Update or add NEXT_PUBLIC_MARKET_ID
    if (envContent.includes('NEXT_PUBLIC_MARKET_ID=')) {
      envContent = envContent.replace(
        /NEXT_PUBLIC_MARKET_ID=.*/,
        `NEXT_PUBLIC_MARKET_ID="${marketId}"`
      );
    } else {
      envContent += `\nNEXT_PUBLIC_MARKET_ID="${marketId}"`;
    }

    // Update or add NEXT_PUBLIC_PACKAGE_ID
    if (envContent.includes('NEXT_PUBLIC_PACKAGE_ID=')) {
      envContent = envContent.replace(
        /NEXT_PUBLIC_PACKAGE_ID=.*/,
        `NEXT_PUBLIC_PACKAGE_ID="${packageId}"`
      );
    } else {
      envContent += `\nNEXT_PUBLIC_PACKAGE_ID="${packageId}"`;
    }

    fs.writeFileSync(envLocalPath, envContent);
    console.log('✅ .env.local updated!\n');
  } catch (error) {
    console.warn('⚠️  Warning: Could not update .env.local');
    console.warn('  Please manually add these lines:\n');
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('SETUP COMPLETE! Here\'s what you need to do:');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('1️⃣  Add these to your .env.local (if not already added):\n');
  console.log(`   NEXT_PUBLIC_PACKAGE_ID="${packageId}"`);
  console.log(`   NEXT_PUBLIC_MARKET_ID="${marketId}"\n`);

  console.log('2️⃣  Restart your development server:\n');
  console.log('   npm run dev\n');

  console.log('3️⃣  Your marketplace is now ready to use!\n');
  console.log('═══════════════════════════════════════════════════════════');
}

async function main() {
  try {
    await createMarket();
    await prisma.$disconnect();
  } catch (error: any) {
    console.error('❌ Error creating market:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
