// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Sorted OrderBook with Price-Time Priority
/// @notice Educational demo of an on-chain order book with escrow, settlement, fees
/// @dev Simplified example, not gas-efficient or production-ready!
contract SortedOrderBook {
    // ================================
    // ======== Data Structures =======
    // ================================
    struct Order {
        uint256 id;          // unique order ID
        address trader;      // trader's address
        bool isBuy;          // true = buy order, false = sell order
        address baseToken;   // token being traded (e.g., ETH)
        address quoteToken;  // token used for pricing (e.g., USDC)
        uint256 price;       // price in quoteToken per 1 baseToken
        uint256 amount;      // how much baseToken is still open
        uint256 timestamp;   // for FIFO within same price
    }

    // Order IDs increment
    uint256 public nextOrderId;

    // Recipient for trading fees
    address public feeRecipient;

    // Fee rate in basis points (bps), e.g. 30 = 0.3%
    uint256 public feeBps = 30;

    // Arrays of active orders
    Order[] public bids; // buy orders (sorted: highest price first)
    Order[] public asks; // sell orders (sorted: lowest price first)

    // ================================
    // ========= Events ===============
    // ================================
    event OrderPlaced(uint256 id, address trader, bool isBuy, uint256 price, uint256 amount);
    event Trade(uint256 buyId, uint256 sellId, uint256 amount, uint256 price, uint256 fee);

    // ================================
    // ========= Constructor ==========
    // ================================
    constructor(address _feeRecipient) {
        feeRecipient = _feeRecipient;
    }

    // ================================
    // ======== Place Orders ==========
    // ================================

    /// @notice Place a new order. Escrows tokens and tries to auto-match
    /// @param isBuy true for buy order, false for sell
    /// @param baseToken token being bought/sold
    /// @param quoteToken token for pricing
    /// @param price price quoted as "quoteToken per 1 baseToken"
    /// @param amount amount of baseToken to trade
    function placeOrder(
        bool isBuy,
        address baseToken,
        address quoteToken,
        uint256 price,
        uint256 amount
    ) external {
        require(price > 0 && amount > 0, "invalid input");
        require(baseToken != quoteToken, "bad pair");

        // Assign new ID
        uint256 orderId = nextOrderId++;
        uint256 cost = price * amount;

        if (isBuy) {
            // For a buy order, escrow cost in quoteToken
            require(IERC20(quoteToken).transferFrom(msg.sender, address(this), cost), "escrow fail");

            // Create order
            Order memory buy = Order(orderId, msg.sender, true, baseToken, quoteToken, price, amount, block.timestamp);

            // Try to fill immediately against sell side
            matchAsBuyer(buy);
        } else {
            // For a sell order, escrow baseToken
            require(IERC20(baseToken).transferFrom(msg.sender, address(this), amount), "escrow fail");

            // Create order
            Order memory sell = Order(orderId, msg.sender, false, baseToken, quoteToken, price, amount, block.timestamp);

            // Try to fill immediately against buy side
            matchAsSeller(sell);
        }

        emit OrderPlaced(orderId, msg.sender, isBuy, price, amount);
    }

    // ================================
    // ======== Matching Logic ========
    // ================================

    /// @dev Try to match a buy order against best asks
    function matchAsBuyer(Order memory buy) internal {
        for (uint i = 0; i < asks.length && buy.amount > 0; ) {
            Order storage ask = asks[i];

            // Match if ask price <= buy price
            if (ask.price <= buy.price && ask.amount > 0) {
                uint256 tradeAmount = min(buy.amount, ask.amount);
                uint256 cost = tradeAmount * ask.price; // execute at ask price
                uint256 fee = (cost * feeBps) / 10000;

                // Transfer settlement:
                // - buyer gets baseToken
                IERC20(buy.baseToken).transfer(buy.trader, tradeAmount);
                // - seller gets quoteToken minus fee
                IERC20(buy.quoteToken).transfer(ask.trader, cost - fee);
                // - fee recipient gets fee
                IERC20(buy.quoteToken).transfer(feeRecipient, fee);

                emit Trade(buy.id, ask.id, tradeAmount, ask.price, fee);

                // Update open amounts
                buy.amount -= tradeAmount;
                ask.amount -= tradeAmount;

                // Remove filled ask
                if (ask.amount == 0) {
                    removeAsk(i);
                } else {
                    i++;
                }
            } else {
                // Price too high, move on
                i++;
            }
        }

        // If not fully filled, add remaining to bid book
        if (buy.amount > 0) {
            bids.push(buy);
            sortBids();
        }
    }

    /// @dev Try to match a sell order against best bids
    function matchAsSeller(Order memory sell) internal {
        for (uint i = 0; i < bids.length && sell.amount > 0; ) {
            Order storage bid = bids[i];

            // Match if bid price >= sell price
            if (bid.price >= sell.price && bid.amount > 0) {
                uint256 tradeAmount = min(sell.amount, bid.amount);
                uint256 cost = tradeAmount * bid.price; // execute at bid price
                uint256 fee = (cost * feeBps) / 10000;

                // Transfer settlement:
                // - buyer (bidder) gets baseToken
                IERC20(sell.baseToken).transfer(bid.trader, tradeAmount);
                // - seller gets quoteToken minus fee
                IERC20(sell.quoteToken).transfer(sell.trader, cost - fee);
                // - fee recipient gets fee
                IERC20(sell.quoteToken).transfer(feeRecipient, fee);

                emit Trade(bid.id, sell.id, tradeAmount, bid.price, fee);

                // Update open amounts
                sell.amount -= tradeAmount;
                bid.amount -= tradeAmount;

                // Remove filled bid
                if (bid.amount == 0) {
                    removeBid(i);
                } else {
                    i++;
                }
            } else {
                // Price too low, move on
                i++;
            }
        }

        // If not fully filled, add remaining to ask book
        if (sell.amount > 0) {
            asks.push(sell);
            sortAsks();
        }
    }

    // ================================
    // ========= Sorting ==============
    // ================================

    /// @dev Sort bids by price descending (highest first)
    function sortBids() internal {
        for (uint i = bids.length - 1; i > 0; i--) {
            if (bids[i].price > bids[i - 1].price) {
                (bids[i], bids[i - 1]) = (bids[i - 1], bids[i]);
            }
        }
    }

    /// @dev Sort asks by price ascending (lowest first)
    function sortAsks() internal {
        for (uint i = asks.length - 1; i > 0; i--) {
            if (asks[i].price < asks[i - 1].price) {
                (asks[i], asks[i - 1]) = (asks[i - 1], asks[i]);
            }
        }
    }

    // ================================
    // ===== Helper Functions =========
    // ================================

    function removeBid(uint index) internal {
        bids[index] = bids[bids.length - 1];
        bids.pop();
        if (bids.length > 1) sortBids();
    }

    function removeAsk(uint index) internal {
        asks[index] = asks[asks.length - 1];
        asks.pop();
        if (asks.length > 1) sortAsks();
    }

    function min(uint a, uint b) internal pure returns (uint) {
        return a < b ? a : b;
    }
}