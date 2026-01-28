const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PredictionMarket", function () {
  let factory;
  let market;
  let owner;
  let creator;
  let trader1;
  let trader2;

  const QUESTION = "Will ETH hit $5000 by end of 2025?";
  const DESCRIPTION = "Resolves YES if ETH price exceeds $5000 USD";
  const DURATION_DAYS = 7;

  beforeEach(async function () {
    [owner, creator, trader1, trader2] = await ethers.getSigners();

    // Deploy Factory
    const Factory = await ethers.getContractFactory("PredictionMarketFactory");
    factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Create a market
    const tx = await factory.connect(creator).createMarket(
      QUESTION,
      DESCRIPTION,
      DURATION_DAYS
    );
    const receipt = await tx.wait();
    
    // Get market address from event
    const event = receipt.logs.find(log => {
      try {
        return factory.interface.parseLog(log)?.name === "MarketCreated";
      } catch { return false; }
    });
    const parsedEvent = factory.interface.parseLog(event);
    const marketAddress = parsedEvent.args[1];

    // Get market contract
    market = await ethers.getContractAt("PredictionMarket", marketAddress);
  });

  describe("Factory", function () {
    it("Should deploy factory correctly", async function () {
      expect(await factory.owner()).to.equal(owner.address);
      expect(await factory.marketCount()).to.equal(1);
    });

    it("Should create markets", async function () {
      const markets = await factory.getAllMarkets();
      expect(markets.length).to.equal(1);
    });

    it("Should track markets by creator", async function () {
      const creatorMarkets = await factory.getMarketsByCreator(creator.address);
      expect(creatorMarkets.length).to.equal(1);
    });
  });

  describe("Market Creation", function () {
    it("Should have correct initial state", async function () {
      expect(await market.question()).to.equal(QUESTION);
      expect(await market.description()).to.equal(DESCRIPTION);
      expect(await market.creator()).to.equal(creator.address);
      expect(await market.isResolved()).to.equal(false);
      expect(await market.totalPool()).to.equal(0);
    });

    it("Should be open for trading", async function () {
      expect(await market.isMarketOpen()).to.equal(true);
    });

    it("Should have 50% default probability", async function () {
      expect(await market.getProbability()).to.equal(50);
    });
  });

  describe("Trading", function () {
    const BUY_AMOUNT = ethers.parseEther("0.01"); // 0.01 ETH = 10 shares

    it("Should allow buying YES shares", async function () {
      await market.connect(trader1).buyYes({ value: BUY_AMOUNT });
      
      const position = await market.getUserPosition(trader1.address);
      expect(position._yesShares).to.equal(10); // 0.01 ETH / 0.001 = 10 shares
      expect(position._noShares).to.equal(0);
    });

    it("Should allow buying NO shares", async function () {
      await market.connect(trader1).buyNo({ value: BUY_AMOUNT });
      
      const position = await market.getUserPosition(trader1.address);
      expect(position._yesShares).to.equal(0);
      expect(position._noShares).to.equal(10);
    });

    it("Should update pool correctly", async function () {
      await market.connect(trader1).buyYes({ value: BUY_AMOUNT });
      await market.connect(trader2).buyNo({ value: BUY_AMOUNT });
      
      expect(await market.totalPool()).to.equal(BUY_AMOUNT * 2n);
      expect(await market.totalYesShares()).to.equal(10);
      expect(await market.totalNoShares()).to.equal(10);
    });

    it("Should update probability based on shares", async function () {
      await market.connect(trader1).buyYes({ value: ethers.parseEther("0.03") }); // 30 YES shares
      await market.connect(trader2).buyNo({ value: ethers.parseEther("0.01") }); // 10 NO shares
      
      // 30 YES out of 40 total = 75%
      expect(await market.getProbability()).to.equal(75);
    });

    it("Should reject trades below minimum", async function () {
      await expect(
        market.connect(trader1).buyYes({ value: ethers.parseEther("0.0001") })
      ).to.be.revertedWith("Below minimum");
    });

    it("Should emit SharesPurchased event", async function () {
      await expect(market.connect(trader1).buyYes({ value: BUY_AMOUNT }))
        .to.emit(market, "SharesPurchased")
        .withArgs(trader1.address, true, 10, BUY_AMOUNT, await getBlockTimestamp());
    });
  });

  describe("Resolution", function () {
    const BUY_AMOUNT = ethers.parseEther("0.1");

    beforeEach(async function () {
      // Setup: trader1 buys YES, trader2 buys NO
      await market.connect(trader1).buyYes({ value: BUY_AMOUNT });
      await market.connect(trader2).buyNo({ value: BUY_AMOUNT });
    });

    it("Should not allow resolution before end time", async function () {
      await expect(
        market.connect(creator).resolve(true)
      ).to.be.revertedWith("Market not ended");
    });

    it("Should only allow creator to resolve", async function () {
      // Fast forward past end time
      await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // 8 days
      await ethers.provider.send("evm_mine");

      await expect(
        market.connect(trader1).resolve(true)
      ).to.be.revertedWith("Only creator");
    });

    it("Should allow creator to resolve after end time", async function () {
      // Fast forward past end time
      await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");

      await market.connect(creator).resolve(true);
      
      expect(await market.isResolved()).to.equal(true);
      expect(await market.winningOutcome()).to.equal(true);
    });

    it("Should emit MarketResolved event", async function () {
      await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");

      await expect(market.connect(creator).resolve(true))
        .to.emit(market, "MarketResolved")
        .withArgs(true, BUY_AMOUNT * 2n, await getBlockTimestamp() + 1);
    });
  });

  describe("Claiming Winnings", function () {
    const BUY_AMOUNT = ethers.parseEther("0.1");

    beforeEach(async function () {
      // Setup: trader1 buys YES, trader2 buys NO
      await market.connect(trader1).buyYes({ value: BUY_AMOUNT });
      await market.connect(trader2).buyNo({ value: BUY_AMOUNT });

      // Fast forward and resolve (YES wins)
      await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");
      await market.connect(creator).resolve(true);
    });

    it("Should allow winners to claim", async function () {
      const balanceBefore = await ethers.provider.getBalance(trader1.address);
      
      const tx = await market.connect(trader1).claimWinnings();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(trader1.address);
      
      // Winner gets pool minus 2% fee
      const expectedWinnings = (BUY_AMOUNT * 2n * 98n) / 100n;
      expect(balanceAfter - balanceBefore + gasUsed).to.be.closeTo(expectedWinnings, ethers.parseEther("0.001"));
    });

    it("Should not allow losers to claim", async function () {
      await expect(
        market.connect(trader2).claimWinnings()
      ).to.be.revertedWith("No winning shares");
    });

    it("Should not allow double claiming", async function () {
      await market.connect(trader1).claimWinnings();
      
      await expect(
        market.connect(trader1).claimWinnings()
      ).to.be.revertedWith("Already claimed");
    });

    it("Should show correct claimable amount", async function () {
      const claimable = await market.getClaimableAmount(trader1.address);
      const expectedWinnings = (BUY_AMOUNT * 2n * 98n) / 100n; // Pool minus 2% fee
      
      expect(claimable).to.equal(expectedWinnings);
    });

    it("Should show zero claimable for losers", async function () {
      const claimable = await market.getClaimableAmount(trader2.address);
      expect(claimable).to.equal(0);
    });
  });

  describe("Multiple Traders", function () {
    it("Should distribute winnings proportionally", async function () {
      // trader1 buys 0.1 ETH YES (100 shares)
      // trader2 buys 0.05 ETH YES (50 shares)
      // trader3 buys 0.15 ETH NO (150 shares)
      const [, , t1, t2, t3] = await ethers.getSigners();

      await market.connect(t1).buyYes({ value: ethers.parseEther("0.1") });
      await market.connect(t2).buyYes({ value: ethers.parseEther("0.05") });
      await market.connect(t3).buyNo({ value: ethers.parseEther("0.15") });

      // Resolve YES wins
      await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");
      await market.connect(creator).resolve(true);

      // Total pool: 0.3 ETH, minus 2% fee = 0.294 ETH
      // t1 has 100/150 = 66.67% of YES shares
      // t2 has 50/150 = 33.33% of YES shares

      const claimable1 = await market.getClaimableAmount(t1.address);
      const claimable2 = await market.getClaimableAmount(t2.address);
      const claimable3 = await market.getClaimableAmount(t3.address);

      // t1 should get ~0.196 ETH (66.67% of 0.294)
      // t2 should get ~0.098 ETH (33.33% of 0.294)
      // t3 should get 0 (loser)

      expect(claimable1).to.be.closeTo(ethers.parseEther("0.196"), ethers.parseEther("0.001"));
      expect(claimable2).to.be.closeTo(ethers.parseEther("0.098"), ethers.parseEther("0.001"));
      expect(claimable3).to.equal(0);
    });
  });
});

// Helper function
async function getBlockTimestamp() {
  const block = await ethers.provider.getBlock("latest");
  return block.timestamp;
}
