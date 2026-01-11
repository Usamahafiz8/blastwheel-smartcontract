/**
 * Create Supply Script
 * 
 * Creates supply tracking for a car type with max supply limit.
 * 
 * Usage:
 *   npx ts-node scripts/create-supply.ts <carType> <maxSupply>
 * 
 * Example:
 *   npx ts-node scripts/create-supply.ts HeBoomanator 1000
 *   npx ts-node scripts/create-supply.ts SuipremeSupra 500
 */

import { config } from 'dotenv';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import * as fs from 'fs';
import * as path from 'path';

config({ path: path.join(__dirname, '../.env.local') });
config({ path: path.join(__dirname, '../.env') });

const CAR_TYPES = [
  'HeBoomanator', 'SuipremeSupra', 'GoldenToiletGT', 'FordFMBP1974',
  'SuiverseRegera', 'AquaGTR', 'SkelSuiEnergyGT25', 'MercedesBuildersG550',
  'ArkLiveCyberVenture', 'AstonManni', 'Juggernaut', 'NightViper',
  'BlazeHowler', 'CrimsonPhantom', 'IronNomad', 'NeonFang',
  'RedlineReaper', 'BlueRupture', 'VenomCircuit', 'UltraPulse',
  'ScarletDominion', 'SolarDrift', 'AzureStrike', 'BloodApex',
  'VelocityWarden', 'ToxicSurge', 'GoldenRevenant', 'MidnightBrawler',
  'PhantomVector', 'EmeraldHavoc', 'HyperDune', 'BlastFun',
];

const packageId = process.env.PACKAGE_ID;
const adminCapId = process.env.ADMIN_CAP_ID;
const suiNetwork = process.env.SUI_NETWORK || 'https://fullnode.mainnet.sui.io:443';
const privateKey = process.env.PRIVATE_KEY || '';
const mnemonic = process.env.MNEMONIC || '';

function getKeypair(): Ed25519Keypair {
  if (mnemonic) return Ed25519Keypair.deriveKeypair(mnemonic);
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

async function createSupply(carType: string, maxSupply: number): Promise<void> {
  if (!packageId) throw new Error('PACKAGE_ID must be set');
  if (!adminCapId) throw new Error('ADMIN_CAP_ID must be set');
  if (!CAR_TYPES.includes(carType)) throw new Error(`Invalid car type: ${carType}`);
  if (maxSupply <= 0) throw new Error('Max supply must be greater than 0');

  const keypair = getKeypair();
  const client = new SuiClient({ url: suiNetwork });
  const address = keypair.toSuiAddress();

  console.log('📦 Creating Supply');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`📦 Package ID: ${packageId}`);
  console.log(`🔑 Admin Cap ID: ${adminCapId}`);
  console.log(`🚗 Car Type: ${carType}`);
  console.log(`🔢 Max Supply: ${maxSupply}`);
  console.log(`🌐 Network: ${suiNetwork}`);
  console.log(`👤 Wallet: ${address}`);
  console.log('═══════════════════════════════════════════════════════\n');

  const balance = await client.getBalance({ owner: address });
  const balanceSui = parseInt(balance.totalBalance) / 1_000_000_000;
  console.log(`💰 Balance: ${balanceSui} SUI\n`);

  const typeArgument = `${packageId}::cars::${carType}`;
  const tx = new Transaction();

  tx.moveCall({
    target: `${packageId}::cars::create_supply`,
    arguments: [
      tx.object(adminCapId),
      tx.pure.u64(maxSupply),
    ],
    typeArguments: [typeArgument],
  });

  tx.setGasBudget(10_000_000);

  console.log('📤 Executing transaction...\n');

  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: { showObjectChanges: true, showEffects: true },
  });

  if (result.effects?.status.status !== 'success') {
    throw new Error(`Transaction failed: ${result.effects?.status.error}`);
  }

  const supply = result.objectChanges?.find(
    (change: any) => change.type === 'created' && change.objectType?.includes('Supply')
  ) as { type: string; objectId: string; objectType: string } | undefined;

  if (!supply) {
    throw new Error('Supply created but object ID not found');
  }

  console.log('✅ Supply Created Successfully!');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`📦 Supply ID: ${supply.objectId}`);
  console.log(`🔗 Transaction: ${result.digest}`);
  console.log(`📦 Object Type: ${supply.objectType}`);
  console.log('═══════════════════════════════════════════════════════\n');

  // Save to file
  const outputFile = path.join(__dirname, '../supplies.json');
  let supplies: Record<string, string> = {};
  if (fs.existsSync(outputFile)) {
    supplies = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
  }
  supplies[carType] = supply.objectId;
  fs.writeFileSync(outputFile, JSON.stringify(supplies, null, 2));
  console.log(`💾 Supply ID saved to: ${outputFile}\n`);
  console.log(`📝 Add to your .env file:`);
  console.log(`SUPPLY_${carType.toUpperCase()}=${supply.objectId}\n`);
}

async function main() {
  const carType = process.argv[2];
  const maxSupply = process.argv[3] ? parseInt(process.argv[3]) : undefined;

  if (!carType || !maxSupply) {
    console.error('❌ Error: Car type and max supply are required');
    console.log('\nUsage:');
    console.log('  npx ts-node scripts/create-supply.ts <carType> <maxSupply>');
    console.log('\nExample:');
    console.log('  npx ts-node scripts/create-supply.ts HeBoomanator 1000');
    console.log('\nValid car types:');
    CAR_TYPES.forEach(type => console.log(`  - ${type}`));
    process.exit(1);
  }

  try {
    await createSupply(carType, maxSupply);
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
