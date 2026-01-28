// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title PredictionMarket
 * @notice A prediction market contract where users can buy YES/NO shares
 * @dev Deployed on Base Sepolia for testing
 */
contract PredictionMarket {
    // ============ State Variables ============
    
    address public owner;
    address public creator;
    string public question;
    string public description;
    uint256 public endTime;
    uint256 public resolutionTime;
    
    bool public isResolved;
    bool public winningOutcome; // true = YES wins, false = NO wins
    
    uint256 public totalYesShares;
    uint256 public totalNoShares;
    uint256 public totalPool;
    
    uint256 public constant SHARE_PRICE = 0.001 ether; // 1 share = 0.001 ETH
    uint256 public constant MIN_BUY = 0.001 ether;
    uint256 public constant PLATFORM_FEE = 200; // 2% fee (basis points)
    uint256 public constant BASIS_POINTS = 10000;
    
    // ============ Mappings ============
    
    mapping(address => uint256) public yesShares;
    mapping(address => uint256) public noShares;
    mapping(address => bool) public hasClaimed;
    
    // ============ Events ============
    
    event SharesPurchased(
        address indexed buyer,
        bool isYes,
        uint256 shares,
        uint256 amount,
        uint256 timestamp
    );
    
    event SharesSold(
        address indexed seller,
        bool isYes,
        uint256 shares,
        uint256 amount,
        uint256 timestamp
    );
    
    event MarketResolved(
        bool winningOutcome,
        uint256 totalPool,
        uint256 timestamp
    );
    
    event WinningsClaimed(
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );
    
    event MarketCreated(
        address indexed creator,
        string question,
        uint256 endTime
    );
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier onlyCreator() {
        require(msg.sender == creator, "Only creator");
        _;
    }
    
    modifier marketOpen() {
        require(block.timestamp < endTime, "Market closed");
        require(!isResolved, "Market resolved");
        _;
    }
    
    modifier marketEnded() {
        require(block.timestamp >= endTime, "Market not ended");
        _;
    }
    
    modifier marketResolved() {
        require(isResolved, "Market not resolved");
        _;
    }
    
    modifier notResolved() {
        require(!isResolved, "Market already resolved");
        _;
    }
    
    // ============ Constructor ============
    
    constructor(
        address _creator,
        string memory _question,
        string memory _description,
        uint256 _durationDays
    ) {
        owner = msg.sender;
        creator = _creator;
        question = _question;
        description = _description;
        endTime = block.timestamp + (_durationDays * 1 days);
        
        emit MarketCreated(_creator, _question, endTime);
    }
    
    // ============ Trading Functions ============
    
    /**
     * @notice Buy YES shares
     */
    function buyYes() external payable marketOpen {
        require(msg.value >= MIN_BUY, "Below minimum");
        
        uint256 shares = msg.value / SHARE_PRICE;
        require(shares > 0, "Must buy at least 1 share");
        
        yesShares[msg.sender] += shares;
        totalYesShares += shares;
        totalPool += msg.value;
        
        emit SharesPurchased(msg.sender, true, shares, msg.value, block.timestamp);
    }
    
    /**
     * @notice Buy NO shares
     */
    function buyNo() external payable marketOpen {
        require(msg.value >= MIN_BUY, "Below minimum");
        
        uint256 shares = msg.value / SHARE_PRICE;
        require(shares > 0, "Must buy at least 1 share");
        
        noShares[msg.sender] += shares;
        totalNoShares += shares;
        totalPool += msg.value;
        
        emit SharesPurchased(msg.sender, false, shares, msg.value, block.timestamp);
    }
    
    /**
     * @notice Buy shares (unified function)
     * @param _isYes true for YES shares, false for NO shares
     */
    function buyShares(bool _isYes) external payable marketOpen {
        require(msg.value >= MIN_BUY, "Below minimum");
        
        uint256 shares = msg.value / SHARE_PRICE;
        require(shares > 0, "Must buy at least 1 share");
        
        if (_isYes) {
            yesShares[msg.sender] += shares;
            totalYesShares += shares;
        } else {
            noShares[msg.sender] += shares;
            totalNoShares += shares;
        }
        
        totalPool += msg.value;
        
        emit SharesPurchased(msg.sender, _isYes, shares, msg.value, block.timestamp);
    }
    
    // ============ Resolution Functions ============
    
    /**
     * @notice Resolve the market (creator only)
     * @param _yesWins true if YES wins, false if NO wins
     */
    function resolve(bool _yesWins) external onlyCreator marketEnded notResolved {
        isResolved = true;
        winningOutcome = _yesWins;
        resolutionTime = block.timestamp;
        
        emit MarketResolved(_yesWins, totalPool, block.timestamp);
    }
    
    /**
     * @notice Emergency resolve by owner
     * @param _yesWins true if YES wins, false if NO wins
     */
    function emergencyResolve(bool _yesWins) external onlyOwner notResolved {
        isResolved = true;
        winningOutcome = _yesWins;
        resolutionTime = block.timestamp;
        
        emit MarketResolved(_yesWins, totalPool, block.timestamp);
    }
    
    // ============ Claim Functions ============
    
    /**
     * @notice Claim winnings after market resolution
     */
    function claimWinnings() external marketResolved {
        require(!hasClaimed[msg.sender], "Already claimed");
        
        uint256 userShares;
        uint256 totalWinningShares;
        
        if (winningOutcome) {
            userShares = yesShares[msg.sender];
            totalWinningShares = totalYesShares;
        } else {
            userShares = noShares[msg.sender];
            totalWinningShares = totalNoShares;
        }
        
        require(userShares > 0, "No winning shares");
        require(totalWinningShares > 0, "No winners");
        
        // Calculate winnings
        uint256 grossWinnings = (totalPool * userShares) / totalWinningShares;
        uint256 fee = (grossWinnings * PLATFORM_FEE) / BASIS_POINTS;
        uint256 netWinnings = grossWinnings - fee;
        
        hasClaimed[msg.sender] = true;
        
        // Transfer winnings
        (bool success, ) = payable(msg.sender).call{value: netWinnings}("");
        require(success, "Transfer failed");
        
        emit WinningsClaimed(msg.sender, netWinnings, block.timestamp);
    }
    
    /**
     * @notice Get claimable amount for a user
     */
    function getClaimableAmount(address _user) external view returns (uint256) {
        if (!isResolved || hasClaimed[_user]) return 0;
        
        uint256 userShares;
        uint256 totalWinningShares;
        
        if (winningOutcome) {
            userShares = yesShares[_user];
            totalWinningShares = totalYesShares;
        } else {
            userShares = noShares[_user];
            totalWinningShares = totalNoShares;
        }
        
        if (userShares == 0 || totalWinningShares == 0) return 0;
        
        uint256 grossWinnings = (totalPool * userShares) / totalWinningShares;
        uint256 fee = (grossWinnings * PLATFORM_FEE) / BASIS_POINTS;
        return grossWinnings - fee;
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get user's position
     */
    function getUserPosition(address _user) external view returns (
        uint256 _yesShares,
        uint256 _noShares,
        uint256 _totalInvested
    ) {
        _yesShares = yesShares[_user];
        _noShares = noShares[_user];
        _totalInvested = (_yesShares + _noShares) * SHARE_PRICE;
    }
    
    /**
     * @notice Get market info
     */
    function getMarketInfo() external view returns (
        string memory _question,
        string memory _description,
        uint256 _endTime,
        bool _isResolved,
        bool _winningOutcome,
        uint256 _totalYesShares,
        uint256 _totalNoShares,
        uint256 _totalPool
    ) {
        return (
            question,
            description,
            endTime,
            isResolved,
            winningOutcome,
            totalYesShares,
            totalNoShares,
            totalPool
        );
    }
    
    /**
     * @notice Get current probability (YES percentage)
     */
    function getProbability() external view returns (uint256) {
        uint256 total = totalYesShares + totalNoShares;
        if (total == 0) return 50; // Default 50%
        return (totalYesShares * 100) / total;
    }
    
    /**
     * @notice Check if market is open for trading
     */
    function isMarketOpen() external view returns (bool) {
        return block.timestamp < endTime && !isResolved;
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Withdraw platform fees (owner only)
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees");
        
        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "Transfer failed");
    }
    
    /**
     * @notice Update end time (creator only, before market ends)
     */
    function extendEndTime(uint256 _newEndTime) external onlyCreator {
        require(_newEndTime > endTime, "Must be later");
        require(block.timestamp < endTime, "Market already ended");
        endTime = _newEndTime;
    }
    
    // ============ Receive Function ============
    
    receive() external payable {
        revert("Use buyYes or buyNo");
    }
}
