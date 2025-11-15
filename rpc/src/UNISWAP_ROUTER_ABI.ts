export const UNISWAP_ROUTER_ABI = [
  'function exactInputSingle((bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum)) payable returns (uint256 amountOut)',
  'function multicall(uint256 deadline, bytes[] calldata data) payable returns (bytes[] memory results)',
];
