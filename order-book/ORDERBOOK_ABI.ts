export const SIMPLE_ORDERBOOK_ABI = [
    'function placeOrder(bool isBuy, address baseToken, address quoteToken, uint256 price, uint256 amount) external returns (uint256)',
    'function cancelOrder(uint256 orderId) external',
    'function getOrder(uint256 orderId) external view returns (tuple(uint256 id, address trader, bool isBuy, address baseToken, address quoteToken, uint256 price, uint256 amount))',
    'function nextOrderId() external view returns (uint256)',
    'event OrderPlaced(uint256 id, address indexed trader, bool isBuy, address indexed baseToken, address indexed quoteToken, uint256 price, uint256 amount)',
    'event OrderCancelled(uint256 id)',
];

export const SORTED_ORDERBOOK_ABI = [
    'constructor(address _feeRecipient)',
    'function placeOrder(bool isBuy, address baseToken, address quoteToken, uint256 price, uint256 amount) external',
    'function nextOrderId() external view returns (uint256)',
    'function feeRecipient() external view returns (address)',
    'function feeBps() external view returns (uint256)',
    'function bids(uint256) external view returns (tuple(uint256 id, address trader, bool isBuy, address baseToken, address quoteToken, uint256 price, uint256 amount, uint256 timestamp))',
    'function asks(uint256) external view returns (tuple(uint256 id, address trader, bool isBuy, address baseToken, address quoteToken, uint256 price, uint256 amount, uint256 timestamp))',
    'event OrderPlaced(uint256 id, address trader, bool isBuy, uint256 price, uint256 amount)',
    'event Trade(uint256 buyId, uint256 sellId, uint256 amount, uint256 price, uint256 fee)',
];

// Bytecode will be added after compilation
export const SIMPLE_ORDERBOOK_BYTECODE = '';
export const SORTED_ORDERBOOK_BYTECODE = '';
