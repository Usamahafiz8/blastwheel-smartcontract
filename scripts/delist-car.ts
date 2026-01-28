/**
 * Delist Car Script
 * 
 * Removes a car from the marketplace listing so the owner regains possession.
 * 
 * Usage:
 *   npx ts-node scripts/delist-car.ts <carType> <carObjectId>
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
const marketId = process.env.MARKET_ID;
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

async function delistCar(carType: string, carId: string) {
  if (!packageId) throw new Error('PACKAGE_ID must be set');
  if (!marketId) throw new Error('MARKET_ID must be set');

  const keypair = getKeypair();
  const client = new SuiClient({ url: suiNetwork });

  console.log('Delisting car:', carId, 'type:', carType);

  const typeArgument = `${packageId}::cars::${carType}`;
  const tx = new Transaction();

  tx.moveCall({
    target: `${packageId}::marketplace::delist`,
    arguments: [
      tx.object(marketId),
      tx.pure.address(carId),
    ],
    typeArguments: [typeArgument],
  });

  tx.setGasBudget(10_000_000);

  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: { showEffects: true, showEvents: true },
  });

  const effects = result.effects;
  if (!effects || effects.status?.status !== 'success') {
    const error = effects?.status?.error ?? 'Unknown';
    throw new Error(`Delist failed: ${error}`);
  }

  console.log('✅ Car delisted:', result.digest);
}

async function main() {
  const carType = process.argv[2];
  const carId = process.argv[3];

  if (!carType || !carId) {
    console.error('Usage: npx ts-node scripts/delist-car.ts <carType> <carObjectId>');
    process.exit(1);
  }

  try {
    await delistCar(carType, carId);
  } catch (error: any) {
    console.error('Error delisting car:', error.message);
    process.exit(1);
  }
}

main();

