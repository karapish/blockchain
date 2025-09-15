// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20FlashMint.sol";
import "@openzeppelin/contracts/interfaces/IERC3156FlashBorrower.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Flexible Flash Lender + Switchable Logic Board
/// @notice ERC‑20 token with flash‑loan capability, where the “business logic” during the loan can be swapped
///
/// Things to Watch Out:
///   - Storage layout: logic modules must not clash in storage slots with the main contract (proxy pattern risks). Mismatched layouts → storage collision & data corruption.  [oai_citation:0‡SmartMuv](https://smartmuv.app/blog/storage-collisions-in-smart-contracts/?utm_source=chatgpt.com)
///   - Restrict who can change logic: only owner/admin should set new logic module, to prevent malicious upgrades.
///   - Gas & complexity: more layers (delegatecalls) cost more gas, increase risk of running out of gas in flash callback.
///   - Reentrancy / safety: logic module code runs in context of the lender; ensure callbacks are safe (no unexpected state or external calls that open vulnerabilities).
///   - Interface compliance: logic modules must conform to the IFlashLogic interface exactly, including return values, or flash loan will fail.
///   - Testing: thoroughly test both existing logic and new module swaps, especially on testnet/fuji to ensure correct behavior and repayment + fee flows.
///
/// @dev Main contract holds state, lending logic; logic modules handle business behavior via delegatecall pattern
interface IFlashLogic {
    /// @notice Execute user/business logic during flash loan callback
    /// @dev Must return keccak256("onFlashLoanLogicExecuted")
    function executeLogic(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external returns (bytes32);
}

contract FlexibleFlashLender is ERC20FlashMint, Ownable {
    // Address of current logic module
    IFlashLogic public logic;

    constructor(address initialLogic) ERC20("FlexibleFlashToken", "FFT") {
        logic = IFlashLogic(initialLogic);
        // Mint initial supply for testing / usage
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    /// @notice Only owner can switch the logic module
    function setLogic(address newLogic) external onlyOwner {
        logic = IFlashLogic(newLogic);
    }

    /// @dev Override fee if needed
    function flashFee(address token_, uint256 amount_) public view override returns (uint256) {
        require(token_ == address(this), "Unsupported token");
        // example fee: 0.05%
        return (amount_ * 5) / 10000;
    }

    /// @dev Callback during flash loan
    function onFlashLoan(
        address initiator,
        address token_,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external override returns (bytes32) {
        // must be lender itself calling
        require(msg.sender == address(this), "Only lender");
        // logic module must be set
        require(address(logic) != address(0), "Logic not set");

        // delegate business logic
        bytes32 result = logic.executeLogic(initiator, token_, amount, fee, data);

        return result;
    }
}

/// @title Example Logic Module V1
contract FlashLogicV1 is IFlashLogic {
    IERC20 public token;

    constructor(address tokenAddress) {
        token = IERC20(tokenAddress);
    }

    /// @notice Business logic during flash loan
    function executeLogic(
        address initiator,
        address tokenAddr,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external override returns (bytes32) {
        // custom logic here; e.g. arbitrage, swaps, etc.

        // then repay loan + fee
        IERC20(tokenAddr).approve(msg.sender, amount + fee);

        return keccak256("onFlashLoanLogicExecuted");
    }
}