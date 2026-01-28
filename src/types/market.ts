export interface Market {
  id: string;
  title: string;
  probability: number;
  volume: number;
  category: string;
  verified: boolean;
  endDate: string;
  description: string;
  aiInsight: AIInsight;
  priceHistory: PricePoint[];
}

export interface AIInsight {
  summary: string;
  riskLevel: 'low' | 'medium' | 'high';
  confidenceScore: number;
  factors: string[];
}

export interface PricePoint {
  date: string;
  probability: number;
}
