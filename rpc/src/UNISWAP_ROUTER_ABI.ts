export const UNISWAP_ROUTER_ABI = [
  // Uniswap V3 SwapRouter `exactInputSingle` with the correct params struct
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountOut)',
  'function multicall(uint256 deadline, bytes[] calldata data) payable returns (bytes[] memory results)',
  // Helpers (not used yet, but commonly paired for ETH flows)
  'function refundETH() payable',
  'function unwrapWETH9(uint256 amountMinimum, address recipient) payable'
];
