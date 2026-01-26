/**
 * Buy Car Script
 * 
 * Purchases a listed car by transferring the exact price in SUI.
 * 
 * Usage:
 *   npx ts-node scripts/buy-car.ts <carType> <carObjectId> <price>
 * 
 * Required Environment Variables:
 *   - PACKAGE_ID
 *   - MARKET_ID
 *   - PRIVATE_KEY or MNEMONIC (buyer wallet)
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
const privateKey = process.env.PRIVATE_KEY || process.env.BUYER_PRIVATEKEYS || '';
const mnemonic = process.env.MNEMONIC || process.env.BUYER_MNEMONIC || '';
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

async function getPaymentCoin(tx: Transaction, paymentCoins: any[], amount: bigint) {
  if (!paymentCoins || paymentCoins.length === 0) {
    throw new Error('No SUI coins available for payment');
  }

  let totalBalance = BigInt(0);
  for (const coin of paymentCoins) {
    totalBalance += BigInt(coin.balance || '0');
  }
  if (totalBalance < amount) {
    throw new Error(`Insufficient balance for payment (${totalBalance} < ${amount})`);
  }

  const coinObjects = paymentCoins.map((coin) => tx.object(coin.coinObjectId));
  const primaryCoin: any = coinObjects[0];
  if (coinObjects.length > 1) {
    // Merge mutates `coinObjects[0]` in place; it does not return a coin.
    tx.mergeCoins(coinObjects[0], coinObjects.slice(1));
  }

  // splitCoins returns a vector of results; take the first coin (NestedResult 0)
  const splitResult: any = tx.splitCoins(primaryCoin, [amount]);
  const paymentCoin: any = splitResult[0];
  console.log('paymentCoin handle:', paymentCoin);
  return paymentCoin;
}

async function buyCar(carType: string, carId: string, price: bigint) {
  if (!packageId) throw new Error('PACKAGE_ID must be set');
  if (!marketId) throw new Error('MARKET_ID must be set');

  const keypair = getKeypair();
  const client = new SuiClient({ url: suiNetwork });
  const buyerAddress = keypair.toSuiAddress();

  console.log('Buying car:', carId);
  console.log('  carType:', carType);
  console.log('  price:', price.toString());
  console.log('  buyer:', buyerAddress);

  const coinResult = await client.getCoins({ owner: buyerAddress, coinType: '0x2::sui::SUI' });
  const coins = [...coinResult.data];
  if (!coins || coins.length === 0) {
    throw new Error('Buyer has no SUI coins');
  }
  console.log('buyer coins:', coins.map((coin) => ({ id: coin.coinObjectId, balance: coin.balance })));

  // Keep 1 coin untouched so the builder can use it as gas.
  const gasCoin = coins.pop();
  if (!gasCoin) throw new Error('Buyer has no gas coin');

  const tx = new Transaction();
  const paymentCoin = await getPaymentCoin(tx, coins, price);

  const typeArgument = `${packageId}::cars::${carType}`;
  tx.moveCall({
    target: `${packageId}::marketplace::buy`,
    arguments: [
      tx.object(marketId),
      tx.pure.address(carId),
      paymentCoin,
    ],
    typeArguments: [typeArgument],
  });

  tx.setGasBudget(15_000_000);

  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: { showEffects: true, showEvents: true },
  });

  const effects = result.effects;
  if (!effects || effects.status?.status !== 'success') {
    const error = effects?.status?.error ?? 'Unknown';
    throw new Error(`Buy failed: ${error}`);
  }

  console.log('✅ Car purchased:', result.digest);
}

async function main() {
  const carType = process.argv[2];
  const carId = process.argv[3];
  const priceArg = process.argv[4];

  if (!carType || !carId || !priceArg) {
    console.error('Usage: npx ts-node scripts/buy-car.ts <carType> <carObjectId> <price>');
    process.exit(1);
  }

  try {
    await buyCar(carType, carId, BigInt(priceArg));
  } catch (error: any) {
    console.error('Error buying car:', error.message);
    process.exit(1);
  }
}

main();

