import { Market } from "@/types/market";

export const mockMarkets: Market[] = [
  {
    id: "market_001",
    title: "Will ETH exceed $5k by 2026?",
    probability: 42,
    volume: 1200000,
    category: "Crypto",
    verified: true,
    endDate: "2026-12-31",
    description: "This market resolves YES if the price of Ethereum (ETH) reaches or exceeds $5,000 USD on any major exchange before December 31, 2026, 11:59 PM EST.",
    aiInsight: {
      summary: "Market shows moderate bullish sentiment",
      riskLevel: "medium",
      confidenceScore: 78,
      factors: ["L2 ecosystem growth", "Staking dynamics", "DeFi TVL trends", "BTC correlation"]
    },
    priceHistory: [
      { date: "2025-01-01", probability: 38 },
      { date: "2025-01-02", probability: 40 },
      { date: "2025-01-03", probability: 39 },
      { date: "2025-01-04", probability: 41 },
      { date: "2025-01-05", probability: 43 },
      { date: "2025-01-06", probability: 41 },
      { date: "2025-01-07", probability: 42 },
    ]
  },
  {
    id: "1",
    title: "Will Bitcoin reach $100K by end of 2025?",
    probability: 67,
    volume: 2450000,
    category: "Crypto",
    verified: true,
    endDate: "2025-12-31",
    description: "This market resolves YES if the price of Bitcoin (BTC) reaches or exceeds $100,000 USD on any major exchange before December 31, 2025, 11:59 PM EST.",
    aiInsight: {
      summary: "Strong bullish momentum driven by ETF inflows and halving cycle dynamics. Historical patterns suggest high probability of reaching target.",
      riskLevel: "medium",
      confidenceScore: 78,
      factors: ["ETF approval momentum", "Post-halving supply shock", "Institutional adoption", "Macro uncertainty"]
    },
    priceHistory: [
      { date: "2025-01-01", probability: 45 },
      { date: "2025-01-02", probability: 52 },
      { date: "2025-01-03", probability: 58 },
      { date: "2025-01-04", probability: 61 },
      { date: "2025-01-05", probability: 59 },
      { date: "2025-01-06", probability: 64 },
      { date: "2025-01-07", probability: 67 },
    ]
  },
  {
    id: "2",
    title: "Will the Fed cut rates in Q1 2025?",
    probability: 34,
    volume: 1890000,
    category: "Economics",
    verified: true,
    endDate: "2025-03-31",
    description: "Resolves YES if the Federal Reserve announces a federal funds rate cut during any FOMC meeting in January, February, or March 2025.",
    aiInsight: {
      summary: "Inflation data remains sticky. Market pricing suggests limited rate cut expectations despite economic slowdown signals.",
      riskLevel: "high",
      confidenceScore: 62,
      factors: ["Persistent inflation", "Labor market strength", "Banking sector stress", "Global economic conditions"]
    },
    priceHistory: [
      { date: "2025-01-01", probability: 42 },
      { date: "2025-01-02", probability: 38 },
      { date: "2025-01-03", probability: 35 },
      { date: "2025-01-04", probability: 33 },
      { date: "2025-01-05", probability: 36 },
      { date: "2025-01-06", probability: 32 },
      { date: "2025-01-07", probability: 34 },
    ]
  },
  {
    id: "3",
    title: "Will Ethereum flip Bitcoin market cap in 2025?",
    probability: 12,
    volume: 890000,
    category: "Crypto",
    verified: false,
    endDate: "2025-12-31",
    description: "This market resolves YES if Ethereum's market capitalization exceeds Bitcoin's market capitalization at any point during 2025.",
    aiInsight: {
      summary: "Historically unlikely event. ETH/BTC ratio trending lower. Would require significant catalysts or BTC black swan event.",
      riskLevel: "low",
      confidenceScore: 89,
      factors: ["ETH/BTC ratio decline", "Bitcoin ETF dominance", "Layer 2 value accrual", "Network effect disparity"]
    },
    priceHistory: [
      { date: "2025-01-01", probability: 15 },
      { date: "2025-01-02", probability: 14 },
      { date: "2025-01-03", probability: 13 },
      { date: "2025-01-04", probability: 12 },
      { date: "2025-01-05", probability: 13 },
      { date: "2025-01-06", probability: 11 },
      { date: "2025-01-07", probability: 12 },
    ]
  },
  {
    id: "4",
    title: "Will SpaceX Starship complete orbital flight by March 2025?",
    probability: 78,
    volume: 1230000,
    category: "Technology",
    verified: true,
    endDate: "2025-03-31",
    description: "Resolves YES if SpaceX Starship successfully completes a full orbital trajectory and lands (ocean or ground) by March 31, 2025.",
    aiInsight: {
      summary: "Recent test flights show rapid progress. FAA approval timeline and hardware readiness are key variables. High probability of success.",
      riskLevel: "low",
      confidenceScore: 85,
      factors: ["Successful test flights", "FAA approval status", "Hardware iteration speed", "Weather windows"]
    },
    priceHistory: [
      { date: "2025-01-01", probability: 65 },
      { date: "2025-01-02", probability: 68 },
      { date: "2025-01-03", probability: 72 },
      { date: "2025-01-04", probability: 74 },
      { date: "2025-01-05", probability: 76 },
      { date: "2025-01-06", probability: 75 },
      { date: "2025-01-07", probability: 78 },
    ]
  },
  {
    id: "5",
    title: "Will AI regulation pass in the EU by mid-2025?",
    probability: 89,
    volume: 560000,
    category: "Politics",
    verified: true,
    endDate: "2025-06-30",
    description: "Resolves YES if the European Union officially enacts comprehensive AI regulation legislation by June 30, 2025.",
    aiInsight: {
      summary: "EU AI Act already approved. Implementation timeline on track. High confidence in regulatory rollout proceeding as planned.",
      riskLevel: "low",
      confidenceScore: 94,
      factors: ["Legislative progress", "Political consensus", "Implementation timeline", "Industry lobbying"]
    },
    priceHistory: [
      { date: "2025-01-01", probability: 85 },
      { date: "2025-01-02", probability: 86 },
      { date: "2025-01-03", probability: 87 },
      { date: "2025-01-04", probability: 88 },
      { date: "2025-01-05", probability: 88 },
      { date: "2025-01-06", probability: 89 },
      { date: "2025-01-07", probability: 89 },
    ]
  },
  {
    id: "6",
    title: "Will OpenAI release GPT-5 in 2025?",
    probability: 56,
    volume: 3100000,
    category: "Technology",
    verified: true,
    endDate: "2025-12-31",
    description: "This market resolves YES if OpenAI publicly releases a model officially designated as GPT-5 (or successor) by December 31, 2025.",
    aiInsight: {
      summary: "Development timelines uncertain. Recent leadership changes and compute constraints may delay release. Market remains divided.",
      riskLevel: "medium",
      confidenceScore: 58,
      factors: ["Compute availability", "Safety considerations", "Competitive pressure", "Research breakthroughs"]
    },
    priceHistory: [
      { date: "2025-01-01", probability: 48 },
      { date: "2025-01-02", probability: 51 },
      { date: "2025-01-03", probability: 54 },
      { date: "2025-01-04", probability: 53 },
      { date: "2025-01-05", probability: 55 },
      { date: "2025-01-06", probability: 57 },
      { date: "2025-01-07", probability: 56 },
    ]
  },
  {
    id: "7",
    title: "Will Solana reach $500 by end of 2025?",
    probability: 28,
    volume: 1750000,
    category: "Crypto",
    verified: true,
    endDate: "2025-12-31",
    description: "This market resolves YES if Solana (SOL) reaches or exceeds $500 USD on any major exchange before December 31, 2025.",
    aiInsight: {
      summary: "Strong ecosystem growth but requires 3x from current levels. DeFi activity and memecoin hype driving volume.",
      riskLevel: "high",
      confidenceScore: 45,
      factors: ["DeFi growth", "Network stability", "Institutional interest", "Competition from L2s"]
    },
    priceHistory: [
      { date: "2025-01-01", probability: 22 },
      { date: "2025-01-02", probability: 24 },
      { date: "2025-01-03", probability: 26 },
      { date: "2025-01-04", probability: 25 },
      { date: "2025-01-05", probability: 27 },
      { date: "2025-01-06", probability: 29 },
      { date: "2025-01-07", probability: 28 },
    ]
  },
  {
    id: "8",
    title: "Will Apple launch AR glasses in 2025?",
    probability: 45,
    volume: 2200000,
    category: "Technology",
    verified: true,
    endDate: "2025-12-31",
    description: "Resolves YES if Apple officially announces and releases consumer AR glasses by December 31, 2025.",
    aiInsight: {
      summary: "Vision Pro reception mixed. Lighter AR glasses rumored for late 2025. Supply chain signals suggest development is ongoing.",
      riskLevel: "medium",
      confidenceScore: 52,
      factors: ["Vision Pro sales", "Supply chain leaks", "Competition timing", "Technology readiness"]
    },
    priceHistory: [
      { date: "2025-01-01", probability: 40 },
      { date: "2025-01-02", probability: 42 },
      { date: "2025-01-03", probability: 44 },
      { date: "2025-01-04", probability: 43 },
      { date: "2025-01-05", probability: 46 },
      { date: "2025-01-06", probability: 44 },
      { date: "2025-01-07", probability: 45 },
    ]
  },
  {
    id: "9",
    title: "Will US inflation drop below 2.5% by Q2 2025?",
    probability: 31,
    volume: 1450000,
    category: "Economics",
    verified: true,
    endDate: "2025-06-30",
    description: "Resolves YES if the US CPI year-over-year inflation rate falls below 2.5% in any month during Q1-Q2 2025.",
    aiInsight: {
      summary: "Core inflation remains sticky. Housing costs and services inflation proving persistent. Fed target of 2% remains distant.",
      riskLevel: "high",
      confidenceScore: 55,
      factors: ["Housing costs", "Energy prices", "Wage growth", "Supply chain normalization"]
    },
    priceHistory: [
      { date: "2025-01-01", probability: 35 },
      { date: "2025-01-02", probability: 33 },
      { date: "2025-01-03", probability: 32 },
      { date: "2025-01-04", probability: 30 },
      { date: "2025-01-05", probability: 32 },
      { date: "2025-01-06", probability: 30 },
      { date: "2025-01-07", probability: 31 },
    ]
  },
  {
    id: "10",
    title: "Will Tesla release a sub-$30k vehicle in 2025?",
    probability: 52,
    volume: 2800000,
    category: "Technology",
    verified: true,
    endDate: "2025-12-31",
    description: "Resolves YES if Tesla officially launches a new vehicle model with a base price under $30,000 USD by December 31, 2025.",
    aiInsight: {
      summary: "Model 2 rumors persist. Competition from Chinese EVs increasing pressure. Production ramp uncertain.",
      riskLevel: "medium",
      confidenceScore: 60,
      factors: ["Production capacity", "Battery costs", "Competition pressure", "Demand signals"]
    },
    priceHistory: [
      { date: "2025-01-01", probability: 48 },
      { date: "2025-01-02", probability: 50 },
      { date: "2025-01-03", probability: 51 },
      { date: "2025-01-04", probability: 53 },
      { date: "2025-01-05", probability: 51 },
      { date: "2025-01-06", probability: 54 },
      { date: "2025-01-07", probability: 52 },
    ]
  },
  {
    id: "11",
    title: "Will GenLayer mainnet launch in 2025?",
    probability: 72,
    volume: 890000,
    category: "Crypto",
    verified: true,
    endDate: "2025-12-31",
    description: "Resolves YES if GenLayer launches its mainnet with full Intelligent Contract support by December 31, 2025.",
    aiInsight: {
      summary: "Testnet showing strong progress. Unique positioning as Intelligent Blockchain. Team execution has been solid.",
      riskLevel: "low",
      confidenceScore: 82,
      factors: ["Testnet progress", "Developer adoption", "Technical milestones", "Community growth"]
    },
    priceHistory: [
      { date: "2025-01-01", probability: 65 },
      { date: "2025-01-02", probability: 68 },
      { date: "2025-01-03", probability: 70 },
      { date: "2025-01-04", probability: 69 },
      { date: "2025-01-05", probability: 71 },
      { date: "2025-01-06", probability: 73 },
      { date: "2025-01-07", probability: 72 },
    ]
  },
  {
    id: "12",
    title: "Will there be a major US bank failure in 2025?",
    probability: 18,
    volume: 1650000,
    category: "Economics",
    verified: true,
    endDate: "2025-12-31",
    description: "Resolves YES if a US bank with over $50B in assets is seized by FDIC or enters receivership during 2025.",
    aiInsight: {
      summary: "Banking sector stabilized after 2023 stress. Commercial real estate exposure remains a concern for regional banks.",
      riskLevel: "medium",
      confidenceScore: 75,
      factors: ["CRE exposure", "Interest rate risk", "Deposit stability", "Regulatory oversight"]
    },
    priceHistory: [
      { date: "2025-01-01", probability: 22 },
      { date: "2025-01-02", probability: 20 },
      { date: "2025-01-03", probability: 19 },
      { date: "2025-01-04", probability: 18 },
      { date: "2025-01-05", probability: 19 },
      { date: "2025-01-06", probability: 17 },
      { date: "2025-01-07", probability: 18 },
    ]
  },
  {
    id: "13",
    title: "Will Netflix stock reach $1000 by end of 2025?",
    probability: 38,
    volume: 1320000,
    category: "Technology",
    verified: false,
    endDate: "2025-12-31",
    description: "Resolves YES if Netflix (NFLX) stock price reaches or exceeds $1000 per share on NASDAQ by December 31, 2025.",
    aiInsight: {
      summary: "Ad tier gaining traction. Password sharing crackdown boosted subscribers. Valuation already stretched.",
      riskLevel: "medium",
      confidenceScore: 48,
      factors: ["Subscriber growth", "Ad revenue", "Content costs", "Streaming competition"]
    },
    priceHistory: [
      { date: "2025-01-01", probability: 32 },
      { date: "2025-01-02", probability: 34 },
      { date: "2025-01-03", probability: 36 },
      { date: "2025-01-04", probability: 37 },
      { date: "2025-01-05", probability: 39 },
      { date: "2025-01-06", probability: 37 },
      { date: "2025-01-07", probability: 38 },
    ]
  },
  {
    id: "14",
    title: "Will Argentina dollarize by end of 2025?",
    probability: 24,
    volume: 780000,
    category: "Politics",
    verified: true,
    endDate: "2025-12-31",
    description: "Resolves YES if Argentina officially adopts the US Dollar as its primary legal tender by December 31, 2025.",
    aiInsight: {
      summary: "Milei administration pursuing reforms but full dollarization faces significant obstacles. Peso devaluation continues.",
      riskLevel: "high",
      confidenceScore: 65,
      factors: ["Political will", "Central bank reserves", "IMF negotiations", "Public support"]
    },
    priceHistory: [
      { date: "2025-01-01", probability: 30 },
      { date: "2025-01-02", probability: 28 },
      { date: "2025-01-03", probability: 26 },
      { date: "2025-01-04", probability: 25 },
      { date: "2025-01-05", probability: 24 },
      { date: "2025-01-06", probability: 25 },
      { date: "2025-01-07", probability: 24 },
    ]
  },
  {
    id: "15",
    title: "Will XRP win SEC lawsuit by mid-2025?",
    probability: 61,
    volume: 2100000,
    category: "Crypto",
    verified: true,
    endDate: "2025-06-30",
    description: "Resolves YES if Ripple Labs achieves a favorable final judgment or settlement in SEC v. Ripple by June 30, 2025.",
    aiInsight: {
      summary: "Partial victory already achieved. Appeals process ongoing. Settlement discussions rumored.",
      riskLevel: "medium",
      confidenceScore: 68,
      factors: ["Court rulings", "SEC stance", "Settlement talks", "Regulatory clarity"]
    },
    priceHistory: [
      { date: "2025-01-01", probability: 55 },
      { date: "2025-01-02", probability: 57 },
      { date: "2025-01-03", probability: 59 },
      { date: "2025-01-04", probability: 60 },
      { date: "2025-01-05", probability: 62 },
      { date: "2025-01-06", probability: 60 },
      { date: "2025-01-07", probability: 61 },
    ]
  },
  {
    id: "16",
    title: "Will China invade Taiwan in 2025?",
    probability: 5,
    volume: 4200000,
    category: "Politics",
    verified: true,
    endDate: "2025-12-31",
    description: "Resolves YES if China initiates military action against Taiwan constituting an invasion by December 31, 2025.",
    aiInsight: {
      summary: "Geopolitical tensions remain but invasion unlikely in near term. Economic interdependencies and US deterrence significant.",
      riskLevel: "low",
      confidenceScore: 92,
      factors: ["Military readiness", "US response", "Economic costs", "Political timing"]
    },
    priceHistory: [
      { date: "2025-01-01", probability: 6 },
      { date: "2025-01-02", probability: 5 },
      { date: "2025-01-03", probability: 5 },
      { date: "2025-01-04", probability: 4 },
      { date: "2025-01-05", probability: 5 },
      { date: "2025-01-06", probability: 5 },
      { date: "2025-01-07", probability: 5 },
    ]
  },
  {
    id: "17",
    title: "Will gold reach $3000/oz in 2025?",
    probability: 44,
    volume: 1580000,
    category: "Economics",
    verified: true,
    endDate: "2025-12-31",
    description: "Resolves YES if spot gold price reaches or exceeds $3000 per troy ounce on any major exchange during 2025.",
    aiInsight: {
      summary: "Central bank buying continues. Geopolitical uncertainty supporting prices. Dollar strength could limit upside.",
      riskLevel: "medium",
      confidenceScore: 55,
      factors: ["Central bank demand", "Dollar strength", "Inflation hedge", "Geopolitical risk"]
    },
    priceHistory: [
      { date: "2025-01-01", probability: 38 },
      { date: "2025-01-02", probability: 40 },
      { date: "2025-01-03", probability: 42 },
      { date: "2025-01-04", probability: 43 },
      { date: "2025-01-05", probability: 45 },
      { date: "2025-01-06", probability: 43 },
      { date: "2025-01-07", probability: 44 },
    ]
  },
  {
    id: "18",
    title: "Will Anthropic raise at $50B+ valuation in 2025?",
    probability: 68,
    volume: 920000,
    category: "Technology",
    verified: false,
    endDate: "2025-12-31",
    description: "Resolves YES if Anthropic announces a funding round at a valuation of $50 billion or higher by December 31, 2025.",
    aiInsight: {
      summary: "Claude competing well with GPT-4. Amazon partnership provides runway. AI investment appetite remains strong.",
      riskLevel: "low",
      confidenceScore: 72,
      factors: ["AI market growth", "Competitive position", "Revenue growth", "Investor appetite"]
    },
    priceHistory: [
      { date: "2025-01-01", probability: 60 },
      { date: "2025-01-02", probability: 62 },
      { date: "2025-01-03", probability: 65 },
      { date: "2025-01-04", probability: 66 },
      { date: "2025-01-05", probability: 68 },
      { date: "2025-01-06", probability: 67 },
      { date: "2025-01-07", probability: 68 },
    ]
  },
];
