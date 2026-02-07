# { "Depends": "py-genlayer:test" }
"""
GenLayer Prediction Market - Intelligent Contract
=================================================

AI-powered market resolution using GenLayer's validator network
and the Equivalence Principle for consensus.
"""

from genlayer import *
import json
import typing


class PredictionMarket(gl.Contract):
    """
    AI-powered prediction market resolution contract.

    Uses GenLayer validators to fetch real-world data and determine
    market outcomes through LLM consensus.
    """

    # State variables
    has_resolved: bool
    question: str
    description: str
    end_date: str
    resolution_sources: DynArray[str]
    outcome: i8  # -1 = pending, 0 = NO, 1 = YES
    confidence: float
    resolution_reasoning: str
    creator: Address

    def __init__(
        self,
        question: str,
        description: str,
        end_date: str,
        resolution_sources: list,
    ):
        """
        Initialize a new prediction market.

        Args:
            question: The yes/no question to resolve
            description: Detailed description of resolution criteria
            end_date: Date after which resolution can occur (ISO string)
            resolution_sources: List of URLs to check for outcome data
        """
        self.has_resolved = False
        self.question = question
        self.description = description
        self.end_date = end_date
        self.resolution_sources = DynArray[str]()
        for url in resolution_sources:
            self.resolution_sources.append(url)
        self.outcome = i8(-1)
        self.confidence = 0.0
        self.resolution_reasoning = ""
        self.creator = gl.message.sender_address

    @gl.public.view
    def get_status(self) -> dict:
        """Get current market status."""
        return {
            "question": self.question,
            "description": self.description,
            "end_date": self.end_date,
            "has_resolved": self.has_resolved,
            "outcome": int(self.outcome),
            "outcome_label": self._outcome_to_label(int(self.outcome)),
            "confidence": self.confidence,
            "resolution_reasoning": self.resolution_reasoning,
            "creator": str(self.creator),
            "resolution_sources": [source for source in self.resolution_sources],
        }

    @gl.public.view
    def get_resolution_sources(self) -> list:
        """Get the list of URLs used for resolution."""
        return [source for source in self.resolution_sources]

    @gl.public.view
    def can_resolve(self) -> dict:
        """Check if market can currently be resolved."""
        if self.has_resolved:
            return {
                "can_resolve": False,
                "reason": "Market has already been resolved",
            }

        return {
            "can_resolve": True,
            "reason": "Market is ready for resolution",
        }

    @gl.public.write
    def resolve(self) -> typing.Any:
        """
        Trigger AI-powered market resolution.

        This method:
        1. Fetches data from all configured resolution sources
        2. Uses LLM to interpret the data and determine outcome
        3. Applies Equivalence Principle for validator consensus
        4. Stores the final outcome on-chain

        Returns:
            dict: Resolution result including outcome, confidence, and reasoning
        """
        if self.has_resolved:
            return {
                "success": False,
                "error": "Market has already been resolved",
                "outcome": self.outcome,
                "outcome_label": self._outcome_to_label(self.outcome),
            }

        if not self.resolution_sources or len(self.resolution_sources) == 0:
            return {
                "success": False,
                "error": "No resolution sources configured",
            }

        def nondet() -> str:
            """
            Non-deterministic function for fetching and processing web data.
            Executed by multiple validators who must reach consensus.
            """
            # Fetch data from all sources
            source_data = []
            for i, url in enumerate(self.resolution_sources):
                try:
                    web_data = gl.get_webpage(url, mode="text")
                    source_data.append(
                        {
                            "source_index": i,
                            "url": url,
                            "content": web_data[:5000],
                        }
                    )
                    print(f"Fetched data from source {i}: {url}")
                except Exception as e:
                    print(f"Failed to fetch source {i}: {url} - {str(e)}")
                    source_data.append(
                        {
                            "source_index": i,
                            "url": url,
                            "content": f"ERROR: Could not fetch - {str(e)}",
                        }
                    )

            # Format sources for LLM
            sources_text = "\n\n---SOURCE SEPARATOR---\n\n".join(
                [
                    f"SOURCE {d['source_index']} ({d['url']}):\n{d['content']}"
                    for d in source_data
                ]
            )

            # Construct the resolution prompt
            task = f"""You are a prediction market resolution oracle. Determine the outcome based on real-world data.

PREDICTION MARKET QUESTION:
{self.question}

RESOLUTION CRITERIA:
{self.description}

MARKET END DATE: {self.end_date}

DATA FROM RESOLUTION SOURCES:
{sources_text}

INSTRUCTIONS:
1. Analyze all provided source data carefully
2. Determine if the question should resolve to YES or NO
3. If data is insufficient or contradictory, return outcome -1
4. Be conservative - only resolve if you have clear evidence

Respond with ONLY a JSON object:
{{
    "outcome": <int>,  // 1 for YES, 0 for NO, -1 if cannot determine
    "confidence": <float>,  // 0.0 to 1.0
    "reasoning": "<string>"  // Brief explanation (max 200 chars)
}}

Your response must be valid JSON only, no markdown, no extra text."""

            result = gl.exec_prompt(task)

            # Clean response
            result = result.strip()
            if result.startswith("```"):
                result = result.split("```", 2)[1]
                if result.startswith("json"):
                    result = result[4:]
            result = result.strip()

            print(f"LLM Response: {result}")

            parsed = json.loads(result)
            return json.dumps(parsed, sort_keys=True)

        # Apply equivalence principle for consensus
        result_str = gl.eq_principle_strict_eq(nondet)
        result_json = json.loads(result_str)

        if "outcome" not in result_json:
            return {
                "success": False,
                "error": "Invalid resolution result: missing outcome",
            }

        outcome = int(result_json.get("outcome", -1))
        confidence = float(result_json.get("confidence", 0.0))
        reasoning = result_json.get("reasoning", "No reasoning provided")

        # Only finalize with definitive outcome and sufficient confidence
        if outcome in [0, 1] and confidence >= 0.7:
            self.has_resolved = True
            self.outcome = i8(outcome)
            self.confidence = confidence
            self.resolution_reasoning = str(reasoning)[:500]

            return {
                "success": True,
                "outcome": int(self.outcome),
                "outcome_label": self._outcome_to_label(int(self.outcome)),
                "confidence": self.confidence,
                "reasoning": self.resolution_reasoning,
                "finalized": True,
            }
        else:
            return {
                "success": True,
                "outcome": outcome,
                "outcome_label": self._outcome_to_label(outcome),
                "confidence": confidence,
                "reasoning": str(reasoning),
                "finalized": False,
                "message": "Outcome uncertain or confidence too low. Try again later.",
            }

    @gl.public.write
    def add_resolution_source(self, url: str) -> dict:
        """Add a new resolution source URL (creator only)."""
        if gl.message.sender_address != self.creator:
            return {
                "success": False,
                "error": "Only the creator can add resolution sources",
            }

        if self.has_resolved:
            return {
                "success": False,
                "error": "Cannot modify resolved market",
            }

        if url in self.resolution_sources:
            return {
                "success": False,
                "error": "URL already in resolution sources",
            }

        self.resolution_sources.append(url)

        return {
            "success": True,
            "sources": [source for source in self.resolution_sources],
        }

    def _outcome_to_label(self, outcome: int) -> str:
        """Convert numeric outcome to human-readable label."""
        labels = {
            -1: "PENDING",
            0: "NO",
            1: "YES",
        }
        return labels.get(outcome, "UNKNOWN")
