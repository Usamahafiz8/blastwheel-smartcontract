# How to Get Private Key or Mnemonic from Sui CLI

## Get Private Key (Bech32 Format - Recommended)

The Sui CLI exports private keys in Bech32 format (starts with `suiprivkey`), which is the recommended format.

### Step 1: List all addresses
```bash
sui client addresses
```

### Step 2: Export private key using alias or address
```bash
# Using alias (recommended)
sui keytool export --key-identity <alias>

# Example:
sui keytool export --key-identity stoic-zircon
```

### Step 3: Copy the exported private key
The output will show:
```
exportedPrivateKey: suiprivkey1qrh5jellr0ycewxv74pqt7r2w4tykfl33uppnnz7cg9769qu6zxzymsf2ss
```

## Get Private Key (Alternative Methods)

### Export using address directly
```bash
sui keytool export --key-identity 0x1145dfd28e06685d6e5b5f612ea5afdabddc41befec2a41c066aba3faab2b0a8
```

### Get active address
```bash
sui client active-address
```

## About Mnemonics

**Important:** The Sui CLI does NOT store mnemonic phrases. It only stores derived private keys.

- If you created the address with `sui client new-address`, you should have saved the mnemonic at that time
- If you imported a key with `sui keytool import`, you would have used a mnemonic, but the CLI doesn't store it
- **You cannot retrieve a mnemonic from the CLI** - you must have saved it when creating/importing the address

## Using the Private Key in Your Script

Add the exported private key to your `.env` file:

```env
PRIVATE_KEY=suiprivkey1qrh5jellr0ycewxv74pqt7r2w4tykfl33uppnnz7cg9769qu6zxzymsf2ss
```

Or if you have a mnemonic (that you saved separately):
```env
MNEMONIC=word1 word2 word3 ... word12
```

## Quick Commands Reference

```bash
# List all addresses
sui client addresses

# Get active address
sui client active-address

# Export private key (use alias or address)
sui keytool export --key-identity <alias-or-address>

# List all keys with details
sui keytool list
```
