/**
 * Update NFT Display Script (Simplified)
 * 
 * Updates display metadata for an NFT by its object ID.
 * Pass metadata as key=value pairs.
 * 
 * Usage:
 *   npx ts-node scripts/update-nft-display.ts <nftObjectId> <field>=<value> [field2=value2 ...]
 * 
 * Example:
 *   npx ts-node scripts/update-nft-display.ts 0x1234... image_url=https://new-url.com/image.png
 *   npx ts-node scripts/update-nft-display.ts 0x1234... name="New Car" description="Cool car"
 *   npx ts-node scripts/update-nft-display.ts 0x1234... image_url=https://url.com/img.png name="Car Name" description="Description"
 * 
 * Required Environment Variables:
 *   - PACKAGE_ID: The package ID of the deployed contract
 *   - PUBLISHER_ID: The Publisher object ID
 *   - PRIVATE_KEY or MNEMONIC: Wallet credentials
 */

import { config } from 'dotenv';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import * as path from 'path';

config({ path: path.join(__dirname, '../.env.local') });
config({ path: path.join(__dirname, '../.env') });

const packageId = process.env.PACKAGE_ID || process.env.NFT_PACKAGE_ID;
const publisherId = process.env.PUBLISHER_ID || '';
const suiNetwork = process.env.SUI_NETWORK || 'https://fullnode.mainnet.sui.io:443';
const privateKey = process.env.PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY || '';
const mnemonic = process.env.MNEMONIC || process.env.ADMIN_MNEMONIC || '';
const GAS_BUDGET = 60_000_000;

const VALID_FIELDS = [
  'name', 'image_url', 'description', 'project_url', 'creator',
  'intellectual_property', 'category', 'type', 'mint_number',
];

function getKeypair(): Ed25519Keypair {
  if (mnemonic) return Ed25519Keypair.deriveKeypair(mnemonic);
  if (privateKey) {
    try {
      if (privateKey.startsWith('suiprivkey')) {
        const { secretKey } = decodeSuiPrivateKey(privateKey.trim());
        return Ed25519Keypair.fromSecretKey(secretKey);
      }
      const trimmed = privateKey.trim();
      const hex = trimmed.startsWith('0x') ? trimmed.slice(2) : trimmed;
      return Ed25519Keypair.fromSecretKey(Uint8Array.from(Buffer.from(hex, 'hex')));
    } catch (error) {
      throw new Error(`Failed to create keypair: ${error}`);
    }
  }
  throw new Error('PRIVATE_KEY or MNEMONIC must be set');
}

function extractCarType(nftType: string): string | null {
  const match = nftType.match(/::cars::Car<[^:]+::cars::([^>]+)>/);
  return match?.[1] || null;
}

async function findDisplayId(carType: string, client: SuiClient, signerAddress: string): Promise<string | null> {
  if (!packageId) throw new Error('PACKAGE_ID must be set');
  
  const envKey = `DISPLAY_ID_${carType.toUpperCase()}`;
  if (process.env[envKey]) return process.env[envKey]!;
  
  const NFT_TYPE = `${packageId}::cars::Car<${packageId}::cars::${carType}>`;
  const displayType = `0x2::display::Display<${NFT_TYPE}>`;
  
  // Check signer's objects
  try {
    const objects = await client.getOwnedObjects({
      owner: signerAddress,
      filter: { StructType: displayType },
      options: { showType: true },
    });
    if (objects.data?.[0]?.data?.objectId) return objects.data[0].data.objectId;
  } catch {}
  
  // Check publisher's objects
  if (publisherId) {
    try {
      const objects = await client.getOwnedObjects({
        owner: publisherId,
        filter: { StructType: displayType },
        options: { showType: true },
      });
      if (objects.data?.[0]?.data?.objectId) return objects.data[0].data.objectId;
    } catch {}
  }
  
  return null;
}

