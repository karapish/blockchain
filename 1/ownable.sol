/**
 * BEGINNER NOTES
 * ---------------
 * This file contains two parts:
 *
 * 1) Ownable (a small "access control" helper):
 *    - Remembers an "owner" address (set to the deployer by default).
 *    - The `onlyOwner` modifier restricts certain functions so only the owner can call them.
 *    - The owner can transfer ownership to a new address later.
 *
 * 2) MyToken (a minimal ERC-20-like token):
 *    - Keeps track of balances (who owns how many tokens).
 *    - Allows token transfers (`transfer`) and delegated transfers (`approve` + `transferFrom`).
 *    - Allows the owner to mint (create) new tokens.
 *    - Allows anyone to burn their own tokens; the owner can also burn from someone (policy choice).
 *
 * IMPORTANT CONCEPTS
 * -------------------
 * - Mapping: a key-value store built into Solidity (e.g., mapping(address => uint256) for balances).
 * - Event: a log entry clients/servers can "watch" off-chain (e.g., Transfer and Approval).
 * - Modifier: pre-check for functions (e.g., onlyOwner).
 * - revert / require: ways to stop execution when a condition is not met.
 * - address(0): the "zero address" (0x000...000). It's not a real user; often used in mint/burn events.
 *
 * GAS/SAFETY NOTES
 * -----------------
 * - Solidity 0.8+ has built-in overflow checks; we use `unchecked { ... }` in places where math is safe
 *   (after we verified sizes) to save gas.
 * - We emit events as required by ERC-20 spec (Transfer/Approval).
 * - We prevent sending to the zero address in transfers (to avoid accidental "black-holing" of tokens).
 * - We allow "infinite approval": if allowance is set to type(uint256).max, transferFrom doesn't reduce it.
 *
 * LEARNING TIP
 * -------------
 * Read this file top-to-bottom:
 * - First understand Ownable (very short).
 * - Then read MyToken storage variables, constructor, and functions one by one.
 */

/// @title Ownable + ERC20 (mint/burn) — from scratch, single file

/* =========================  OWNABLE  ========================= */
/**
 * Ownable is a small helper that stores a privileged address (the "owner").
 * Use cases: admin-only functions like minting, pausing, upgrading, etc.
 */

import "./logger.sol";

/* An abstract contract in Solidity is like a blueprint:
•	It cannot be deployed on its own.
•	It usually has one or more functions without implementation (like “to-do” functions).
•	Other contracts inherit from it and must implement those missing functions.
*/
abstract contract Ownable {
    // PUBLIC VARIABLES:

    // A constant for the zero address, to save gas on comparisons.
    address public OwnerAddressNull = address(0); // compile time assignment

    // Anyone can read the owner address. Public variables get an auto-generated "owner()" getter.
    address public Owner = OwnerAddressNull; // cannot be immutable because we allow ownership transfer

    // A constant error message for require statements (saves gas vs inline strings).
    string public OwnerAddressNullMsg = "null owner";

    // EVENT:
    // Emitted whenever the owner changes (from previousOwner to newOwner). Helps off-chain tracking.
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // CUSTOM ERROR:
    // Cheaper than a string in require("...") and more descriptive than a plain revert().
    error NotOwner();

    /**
     * CONSTRUCTOR:
     * Runs once when the contract is deployed. Sets the initial owner to the deployer (msg.sender).
     * Also emits OwnershipTransferred from address(0) (no previous owner) to the deployer.
     */
    constructor() payable {
        Logger.logAddress("msg.sender", msg.sender);
        Logger.logValue("msg.value", msg.value); // stores how much ETH was sent at deploy (payable)
        Logger.logBytes("msg.data", msg.data);

        Owner = msg.sender;
        emit OwnershipTransferred(OwnerAddressNull, Owner);
    }

    /**
     * MODIFIER: onlyOwner
     * Wrap functions that only the owner should be able to call.
     * If msg.sender is not the owner → revert with NotOwner().
     */
    modifier onlyOwner() {
        if (msg.sender != Owner) revert NotOwner();
        _;
    }

    /**
     * FUNCTION: transferOwnership
     * Lets the current owner assign ownership to a new address.
     * We forbid setting owner to address(0) because that would "lock" the contract without an owner.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != OwnerAddressNull, OwnerAddressNullMsg);
        Owner = newOwner;
        emit OwnershipTransferred(Owner, newOwner);
    }
}