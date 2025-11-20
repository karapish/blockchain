// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Simple Multi-Asset Order Book
/// @notice Educational demo order book for ERC-20 pairs (not production-ready!)
contract SimpleOrderBook {
    struct Order {
        uint256 id;          // unique ID for this order
        address trader;      // owner of the order
        bool    isBuy;       // true = buy order, false = sell order
        address baseToken;   // token being bought/sold (e.g., ETH, USDC, etc.)
        address quoteToken;  // token used for pricing (e.g., USDC if base is ETH)
        uint256 price;       // price per unit of baseToken in terms of quoteToken
        uint256 amount;      // amount of baseToken to trade
    }

    uint256                   public nextOrderId;
    mapping(uint256 => Order) public orders;

    /// @dev Events let off-chain systems (e.g. frontend) track the book
    event OrderPlaced(
        uint256 id,
        address indexed trader,
        bool            isBuy,
        address indexed baseToken,
        address indexed quoteToken,
        uint256         price,
        uint256         amount
    );
    event OrderCancelled(uint256 id);

    /// @notice Place a new buy/sell order
    /// @param isBuy true for buy order, false for sell order
    /// @param baseToken the token you want to buy/sell
    /// @param quoteToken the token you want to pay/receive
    /// @param price quoted as "units of quoteToken per 1 baseToken"
    /// @param amount how much baseToken to buy/sell
    function placeOrder(
        bool isBuy,
        address baseToken,
        address quoteToken,
        uint256 price,
        uint256 amount
    ) external returns (uint256) {
        require(price > 0 && amount > 0, "invalid input");
        require(baseToken != address(0) && quoteToken != address(0), "invalid token");
        require(baseToken != quoteToken, "base and quote must differ");

        // For a real exchange, you'd also transfer tokens in here:
        // - For a buy order: lock quoteToken
        // - For a sell order: lock baseToken
        // For simplicity, this contract just records orders.

        orders[nextOrderId] = Order({
            id: nextOrderId,
            trader: msg.sender,
            isBuy: isBuy,
            baseToken: baseToken,
            quoteToken: quoteToken,
            price: price,
            amount: amount
        });

        emit OrderPlaced(nextOrderId, msg.sender, isBuy, baseToken, quoteToken, price, amount);
        nextOrderId++;
        return nextOrderId - 1;
    }

    /// @notice Cancel an order you created
    function cancelOrder(uint256 orderId) external {
        Order storage ord = orders[orderId];
        require(ord.trader == msg.sender, "not owner");

        // In a real implementation, locked funds would be returned here.

        delete orders[orderId];
        emit OrderCancelled(orderId);
    }

    /// @notice Fetch order details
    function getOrder(uint256 orderId) external view returns (Order memory) {
        return orders[orderId];
    }
}