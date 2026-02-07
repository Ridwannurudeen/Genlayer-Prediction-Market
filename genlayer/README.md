# GenLayer Intelligent Contracts

This directory contains **Python-based Intelligent Contracts** for GenLayer AI-powered market resolution.

## 📁 Files

| File | Description |
|------|-------------|
| `prediction_market.py` | Main contract for AI-powered market resolution |

## 🧠 What are Intelligent Contracts?

Unlike traditional Solidity smart contracts, GenLayer Intelligent Contracts:

- ✅ **Written in Python** - Using the `genlayer` SDK
- ✅ **Access the Web** - Fetch real-time data from any URL
- ✅ **Use AI/LLMs** - Interpret natural language and make decisions
- ✅ **Consensus via Equivalence Principle** - Multiple validators agree on outcomes

## 📝 PredictionMarket Contract

### Overview

The `PredictionMarket` contract resolves prediction market outcomes by:

1. Fetching data from configured web sources
2. Using LLM to interpret the data
3. Determining YES/NO outcome via validator consensus
4. Storing the result on-chain

### Methods

#### Read Methods (View)

| Method | Returns |
|--------|---------|
| `get_status()` | Market question, resolution state, outcome, confidence |
| `can_resolve()` | Whether market can be resolved and reason |
| `get_resolution_sources()` | List of URLs used for resolution |

#### Write Methods

| Method | Description |
|--------|-------------|
| `resolve()` | Triggers AI resolution - fetches web data, runs LLM, reaches consensus |
| `add_resolution_source(url)` | Adds a new URL for resolution (creator only) |

### State Variables
```python
has_resolved: bool        # Whether market has been resolved
question: str             # The prediction question
description: str          # Resolution criteria
end_date: str             # Market end date (YYYY-MM-DD)
resolution_sources: DynArray[str] # URLs to check for outcome
outcome: i8               # -1=pending, 0=NO, 1=YES
confidence: float         # AI confidence (0.0-1.0)
resolution_reasoning: str # Explanation of decision
creator: Address          # Address that created the market
```

### Example Usage
```python
# Deploy with constructor arguments
market = PredictionMarket(
    question="Will Bitcoin reach $100,000 by December 31, 2025?",
    description="Resolved YES if BTC/USD exceeds $100,000 on any major exchange",
    end_date="2025-12-31",
    resolution_sources=[
        "https://www.coindesk.com/price/bitcoin/",
        "https://www.coingecko.com/en/coins/bitcoin"
    ]
)

# Check status
status = market.get_status()
# Returns: {"question": "...", "has_resolved": False, "outcome": -1, ...}

# Trigger resolution (after end_date)
result = market.resolve()
# Returns: {"success": True, "outcome": 1, "outcome_label": "YES", "confidence": 0.95, ...}
```

## 🔗 How It Integrates
```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│   Base Sepolia      │     │      GenLayer       │     │      Frontend       │
│   (Trading)         │◄────│   (Resolution)      │◄────│      (React)        │
│                     │     │                     │     │                     │
│ • Buy YES/NO shares │     │ • Fetch web data    │     │ • Display markets   │
│ • ETH escrow        │     │ • LLM interpretation│     │ • Trigger resolve   │
│ • Claim payouts     │     │ • Validator consensus│    │ • Show results      │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
```

## 📚 Resources

- [GenLayer Documentation](https://docs.genlayer.com)
- [Intelligent Contracts Guide](https://docs.genlayer.com/developers/intelligent-contracts/introduction)
- [Prediction Market Example](https://docs.genlayer.com/developers/intelligent-contracts/examples/prediction)
- [GenLayer Studio](https://studio.genlayer.com)

## ✅ Smoke Check

Run a quick status verification against a deployed GenLayer contract or tx hash:

```bash
node scripts/genlayer-status-smoke.mjs --address 0xYOUR_CONTRACT_ADDRESS
# or
GENLAYER_TX=0xYOUR_TX_HASH npm run genlayer:smoke
```

## ⚠️ Important Notes

1. **Equivalence Principle**: Uses `gl.eq_principle_strict_eq()` to ensure all validators produce the same result

2. **Confidence Threshold**: Only finalizes if confidence ≥ 0.7

3. **Resolution Sources**: Use reliable, stable URLs that won't block requests

## 📄 License

MIT License
