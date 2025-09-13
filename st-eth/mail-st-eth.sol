// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Minimal stETH-like (rebasing) ERC20
 * - Balances grow via "rebases" that increase total pooled ETH.
 * - Internally tracks "shares" that don't change on rebase.
 * - Mint/Burn gated to owner (simulating Lido protocol).
 *
 * NOTE: Educational toy. NO fees, NO deposits, NO oracle, NOT audited.
 */
contract MiniStETH {
    // --- ERC20 metadata ---
    string public constant name = "Mini stETH";
    string public constant symbol = "mstETH";
    uint8  public constant decimals = 18;

    // --- ownership ---
    address public owner;
    modifier onlyOwner() { require(msg.sender == owner, "not owner"); _; }

    // --- share accounting ---
    uint256 public totalShares;       // sum(shares[addr])
    uint256 public totalPooledEth;    // virtual "ETH backing" (totalSupply)

    mapping(address => uint256) private shares;
    mapping(address => mapping(address => uint256)) public allowance;

    // --- ERC20 views ---
    function totalSupply() public view returns (uint256) { return totalPooledEth; }
    function balanceOf(address a) public view returns (uint256) {
        return _amountFromShares(shares[a]);
    }

    // --- constructor ---
    constructor() { owner = msg.sender; }

    // --- core math ---
    function _amountFromShares(uint256 s) internal view returns (uint256) {
        if (totalShares == 0) return 0;
        return s * totalPooledEth / totalShares;
    }
    function _sharesFromAmount(uint256 amount) internal view returns (uint256) {
        if (totalShares == 0 || totalPooledEth == 0) return amount; // 1:1 on first mint
        return amount * totalShares / totalPooledEth;
    }

    // --- transfers (move shares) ---
    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 a = allowance[from][msg.sender];
        require(a >= amount, "allowance");
        if (a != type(uint256).max) allowance[from][msg.sender] = a - amount;
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(to != address(0), "to=0");
        uint256 sh = _sharesFromAmount(amount);
        require(shares[from] >= sh, "balance");
        shares[from] -= sh;
        shares[to]   += sh;
        emit Transfer(from, to, amount);
    }

    // --- protocol ops (simulating Lido) ---
    /// @notice Mint `amount` (rebasing units) to `to` (owner only).
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "to=0");
        uint256 sh = _sharesFromAmount(amount);
        totalShares     += sh;
        totalPooledEth  += amount;
        shares[to]      += sh;
        emit Transfer(address(0), to, amount);
    }

    /// @notice Burn `amount` (rebasing units) from `from` (owner only).
    function burn(address from, uint256 amount) external onlyOwner {
        uint256 sh = _sharesFromAmount(amount);
        require(shares[from] >= sh, "balance");
        shares[from]     -= sh;
        totalShares      -= sh;
        totalPooledEth   -= amount;
        emit Transfer(from, address(0), amount);
    }

    /// @notice Rebase: add `reward` to pooled ETH (balances grow, shares unchanged).
    function rebase(uint256 reward) external onlyOwner {
        totalPooledEth += reward;
        emit Rebase(reward, totalPooledEth, totalShares);
    }

    // --- events ---
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Rebase(uint256 rewardAdded, uint256 newTotalPooledEth, uint256 totalShares);
}