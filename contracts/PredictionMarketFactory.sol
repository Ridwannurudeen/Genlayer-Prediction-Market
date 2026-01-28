// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./PredictionMarket.sol";

/**
 * @title PredictionMarketFactory
 * @notice Factory contract to deploy new prediction markets
 * @dev Deployed on Base Sepolia for testing
 */
contract PredictionMarketFactory {
    // ============ State Variables ============
    
    address public owner;
    uint256 public marketCount;
    uint256 public creationFee;
    
    // Array of all deployed markets
    address[] public markets;
    
    // Mapping from market ID to contract address
    mapping(uint256 => address) public marketById;
    
    // Mapping from creator to their markets
    mapping(address => address[]) public marketsByCreator;
    
    // ============ Events ============
    
    event MarketCreated(
        uint256 indexed marketId,
        address indexed marketAddress,
        address indexed creator,
        string question,
        uint256 endTime
    );
    
    event CreationFeeUpdated(uint256 oldFee, uint256 newFee);
    
    event FeesWithdrawn(address indexed owner, uint256 amount);
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    // ============ Constructor ============
    
    constructor() {
        owner = msg.sender;
        creationFee = 0; // Free for testnet
    }
    
    // ============ Market Creation ============
    
    /**
     * @notice Create a new prediction market
     * @param _question The market question
     * @param _description Additional description
     * @param _durationDays How long the market is open (in days)
     */
    function createMarket(
        string calldata _question,
        string calldata _description,
        uint256 _durationDays
    ) external payable returns (address marketAddress, uint256 marketId) {
        require(msg.value >= creationFee, "Insufficient fee");
        require(bytes(_question).length > 0, "Empty question");
        require(_durationDays > 0 && _durationDays <= 365, "Invalid duration");
        
        // Deploy new market contract
        PredictionMarket newMarket = new PredictionMarket(
            msg.sender,
            _question,
            _description,
            _durationDays
        );
        
        marketAddress = address(newMarket);
        marketId = marketCount;
        
        // Store market
        markets.push(marketAddress);
        marketById[marketId] = marketAddress;
        marketsByCreator[msg.sender].push(marketAddress);
        
        marketCount++;
        
        emit MarketCreated(
            marketId,
            marketAddress,
            msg.sender,
            _question,
            block.timestamp + (_durationDays * 1 days)
        );
        
        // Refund excess payment
        if (msg.value > creationFee) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - creationFee}("");
            require(success, "Refund failed");
        }
        
        return (marketAddress, marketId);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get all market addresses
     */
    function getAllMarkets() external view returns (address[] memory) {
        return markets;
    }
    
    /**
     * @notice Get markets by creator
     */
    function getMarketsByCreator(address _creator) external view returns (address[] memory) {
        return marketsByCreator[_creator];
    }
    
    /**
     * @notice Get market info by ID
     */
    function getMarketInfo(uint256 _marketId) external view returns (
        address marketAddress,
        string memory question,
        uint256 endTime,
        bool isResolved,
        uint256 totalPool
    ) {
        require(_marketId < marketCount, "Invalid ID");
        
        PredictionMarket market = PredictionMarket(payable(marketById[_marketId]));
        
        return (
            address(market),
            market.question(),
            market.endTime(),
            market.isResolved(),
            market.totalPool()
        );
    }
    
    /**
     * @notice Get recent markets (last N)
     */
    function getRecentMarkets(uint256 _count) external view returns (address[] memory) {
        uint256 count = _count > marketCount ? marketCount : _count;
        address[] memory recent = new address[](count);
        
        for (uint256 i = 0; i < count; i++) {
            recent[i] = markets[marketCount - 1 - i];
        }
        
        return recent;
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Update creation fee
     */
    function setCreationFee(uint256 _newFee) external onlyOwner {
        emit CreationFeeUpdated(creationFee, _newFee);
        creationFee = _newFee;
    }
    
    /**
     * @notice Withdraw collected fees
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees");
        
        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "Transfer failed");
        
        emit FeesWithdrawn(owner, balance);
    }
    
    /**
     * @notice Transfer ownership
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid address");
        owner = _newOwner;
    }
    
    // ============ Receive Function ============
    
    receive() external payable {}
}
