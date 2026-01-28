# 🔐 Smart Contract Deployment Guide

## Overview

This guide helps you deploy the **real** Prediction Market smart contracts to Base Sepolia.

### What These Contracts Do:
1. **PredictionMarketFactory** - Creates new market contracts
2. **PredictionMarket** - Holds funds, tracks shares, distributes winnings

### Flow After Deployment:
```
User creates market → Factory deploys new PredictionMarket contract
                                    ↓
User buys YES/NO → ETH sent to contract (escrow)
                                    ↓
Market ends → Creator resolves (YES or NO wins)
                                    ↓
Winners claim → Contract auto-distributes ETH
```

---

## Step 1: Setup Contracts Folder

Create a new folder for contracts:

```cmd
cd C:\Users\GUDMAN\Downloads
mkdir prediction-contracts
cd prediction-contracts
```

Copy these files into it:
- `contracts/PredictionMarket.sol`
- `contracts/PredictionMarketFactory.sol`
- `scripts/deploy.js`
- `hardhat.config.js`
- `contracts-package.json` → rename to `package.json`

---

## Step 2: Install Dependencies

```cmd
cd C:\Users\GUDMAN\Downloads\prediction-contracts
npm install
```

---

## Step 3: Configure Environment

Create a `.env` file:

```cmd
notepad .env
```

Add your private key (the wallet you'll deploy from):

```env
PRIVATE_KEY=your_wallet_private_key_here
BASE_SEPOLIA_RPC=https://sepolia.base.org
BASESCAN_API_KEY=optional_for_verification
```

⚠️ **IMPORTANT**: 
- Use a **testnet wallet** with Base Sepolia ETH
- NEVER use your mainnet private key
- Get free ETH: https://www.alchemy.com/faucets/base-sepolia

### How to Get Private Key from MetaMask:
1. Open MetaMask
2. Click the 3 dots → Account Details
3. Click "Show Private Key"
4. Enter your password
5. Copy the key (starts with 0x or without)

---

## Step 4: Compile Contracts

```cmd
npx hardhat compile
```

You should see:
```
Compiled 2 Solidity files successfully
```

---

## Step 5: Deploy to Base Sepolia

```cmd
npx hardhat run scripts/deploy.js --network baseSepolia
```

You'll see output like:
```
🚀 Deploying PredictionMarketFactory to Base Sepolia...

Deployer address: 0xYourAddress
Deployer balance: 0.1 ETH

Deploying PredictionMarketFactory...
✅ PredictionMarketFactory deployed to: 0xFactoryAddress

📋 DEPLOYMENT SUMMARY
====================================
Network:          Base Sepolia
Factory Address:  0x1234...abcd
Block Explorer:   https://sepolia.basescan.org/address/0x1234...abcd
```

**SAVE THE FACTORY ADDRESS!** You'll need it.

---

## Step 6: Update Your App

Add the Factory address to your `.env`:

```cmd
notepad C:\Users\GUDMAN\Downloads\predictandwin\.env
```

Add this line:
```env
VITE_FACTORY_ADDRESS=0xYourFactoryAddressHere
```

---

## Step 7: Copy Updated Hooks

Copy these files to your app:

| File | Destination |
|------|-------------|
| `hooks/useRealContract.ts` | `src/hooks/useRealContract.ts` |
| `hooks/useBaseTrading.ts` | `src/hooks/useBaseTrading.ts` |

---

## Step 8: Restart App

```cmd
cd C:\Users\GUDMAN\Downloads\predictandwin
npm run dev
```

---

## How It Works Now

### Before (Simulated):
```
User trades → Sends ETH to THEMSELVES → Database updated
                    (no real escrow)
```

### After (Real Contract):
```
User trades → Sends ETH to CONTRACT → Contract holds funds
                                            ↓
                                    Shares tracked on-chain
                                            ↓
                                    Resolution by creator
                                            ↓
                                    Auto-payout to winners
```

---

## Testing the Real Contract

### 1. Create a Market On-Chain
- Go to Create Market page
- Fill in details
- The factory will deploy a new contract

### 2. Trade
- Buy YES or NO shares
- ETH goes to the contract (not your wallet!)
- Check contract balance on BaseScan

### 3. Resolve
- After end date, creator resolves
- Winners can claim

### 4. Claim Winnings
- Winners see "Claim" button
- Click to receive ETH from contract

---

## Contract Addresses Reference

After deployment, save these:

| Contract | Address |
|----------|---------|
| Factory | `0x...` (from deployment) |
| Your First Market | `0x...` (created via factory) |

---

## Troubleshooting

### "Insufficient funds"
Get free Base Sepolia ETH: https://www.alchemy.com/faucets/base-sepolia

### "Only creator can resolve"
Only the wallet that created the market can resolve it.

### "Market not ended"
Wait until the end date passes before resolving.

### "Transaction failed"
Check BaseScan for detailed error messages.

---

## Security Notes

⚠️ **For Testnet Only**
- These contracts are NOT audited
- Do NOT deploy to mainnet without a security audit
- Never use real funds for testing

---

## Contract Features

### PredictionMarket.sol
- ✅ Buy YES/NO shares
- ✅ Escrow funds
- ✅ Creator resolution
- ✅ Auto-calculate winnings
- ✅ 2% platform fee
- ✅ Emergency owner resolution

### PredictionMarketFactory.sol
- ✅ Create new markets
- ✅ Track all markets
- ✅ Query markets by creator
- ✅ Free creation (testnet)

---

## Next Steps After Deployment

1. ✅ Test creating markets
2. ✅ Test buying shares
3. ✅ Test resolution
4. ✅ Test claiming winnings
5. 🔜 Add real contract integration to UI
6. 🔜 Security audit (before mainnet)
