// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./logger.sol";

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
abstract contract Ownable {
    // PUBLIC VARIABLE:
    // Anyone can read the owner address. Public variables get an auto-generated "owner()" getter.
    address public _owner;

    // INTERNAL VARIABLE:
    // A constant for the zero address, to save gas on comparisons.
    address private constant _OWNER_NULL = address(0);

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
        Logger.logValue("msg.value", msg.value);
        Logger.logBytes("msg.data", msg.data);

        _owner = msg.sender;
        emit OwnershipTransferred(_OWNER_NULL, _owner);
    }

    /**
     * MODIFIER: onlyOwner
     * Wrap functions that only the owner should be able to call.
     * If msg.sender is not the owner → revert with NotOwner().
     */
    modifier onlyOwner() {
        if (msg.sender != _owner) revert NotOwner();
        _;
    }

    /**
     * FUNCTION: transferOwnership
     * Lets the current owner assign ownership to a new address.
     * We forbid setting owner to address(0) because that would "lock" the contract without an owner.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero addr");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}

/* =========================  ERC20  ========================= */
/**
 * MyToken is a minimal ERC-20-style token implementation.
 * It does not include every optional feature of the standard, but it covers:
 * - balanceOf: how many tokens each address has.
 * - totalSupply: total number of tokens in existence.
 * - transfer: send tokens to another address.
 * - approve: let someone else spend your tokens up to a limit.
 * - transferFrom: spend from someone else's balance using an allowance.
 * - mint: owner can create new tokens (increasing totalSupply).
 * - burn / burnFrom: destroy tokens (decreasing balances and totalSupply).
 *
 * NAMING:
 * - name and symbol are set in the constructor.
 * - decimals is a constant 18 (like ETH), so 1 token = 10^18 "smallest units".
 */
contract MyToken is Ownable {
    // Basic token metadata
    string public name;                         // e.g., "My Token"
    string public symbol;                       // e.g., "MYT"
    uint8  public immutable decimals = 18;      // fixed to 18 to mimic ETH-like units

    // SUPPLY + ACCOUNTING
    uint256 public totalSupply;                 // sum of all balances
    mapping(address => uint256) public balanceOf; // balanceOf[user] = how many tokens user owns

    // ALLOWANCES:
    // allowance[owner][spender] = how many tokens "spender" can pull from "owner" via transferFrom
    mapping(address => mapping(address => uint256)) public allowance;

    // EVENTS (required by ERC-20):
    // Transfer must be emitted on transfers, mint (from address(0)), and burn (to address(0))
    event Transfer(address indexed from, address indexed to, uint256 value);
    // Approval must be emitted when an allowance is set/changed
    event Approval(address indexed owner, address indexed spender, uint256 value);

    // CUSTOM ERRORS to save gas vs strings
    error InsufficientBalance();
    error InsufficientAllowance();

    /**
     * CONSTRUCTOR:
     * Provide token name and symbol when deploying.
     * Example: new MyToken("My Token", "MYT");
     * NOTE: We don't do an initial mint here; you can add one if desired.
     */
    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
    }

    /**
     * FUNCTION: transfer
     * Move `value` tokens from the caller (msg.sender) to `to`.
     * Returns true on success (common ERC-20 convention).
     *
     * COMMON MISTAKE:
     * - Trying to transfer more than your balance will revert with InsufficientBalance().
     */
    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    /**
     * FUNCTION: approve
     * Set `spender`'s allowance to exactly `value`.
     * This overwrites any previous allowance for that spender.
     *
     * SECURITY TIP:
     * - Some frontends recommend first setting allowance to 0, then to the new value,
     *   to reduce the chance of "race conditions" with old allowances.
     * - Using "infinite approval" (type(uint256).max) is convenient but risky—only approve trusted contracts.
     */
    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    /**
     * FUNCTION: transferFrom
     * Move `value` tokens from `from` to `to`, using the caller's allowance.
     *
     * HOW IT WORKS:
     * - The caller (usually a contract) must have allowance[from][caller] >= value
     * - If allowance is not infinite (type(uint256).max), we reduce it by `value`.
     * - Then we perform the actual transfer.
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed < value) revert InsufficientAllowance();

        // Infinite approval optimization:
        // If allowed == max uint, we treat it as "no need to decrease".
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - value;
            emit Approval(from, msg.sender, allowance[from][msg.sender]); // emit updated allowance
        }

        _transfer(from, to, value);
        return true;
    }

    /**
     * FUNCTION: mint (OWNER ONLY)
     * Create `value` new tokens and add them to `to`'s balance.
     * This increases totalSupply.
     *
     * WARNING:
     * - Minting lets the owner increase supply arbitrarily; in production tokens, minting is often
     *   limited by a cap or controlled via governance/roles.
     */
    function mint(address to, uint256 value) external onlyOwner {
        _mint(to, value);
    }

    /**
     * FUNCTION: burnFrom (OWNER ONLY)
     * Destroy `value` tokens from `from`'s balance.
     * This reduces totalSupply.
     *
     * POLICY CHOICE:
     * - Many tokens restrict burning to the holder or require allowance;
     *   here, the owner can burn from anyone (for demonstration). Adjust for your needs.
     */
    function burnFrom(address from, uint256 value) external onlyOwner {
        _burn(from, value);
    }

    /**
     * FUNCTION: burn (SELF)
     * Destroy `value` tokens from the caller's balance.
     * This reduces totalSupply.
     */
    function burn(uint256 value) external {
        _burn(msg.sender, value);
    }

    /**
     * INTERNAL: _transfer
     * The core logic for moving tokens between addresses.
     *
     * SAFETY CHECKS:
     * - `to` must not be the zero address (avoid sending tokens into a black hole).
     * - Sender must have at least `value` tokens.
     * GAS OPTIMIZATION:
     * - We use `unchecked` after verifying balances to save gas on safe math checks.
     * EVENTS:
     * - Must emit Transfer(from, to, value) as per ERC-20.
     */
    function _transfer(address from, address to, uint256 value) internal {
        require(to != address(0), "transfer to zero");
        uint256 bal = balanceOf[from];
        if (bal < value) revert InsufficientBalance();

        unchecked {
            balanceOf[from] = bal - value; // safe because we checked bal >= value
            balanceOf[to] += value;        // addition won't overflow in realistic scenarios
        }
        emit Transfer(from, to, value);
    }

    /**
     * INTERNAL: _mint
     * Create `value` tokens and give them to `to`.
     *
     * RULES:
     * - `to` cannot be the zero address.
     * - Increase totalSupply and the recipient's balance.
     * - Emit Transfer(address(0), to, value) to signal a mint (ERC-20 convention).
     */
    function _mint(address to, uint256 value) internal {
        require(to != address(0), "mint to zero");
        totalSupply += value;
        balanceOf[to] += value;
        emit Transfer(address(0), to, value);
    }

    /**
     * INTERNAL: _burn
     * Destroy `value` tokens from `from`.
     *
     * EFFECT:
     * - Decreases `from` balance and `totalSupply`.
     * - Emits Transfer(from, address(0), value) to signal a burn (ERC-20 convention).
     */
    function _burn(address from, uint256 value) internal {
        uint256 bal = balanceOf[from];
        if (bal < value) revert InsufficientBalance();

        unchecked {
            balanceOf[from] = bal - value; // safe after check
            totalSupply -= value;          // reduce global supply
        }
        emit Transfer(from, address(0), value);
    }
}