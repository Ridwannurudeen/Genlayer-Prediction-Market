# GenLayer Markets

A decentralized prediction market platform powered by **Base Sepolia** for trading and **GenLayer** for AI-powered market resolution.

![GenLayer Markets](https://img.shields.io/badge/Base-Sepolia-blue) ![GenLayer](https://img.shields.io/badge/GenLayer-AI%20Resolution-purple) ![React](https://img.shields.io/badge/React-18-61dafb) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)

## 🎯 Overview

GenLayer Markets allows users to:
- **Trade** on prediction market outcomes using real ETH on Base Sepolia
- **Create** markets that deploy smart contracts via a factory pattern
- **Resolve** markets using GenLayer's AI-powered validator network
- **Analyze** markets with AI-driven insights

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   GenLayer Markets                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   Base Sepolia (Chain 84532)    GenLayer (Chain 4221)   │
│   ├── Factory Contract          ├── Intelligent Contracts│
│   ├── Market Contracts          ├── AI Validators        │
│   ├── ETH Escrow Trading        └── Consensus Resolution │
│   └── Buy Yes/No Shares                                  │
│                                                          │
│                    Supabase Database                     │
│   ├── markets (metadata, probabilities)                  │
│   ├── trades (user trade history)                        │
│   └── positions (user portfolios)                        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## ✨ Features

### Trading (Base Sepolia)
- 🔐 Real ETH escrow - funds locked in smart contracts
- 📈 Buy YES/NO shares on market outcomes
- 💰 Automatic payout when markets resolve
- 🏭 Factory pattern - each market gets its own contract

### AI Resolution (GenLayer)
- 🤖 AI validators determine market outcomes
- 🌐 Web search for real-world data verification
- ✅ Consensus-based resolution
- 🔗 Fully on-chain and transparent

### User Experience
- 👛 MetaMask wallet integration
- 📊 Real-time probability updates
- 🎨 Dark/Light mode support
- 📱 Responsive design

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MetaMask wallet
- Base Sepolia testnet ETH ([Faucet](https://www.alchemy.com/faucets/base-sepolia))

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/predictandwin.git
cd predictandwin

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

### Environment Variables

Create a `.env` file:

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Factory Contract (Base Sepolia)
VITE_FACTORY_ADDRESS=0xB7F06cC21DeE9b1FC0349d08C72fF5c632feC2d7
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:8080](http://localhost:8080)

## 📖 Usage

### Creating a Market

1. Connect your MetaMask wallet
2. Switch to **Base Sepolia** network
3. Click **"Create"** button
4. Fill in market details:
   - Question (e.g., "Will BTC reach $100k by Dec 2025?")
   - Description
   - Category
   - End date
5. Enable **"Deploy on-chain"** toggle
6. Confirm transaction in MetaMask
7. Your market is live with a real smart contract!

### Trading

1. Open any market with a Base Sepolia contract
2. Select **YES** or **NO**
3. Enter amount in ETH
4. Click **"Buy Yes"** or **"Buy No"**
5. Confirm transaction in MetaMask
6. Your shares are recorded on-chain

### Resolution (Coming Soon)

1. After market end date, resolution can be triggered
2. GenLayer AI validators search for outcome data
3. Validators reach consensus on YES/NO
4. Winners can claim payouts

## 🔧 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui |
| State | TanStack Query |
| Database | Supabase (PostgreSQL) |
| Trading Chain | Base Sepolia |
| Resolution Chain | GenLayer Testnet |
| Wallet | MetaMask (ethers.js) |

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Header.tsx
│   ├── MarketCard.tsx
│   ├── IntelligentContractBadge.tsx
│   └── ui/              # shadcn components
├── hooks/               # Custom React hooks
│   ├── useBaseTrading.ts    # Base Sepolia trading
│   ├── useMarketFactory.ts  # Contract deployment
│   ├── useGenLayer.ts       # GenLayer integration
│   └── useMarkets.ts        # Market data
├── pages/               # Route pages
│   ├── Index.tsx        # Market listing
│   ├── MarketDetail.tsx # Trading interface
│   └── CreateMarket.tsx # Market creation
├── contexts/            # React contexts
│   └── WalletAuthContext.tsx
├── lib/                 # Utilities
│   └── solidityPredictionMarket.ts
└── integrations/        # External services
    └── supabase/
```

## 🔗 Contract Addresses

### Base Sepolia (Chain ID: 84532)
- **Factory**: `0xB7F06cC21DeE9b1FC0349d08C72fF5c632feC2d7`
- **Explorer**: [BaseScan Sepolia](https://sepolia.basescan.org)

### GenLayer Testnet (Chain ID: 4221)
- **Explorer**: [GenLayer Explorer](https://explorer-asimov.genlayer.com)
- **Studio**: [GenLayer Studio](https://studio.genlayer.com)

## 🧪 Testing

```bash
# Run tests
npm test

# Run linting
npm run lint
```

## 🚢 Deployment

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

Deploy the `dist` folder to Vercel, Netlify, or any static hosting.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [GenLayer](https://genlayer.com) - AI-powered blockchain resolution
- [Base](https://base.org) - Ethereum L2 for trading
- [shadcn/ui](https://ui.shadcn.com) - Beautiful UI components
- [Supabase](https://supabase.com) - Backend as a Service

---

**Built for the GenLayer Hackathon** 🏆
