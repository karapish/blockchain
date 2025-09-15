/*
Notes
•	FlashMintToken is the lender / the token you can borrow.
•	FlashBorrowerExample is a borrower that does a flash loan then repays.
•	You need to deploy FlashMintToken first, then deploy FlashBorrowerExample passing the token contract address as both lender and token (since ERC20FlashMint acts as lender for its own token).
•	Make sure you have enough gas; flash loans require the callback and repayment all in one transaction.
*/


// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Import OpenZeppelin’s ERC20FlashMint, which implements ERC‑20 + flash loan logic
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20FlashMint.sol";
// ERC20 interface to interact with tokens (transfer, approve, etc.)
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// Interface for contracts that receive flash loans per ERC‑3156
import "@openzeppelin/contracts/interfaces/IERC3156FlashBorrower.sol";
// Interface for lenders in the ERC‑3156 standard
import "@openzeppelin/contracts/interfaces/IERC3156FlashLender.sol";

/// @title FlashMintToken
/// @notice ERC20 token that also allows flash loans via minting & burning
contract FlashMintToken is ERC20FlashMint {
    /// @dev Constructor sets name/symbol and mints initial supply to deployer
    constructor() ERC20("FlashMintToken", "FMT") {
        // Mint some initial tokens to the deployer's address for testing/use
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    /// @notice Optional override to charge flash loan fee
    /// @param token The address of token being borrowed (should match this token)
    /// @param amount How many tokens are requested in the flash loan
    /// @return fee Amount of fee required for flash loan
    function flashFee(address token, uint256 amount) public view override returns (uint256) {
        // Ensure only this token is supported
        require(token == address(this), "Unsupported token");
        // Example: fee = 0.09% of the amount
        return (amount * 9) / 10000;
    }
}

/// @title FlashBorrowerExample
/// @notice Example of a contract that takes a flash loan, uses it, then repays
contract FlashBorrowerExample is IERC3156FlashBorrower {
    // Lender contract (implements IERC3156FlashLender)
    IERC3156FlashLender public lender;
    // Token being borrowed / used (ERC‑20)
    IERC20 public token;

    /// @param lenderAddress Address of the FlashMintToken contract (lender & token)
    /// @param tokenAddress Same token address to interact with
    constructor(address lenderAddress, address tokenAddress) {
        lender = IERC3156FlashLender(lenderAddress);
        token = IERC20(tokenAddress);
    }

    /// @notice Initiates a flash loan
    /// @param amount Number of tokens to borrow
    function doFlashLoan(uint256 amount) external {
        // Call lender.flashLoan; this triggers lender → borrower callback
        lender.flashLoan(
            IERC3156FlashBorrower(address(this)), // borrower
            address(token),                       // which token
            amount,                               // how many
            bytes("")                             // optional data passed to callback
        );
        // After this, onFlashLoan will execute, then must repay + fee
    }

    /// @notice Callback that lender calls during the flash loan
    /// @param initiator Who initiated the loan (should be this contract)
    /// @param tokenAddress Token address being borrowed
    /// @param amount Amount borrowed
    /// @param fee Fee that must be paid
    /// @param data Extra data passed (from doFlashLoan)
    /// @return keccak256 hash signal per ERC‑3156 standard
    function onFlashLoan(
        address initiator,
        address tokenAddress,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external override returns (bytes32) {
        // Ensure only the lender contract can call this callback
        require(msg.sender == address(lender), "Only lender");
        // Ensure the initiator is this contract (integrity check)
        require(initiator == address(this), "Only self");

        // ---
        // Business logic goes here
        // e.g. swap tokens, arbitrage, interact with other contracts etc.
        // ---

        // Approve the lender to pull back the loan + fee
        IERC20(tokenAddress).approve(address(lender), amount + fee);

        // Return selector to signal success as per ERC‑3156 spec
        return keccak256("ERC3156FlashBorrower.onFlashLoan");
    }
}