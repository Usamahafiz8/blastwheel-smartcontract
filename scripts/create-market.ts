/**
 * Create Marketplace Script
 * 
 * Spins up a shared Market object so listing/delisting/buying can work.
 * Usage:
 *   npx ts-node scripts/create-market.ts
 */

import { config } from 'dotenv';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import * as path from 'path';

config({ path: path.join(__dirname, '../.env.local') });
config({ path: path.join(__dirname, '../.env') });

const packageId = process.env.PACKAGE_ID;
const privateKey = process.env.PRIVATE_KEY || '';
const mnemonic = process.env.MNEMONIC || '';
const suiNetwork = process.env.SUI_NETWORK || 'https://fullnode.testnet.sui.io:443';

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
    throw new Error('PACKAGE_ID must be set');
  }

  const keypair = getKeypair();
  const client = new SuiClient({ url: suiNetwork });

  console.log('Creating shared marketplace object');

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
  console.log('✅ Market created:', marketRef.objectId);
  console.log('Add to your .env:');
  console.log(`MARKET_ID=${marketRef.objectId}`);
}

async function main() {
  try {
    await createMarket();
  } catch (error: any) {
    console.error('Error creating market:', error.message);
    process.exit(1);
  }
}

main();

