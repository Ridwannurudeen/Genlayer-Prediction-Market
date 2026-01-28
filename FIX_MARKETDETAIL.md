# MarketDetail.tsx - Quick Fix

## The Problem
Current code (around line 118-120):
```javascript
if (useBlockchain && market.base_contract_address) {
```

This only prompts wallet if `base_contract_address` exists. Old markets don't have this.

## The Fix

Open: `src/pages/MarketDetail.tsx`

Find this code (around line 118):
```javascript
      // If market has a Base contract and user wants on-chain trading
      if (useBlockchain && market.base_contract_address) {
        const result = await buyShares({
          contractAddress: market.base_contract_address,
```

Change to:
```javascript
      // Use blockchain trading if toggle is on AND user is on Base Sepolia
      if (useBlockchain && isOnBase) {
        const result = await buyShares({
          contractAddress: market.base_contract_address || "",
```

## Full handleTrade Function (Copy & Replace)

Find the `handleTrade` function and replace it entirely with this:

```javascript
  const handleTrade = async () => {
    if (!isConnected) {
      setWalletModalOpen(true);
      return;
    }

    if (!market || !amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const price = selectedOutcome === "yes" 
      ? Number(market.probability) / 100 
      : (100 - Number(market.probability)) / 100;
    
    const tradeAmount = parseFloat(amount);
    const shares = tradeAmount / price;

    try {
      // Use blockchain trading if toggle is on AND user is on Base Sepolia
      if (useBlockchain && isOnBase) {
        const result = await buyShares({
          contractAddress: market.base_contract_address || "",
          positionType: selectedOutcome,
          amount: tradeAmount,
        });
        
        if (result.success) {
          // Update probability after successful blockchain trade
          await updateProbabilityAfterTrade(market.id, selectedOutcome, tradeAmount);
          
          // Also record in database for portfolio tracking
          try {
            await createTrade.mutateAsync({
              marketId: market.id,
              positionType: selectedOutcome,
              shares,
              price,
            });
          } catch (dbError) {
            console.error("Failed to save trade to database:", dbError);
          }
          
          // Refresh market data to show new probability
          refetch();
        }
      } else {
        // Database-only trading (when blockchain toggle is off or not on Base)
        await createTrade.mutateAsync({
          marketId: market.id,
          positionType: selectedOutcome,
          shares,
          price,
        });
        
        // Update probability for simulated trades too
        await updateProbabilityAfterTrade(market.id, selectedOutcome, tradeAmount);
        refetch();
        
        toast.success(`Successfully bought ${selectedOutcome.toUpperCase()} shares!`);
      }
      
      setAmount("");
      
      // Refresh on-chain data
      if (market.base_contract_address) {
        readMarketData(market.base_contract_address).then((data) => {
          if (data) {
            setOnChainData({
              yesShares: data.yesShares,
              noShares: data.noShares,
              isResolved: data.isResolved,
              winner: data.winner,
            });
          }
        });
        getUserPosition(market.base_contract_address).then((pos) => {
          if (pos) setUserPosition(pos);
        });
      }
    } catch (error: any) {
      if (!error.message?.includes("rejected") && !error.message?.includes("cancelled")) {
        toast.error(error.message || "Trade failed");
      }
    }
  };
```

## Key Changes

1. `useBlockchain && market.base_contract_address` → `useBlockchain && isOnBase`
2. `contractAddress: market.base_contract_address` → `contractAddress: market.base_contract_address || ""`

This ensures wallet ALWAYS prompts when:
- User has blockchain toggle ON
- User is connected to Base Sepolia

The useBaseTrading hook will then:
- Use REAL contract if valid address exists
- Fall back to simulated trading (self-transfer) if no contract
- Both paths prompt the wallet!
