/**
 * GenLayer Prediction Market Contract Generator
 * Generates Python Intelligent Contract code for deployment to GenLayer
 */

export interface ContractParams {
  question: string;
  endDate: string;
  resolutionSource: string;
  description: string;
}

/**
 * Generates a Python Intelligent Contract for a prediction market
 * This contract uses GenLayer's Equivalence Principle for trustless resolution
 */
export function generatePredictionMarketContract(params: ContractParams): string {
  // Escape special characters in strings for Python
  const escapeString = (str: string): string => {
    return str
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r");
  };

  const question = escapeString(params.question);
  const endDate = escapeString(params.endDate);
  const resolutionSource = escapeString(params.resolutionSource);
  const description = escapeString(params.description);

  return `# { "Depends": "py-genlayer:test" }
from genlayer import *
import json

@gl.contract
class PredictionMarket:
    """
    A prediction market contract for GenLayer.
    Question: ${question}
    """
    
    question: str
    description: str
    resolution_source: str
    end_date: str
    creator: str
    is_resolved: bool
    winner: int  # -1 = unresolved, 0 = YES wins, 1 = NO wins
    total_yes_shares: int
    total_no_shares: int
    user_shares: TreeMap[str, TreeMap[int, int]]  # user -> outcome -> shares
    user_deposits: TreeMap[str, int]  # user -> total deposited wei

    def __init__(self, question: str, end_date: str, resolution_source: str, description: str):
        self.question = question
        self.description = description
        self.resolution_source = resolution_source
        self.end_date = end_date
        self.creator = gl.message.sender_account
        self.is_resolved = False
        self.winner = -1
        self.total_yes_shares = 0
        self.total_no_shares = 0
        self.user_shares = TreeMap[str, TreeMap[int, int]]()
        self.user_deposits = TreeMap[str, int]()

    @gl.public.write.payable
    def buy_shares(self, outcome_index: int, num_shares: int) -> bool:
        """
        Buy shares for a given outcome (0 = YES, 1 = NO).
        Sends value with the transaction to purchase shares.
        """
        if self.is_resolved:
            raise Exception("Market is already resolved")
        
        if outcome_index not in [0, 1]:
            raise Exception("Invalid outcome index. Use 0 for YES, 1 for NO")
        
        if num_shares <= 0:
            raise Exception("Must buy at least 1 share")
        
        sender = gl.message.sender_account
        value = gl.message.value
        
        # Track user's shares
        if sender not in self.user_shares:
            self.user_shares[sender] = TreeMap[int, int]()
            self.user_shares[sender][0] = 0
            self.user_shares[sender][1] = 0
        
        self.user_shares[sender][outcome_index] = self.user_shares[sender][outcome_index] + num_shares
        
        # Track deposits
        if sender not in self.user_deposits:
            self.user_deposits[sender] = 0
        self.user_deposits[sender] = self.user_deposits[sender] + value
        
        # Update totals
        if outcome_index == 0:
            self.total_yes_shares = self.total_yes_shares + num_shares
        else:
            self.total_no_shares = self.total_no_shares + num_shares
        
        return True

    @gl.public.write
    def sell_shares(self, outcome_index: int, num_shares: int) -> bool:
        """
        Sell shares back to the market.
        """
        if self.is_resolved:
            raise Exception("Market is already resolved")
        
        sender = gl.message.sender_account
        
        if sender not in self.user_shares:
            raise Exception("No shares to sell")
        
        current_shares = self.user_shares[sender][outcome_index]
        if current_shares < num_shares:
            raise Exception("Insufficient shares")
        
        self.user_shares[sender][outcome_index] = current_shares - num_shares
        
        if outcome_index == 0:
            self.total_yes_shares = self.total_yes_shares - num_shares
        else:
            self.total_no_shares = self.total_no_shares - num_shares
        
        return True

    @gl.public.write
    def resolve(self) -> int:
        """
        Resolve the market using GenLayer's Equivalence Principle.
        Validators will fetch data from the resolution source and use AI to determine the outcome.
        """
        if self.is_resolved:
            raise Exception("Market is already resolved")
        
        # Use Equivalence Principle for consensus
        def determine_outcome() -> int:
            # Fetch data from the resolution source
            try:
                web_data = gl.get_webpage("${resolutionSource}", mode="text")
            except:
                web_data = "Unable to fetch data from source"
            
            # Create prompt for LLM to analyze
            prompt = f"""Based on the following information, determine the outcome of this prediction market.

Question: ${question}

Resolution Criteria: ${description}

Data from resolution source (${resolutionSource}):
{web_data}

Analyze the data and determine if the answer to the question is YES or NO.
Respond with a JSON object: {{"outcome": 0}} for YES or {{"outcome": 1}} for NO.
If the outcome cannot be determined yet, respond with {{"outcome": -1}}.

IMPORTANT: Only respond with the JSON object, nothing else."""

            result = gl.exec_prompt(prompt)
            
            try:
                parsed = json.loads(result)
                return parsed.get("outcome", -1)
            except:
                return -1
        
        # Use strict equivalence - all validators must agree
        outcome = gl.eq_principle_strict_eq(determine_outcome)
        
        if outcome == -1:
            raise Exception("Cannot determine outcome yet")
        
        self.winner = outcome
        self.is_resolved = True
        
        return outcome

    @gl.public.write
    def claim_winnings(self) -> int:
        """
        Claim winnings after the market is resolved.
        Returns the amount claimed.
        """
        if not self.is_resolved:
            raise Exception("Market is not resolved yet")
        
        sender = gl.message.sender_account
        
        if sender not in self.user_shares:
            raise Exception("No position in this market")
        
        winning_shares = self.user_shares[sender][self.winner]
        
        if winning_shares <= 0:
            raise Exception("No winning shares to claim")
        
        # Calculate payout - winners split the total pool
        total_shares = self.total_yes_shares + self.total_no_shares
        if total_shares == 0:
            raise Exception("No shares in market")
        
        # Calculate total pool from deposits
        total_pool = 0
        for user in self.user_deposits:
            total_pool = total_pool + self.user_deposits[user]
        
        # Payout proportional to winning shares
        winning_total = self.total_yes_shares if self.winner == 0 else self.total_no_shares
        if winning_total == 0:
            raise Exception("No winning shares exist")
        
        payout = (winning_shares * total_pool) // winning_total
        
        # Clear user's shares to prevent double claiming
        self.user_shares[sender][0] = 0
        self.user_shares[sender][1] = 0
        
        # Transfer winnings
        gl.transfer(sender, payout)
        
        return payout

    @gl.public.view
    def get_total_shares(self, outcome_index: int) -> int:
        """Get total shares for an outcome (0 = YES, 1 = NO)."""
        if outcome_index == 0:
            return self.total_yes_shares
        return self.total_no_shares

    @gl.public.view
    def get_user_shares(self, user: str, outcome_index: int) -> int:
        """Get a user's shares for an outcome."""
        if user not in self.user_shares:
            return 0
        return self.user_shares[user][outcome_index]

    @gl.public.view
    def get_market_info(self) -> dict:
        """Get market information."""
        return {
            "question": self.question,
            "description": self.description,
            "resolution_source": self.resolution_source,
            "end_date": self.end_date,
            "creator": self.creator,
            "is_resolved": self.is_resolved,
            "winner": self.winner,
            "total_yes_shares": self.total_yes_shares,
            "total_no_shares": self.total_no_shares
        }

    @gl.public.view
    def get_winner(self) -> int:
        """Get the winning outcome (-1 if not resolved)."""
        return self.winner
`;
}

/**
 * Generates constructor arguments for contract deployment
 */
export function getContractConstructorArgs(params: ContractParams): [string, string, string, string] {
  return [
    params.question,
    params.endDate,
    params.resolutionSource,
    params.description,
  ];
}
