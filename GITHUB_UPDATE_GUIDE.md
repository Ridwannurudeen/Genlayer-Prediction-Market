# PredictAndWin - Factory Integration Update

## Overview

This update adds **Base Sepolia factory deployment** while maintaining **GenLayer AI resolution** compatibility. This creates a **hybrid architecture** perfect for demonstrating to the GenLayer team:

- **GenLayer**: AI-powered market resolution via Intelligent Contracts
- **Base Sepolia**: Real on-chain trading with escrowed ETH

## Files to Replace

Copy these files to your project, replacing existing files:

```
hooks/useBaseTrading.ts    → src/hooks/useBaseTrading.ts    (REPLACE)
hooks/useMarketFactory.ts  → src/hooks/useMarketFactory.ts  (NEW FILE)
hooks/useMarkets.ts        → src/hooks/useMarkets.ts        (REPLACE)
pages/CreateMarket.tsx     → src/pages/CreateMarket.tsx     (REPLACE)
pages/MarketDetail.tsx     → src/pages/MarketDetail.tsx     (REPLACE)
```

## New Features

### 1. Factory Contract Deployment
- New markets deploy via PredictionMarketFactory on Base Sepolia
- Factory address: `0xB7F06cC21DeE9b1FC0349d08C72fF5c632feC2d7`
- Automatic contract creation with proper escrow

### 2. "Deploy to Base" Button for Old Markets
- Old markets without Base contracts show upgrade option
- One-click deployment adds on-chain trading
- Database auto-updated with new contract address

### 3. Fixed Trading Hook
- Correct ABI for factory-deployed contracts (`buyYes()` / `buyNo()`)
- Proper MetaMask integration
- ETH sent to contract (not to self)

### 4. Hybrid Market Display
- Shows both GenLayer and Base badges when applicable
- Contract links to respective explorers
- On-chain pool data displayed in real-time

## Git Commands to Push

```bash
# Navigate to your project
cd predictandwin

# Stage all changes
git add .

# Commit with descriptive message
git commit -m "feat: Base Sepolia factory integration with hybrid GenLayer support

- Add useMarketFactory hook for factory deployments
- Fix useBaseTrading with correct ABI (buyYes/buyNo)
- Add Deploy to Base button for old markets
- Fix useMarkets filter bug (All category)
- Update CreateMarket for factory deployment
- Update MarketDetail with hybrid contract display
- Maintain GenLayer AI resolution compatibility"

# Push to GitHub
git push origin main
```

## Contract Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PredictAndWin App                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────┐    ┌─────────────────────┐         │
│  │   GenLayer Testnet  │    │   Base Sepolia      │         │
│  │   (Chain 4221)      │    │   (Chain 84532)     │         │
│  ├─────────────────────┤    ├─────────────────────┤         │
│  │ Intelligent Contract│    │ PredictionMarket    │         │
│  │ - AI Resolution     │    │ Factory             │         │
│  │ - Validator Voting  │    │ - Deploy Markets    │         │
│  │                     │    │ - Create Escrows    │         │
│  └─────────────────────┘    └─────────────────────┘         │
│           │                          │                       │
│           └──────────┬───────────────┘                       │
│                      │                                       │
│           ┌──────────▼───────────┐                          │
│           │     Supabase DB      │                          │
│           │ - intelligent_contract_address (GenLayer)       │
│           │ - base_contract_address (Base)                  │
│           │ - Market metadata                               │
│           └──────────────────────┘                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Testing Checklist

After deploying, test these scenarios:

### New Market Creation
- [ ] Create market with Base Sepolia deployment
- [ ] MetaMask prompts for factory.createMarket()
- [ ] Contract address saved to database
- [ ] Market appears with Base badge

### Old Market Upgrade
- [ ] Open old market (GenLayer only)
- [ ] "Deploy to Base" card appears
- [ ] Click Deploy → MetaMask prompt
- [ ] Contract deployed and saved
- [ ] Page refreshes with Base status

### Trading
- [ ] Buy Yes shares on Base market
- [ ] ETH goes to contract (check BaseScan)
- [ ] Pool balances update
- [ ] User position shows

### Filter Fix
- [ ] "All" category shows all markets
- [ ] Other filters work correctly

## Troubleshooting

### "0 markets" showing
- Check Supabase connection (network timeout?)
- Verify `.env` has correct VITE_SUPABASE_URL

### Trade sends ETH to self
- Make sure `useBaseTrading.ts` is updated
- Contract must use `buyYes()`/`buyNo()` not `buyShares()`

### Deploy button not working
- Must be on Base Sepolia network
- Check factory address is correct
- Get testnet ETH: https://www.alchemy.com/faucets/base-sepolia

## Factory Contract Info

- **Network**: Base Sepolia (Chain ID: 84532)
- **Factory**: `0xB7F06cC21DeE9b1FC0349d08C72fF5c632feC2d7`
- **Explorer**: https://sepolia.basescan.org/address/0xB7F06cC21DeE9b1FC0349d08C72fF5c632feC2d7

## Questions?

The app now supports:
1. **Old markets**: GenLayer resolution + optional Base trading
2. **New markets**: Base trading (can add GenLayer later)
3. **Full hybrid**: Both GenLayer and Base on same market