function parseMetadata(args: string[]): Record<string, string> {
  const metadata: Record<string, string> = {};
  
  for (const arg of args) {
    const match = arg.match(/^(\w+)=(.*)$/);
    if (!match) {
      throw new Error(`Invalid format: ${arg}. Use field=value format (e.g., image_url=https://url.com)`);
    }
    
    const [, field, value] = match;
    if (!VALID_FIELDS.includes(field)) {
      throw new Error(`Invalid field: ${field}. Valid: ${VALID_FIELDS.join(', ')}`);
    }
    
    // Remove quotes if present
    metadata[field] = value.replace(/^["']|["']$/g, '');
  }
  
  return metadata;
}

async function updateNFTDisplay(nftObjectId: string, metadata: Record<string, string>): Promise<void> {
  if (!packageId) throw new Error('PACKAGE_ID must be set');
  
  const keypair = getKeypair();
  const client = new SuiClient({ url: suiNetwork });
  const signerAddress = keypair.toSuiAddress();
  
  console.log('🔍 Fetching NFT...\n');
  
  const nftObj = await client.getObject({
    id: nftObjectId,
    options: { showType: true, showContent: true, showOwner: true },
  });
  
  if (nftObj.error || !nftObj.data) {
    throw new Error(`NFT not found: ${nftObjectId}`);
  }
  
  const nftType = nftObj.data.type;
  if (!nftType) throw new Error('NFT has no type');
  
  const carType = extractCarType(nftType);
  if (!carType) throw new Error(`Could not detect car type from: ${nftType}`);
  
  console.log(`✅ NFT: ${nftObjectId}`);
  console.log(`🚗 Car Type: ${carType}\n`);
  
  const displayId = await findDisplayId(carType, client, signerAddress);
  if (!displayId) {
    throw new Error(
      `Display not found for ${carType}. ` +
      `Set DISPLAY_ID_${carType.toUpperCase()} in .env or create display first.`
    );
  }
  
  // Get current display values
  const displayObj = await client.getObject({
    id: displayId,
    options: { showDisplay: true },
  });
  
  const currentDisplay = displayObj.data?.display?.data as any;
  
  console.log('🎨 Updating Display Metadata');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`📦 Package: ${packageId}`);
  console.log(`🎨 Display ID: ${displayId}`);
  console.log(`🚗 Car Type: ${carType}`);
  console.log('\n📝 Metadata Updates:');
  
  const NFT_TYPE = `${packageId}::cars::Car<${packageId}::cars::${carType}>`;
  const tx = new Transaction();
  
  // Update each field
  for (const [field, value] of Object.entries(metadata)) {
    const current = currentDisplay?.[field] || '(not set)';
    console.log(`   ${field}: "${current}" → "${value}"`);
    
    tx.moveCall({
      target: '0x2::display::edit',
      arguments: [
        tx.object(displayId),
        tx.pure.string(field),
        tx.pure.string(value),
      ],
      typeArguments: [NFT_TYPE],
    });
  }
  
  // Update version once after all edits
  tx.moveCall({
    target: '0x2::display::update_version',
    arguments: [tx.object(displayId)],
    typeArguments: [NFT_TYPE],
  });
  
  tx.setGasBudget(GAS_BUDGET);
  
  console.log('\n📤 Executing transaction...\n');
  
  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
    options: { showEffects: true },
  });
  
  if (result.effects?.status.status !== 'success') {
    throw new Error(`Transaction failed: ${result.effects?.status.error}`);
  }
  
  console.log('✅ Display Updated Successfully!');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`🔗 Transaction: ${result.digest}`);
  console.log(`💡 All ${carType} NFTs will use the updated display.\n`);
}

async function main() {
  const nftObjectId = process.argv[2];
  const metadataArgs = process.argv.slice(3);
  
  if (!nftObjectId || metadataArgs.length === 0) {
    console.error('❌ Usage: npx ts-node scripts/update-nft-display.ts <nftObjectId> <field>=<value> [field2=value2 ...]');
    console.error('\n📝 Examples:');
    console.error('  npx ts-node scripts/update-nft-display.ts 0x1234... image_url=https://url.com/img.png');
    console.error('  npx ts-node scripts/update-nft-display.ts 0x1234... name="Car Name" description="Description"');
    console.error('  npx ts-node scripts/update-nft-display.ts 0x1234... image_url=https://url.com/img.png name="Name" project_url=https://site.com');
    console.error('\n✅ Valid fields:', VALID_FIELDS.join(', '));
    process.exit(1);
  }
  
  try {
    const metadata = parseMetadata(metadataArgs);
    await updateNFTDisplay(nftObjectId, metadata);
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
