/**
 * List Car Script
 * 
 * Locks a minted car NFT inside the marketplace and publishes the listing.
 * 
 * Usage:
 *   npx ts-node scripts/list-car.ts <carType> <carObjectId> <price>
 * 
 * Required Environment Variables:
 *   - PACKAGE_ID
 *   - MARKET_ID
 *   - PRIVATE_KEY or MNEMONIC (signer)
 *   - SUI_NETWORK (defaults to https://fullnode.testnet.sui.io:443)
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

async function listCar(carType: string, carId: string, price: bigint) {
  if (!packageId) throw new Error('PACKAGE_ID must be set');
  if (!marketId) throw new Error('MARKET_ID must be set');

  const keypair = getKeypair();
  const client = new SuiClient({ url: suiNetwork });
  const address = keypair.toSuiAddress();

  console.log('Listing car');
  console.log('  carType:', carType);
  console.log('  carId:', carId);
  console.log('  price:', price.toString());
  console.log('  marketId:', marketId);
  console.log('  network:', suiNetwork);
  console.log('  signer:', address);

  const typeArgument = `${packageId}::cars::${carType}`;
  const tx = new Transaction();

  tx.moveCall({
    target: `${packageId}::marketplace::list`,
    arguments: [
      tx.object(marketId),
      tx.object(carId),
      tx.pure.u64(price),
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
    throw new Error(`Listing failed: ${error}`);
  }

  console.log('✅ Car listed successfully');
  console.log('  digest:', result.digest);
}

async function main() {
  const carType = process.argv[2];
  const carId = process.argv[3];
  const priceArg = process.argv[4];

  if (!carType || !carId || !priceArg) {
    console.error('Usage: npx ts-node scripts/list-car.ts <carType> <carObjectId> <price>');
    process.exit(1);
  }

  try {
    await listCar(carType, carId, BigInt(priceArg));
  } catch (error: any) {
    console.error('Error listing car:', error.message);
    process.exit(1);
  }
}

main();

