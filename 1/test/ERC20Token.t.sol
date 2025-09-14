// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * BEGINNER NOTES
 * ---------------
 * This is a Forge test file for your ERC-20 + Ownable token (ERC20Token.sol).
 *
 * How to run:
 *  1) anvil            # optional, if you want a local node (not required for `forge test`)
 *  2) forge test -vv
 *
 * What’s inside:
 *  - We import forge-std/Test.sol for handy testing helpers:
 *      - assertEq, assertTrue, etc.
 *      - vm.* cheatcodes: expectRevert, expectEmit, prank, etc.
 *  - We deploy ERC20Token.sol in setUp() so each test starts from a clean state.
 *  - We test:
 *      • Ownership and onlyOwner restrictions
 *      • Minting, burning (self + owner burnFrom)
 *      • Transfers and approvals (including infinite approvals)
 *      • Reverts for edge cases (insufficient balance, not owner, zero address)
 *      • Events are emitted correctly
 *
 * Path import:
 *  - Contract under test is one directory up from test/ (../ERC20Token.sol).
 */

import "forge-std/Test.sol";

import "../ERC20Token.sol";

contract ERC20TokenTest is Test {
    // Mirror the token's events locally so we can `emit` them in expectEmit checks
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    // The token under test
    ERC20Token internal token;

    // Deterministic helper addresses from forge-std
    address internal alice = makeAddr("alice");
    address internal bob   = makeAddr("bob");
    address internal eve   = makeAddr("eve");

    // Constants to make amounts readable (1 token = 1e18 smallest units)
    uint256 internal constant ONE = 1e18;
    uint256 internal constant HUNDRED = 100e18;

    /**
     * setUp() runs before each test function.
     * - In Forge tests, the "deployer" (msg.sender in the constructor) is the test contract itself (address(this)).
     * - This test contract will be the owner of ERC20Token.sol.
     */
    function setUp() public {
        token = new ERC20Token("My Token", "MYT");

        // As the owner (this contract), mint 100 tokens to Alice.
        token.mint(alice, HUNDRED);
    }

    /* ===================== OWNERSHIP TESTS ===================== */

    function test_OwnerIsDeployer() public view {
        // The deployer is this test contract; see setUp() notes.
        assertEq(token.Owner(), address(this), "owner should be test contract");
    }

    function test_TransferOwnership() public {
        // ✅ Case 1: Owner can transfer to Bob
        token.transferOwnership(bob);
        assertEq(token.Owner(), bob, "owner should be bob");
    }

    function test_RevertIfNotOwnerTransfers() public {
        // ✅ Case 2: Bob is not the owner → should revert with NotOwner
        vm.expectRevert(Ownable.NotOwner.selector);
        vm.prank(bob);
        token.transferOwnership(alice);
    }

    function test_RevertIfTransferToZeroAddress() public {
        // ✅ Case 3: Owner tries to transfer to 0x0 → should revert with "null owner"
        vm.expectRevert(bytes(token.OwnerAddressNullMsg()));
        token.transferOwnership(address(0));
    }

    function test_Revert_Mint_When_NotOwner() public {
        // Alice is not the owner → expect custom error NotOwner
        vm.prank(alice);
        vm.expectRevert(Ownable.NotOwner.selector);
        token.mint(alice, ONE);
    }

    function test_OnlyOwner_Mint_Works() public {
        uint256 beforeSupply = token.totalSupply();
        uint256 beforeBal = token.balanceOf(bob);

        token.mint(bob, ONE);

        assertEq(token.totalSupply(), beforeSupply + ONE, "supply should increase by minted amount");
        assertEq(token.balanceOf(bob), beforeBal + ONE, "bob balance should increase");
    }

    /* ===================== TRANSFER TESTS ===================== */

    function test_Transfer_Basic() public {
        // Alice sends 1 token to Bob
        vm.prank(alice);
        bool ok = token.transfer(bob, ONE);
        assertTrue(ok, "transfer should return true");

        assertEq(token.balanceOf(alice), HUNDRED - ONE, "alice balance decreases");
        assertEq(token.balanceOf(bob), ONE, "bob balance increases");
    }

    function test_Transfer_EmitEvent() public {
        // Expect a Transfer event: from Alice to Bob for ONE
        vm.expectEmit(true, true, false, true);
        emit Transfer(alice, bob, ONE);

        vm.prank(alice);
        token.transfer(bob, ONE);
    }

    function test_Revert_Transfer_ToZero() public {
        vm.prank(alice);
        vm.expectRevert(bytes(token.OwnerAddressNullMsg()));
        token.transfer(address(0), ONE);
    }

    function test_Revert_Transfer_InsufficientBalance() public {
        // Bob initially has 0; sending 1 should revert
        vm.prank(bob);
        vm.expectRevert(ERC20Token.InsufficientBalance.selector);
        token.transfer(eve, ONE);
    }

    /* ===================== APPROVE + TRANSFERFROM TESTS ===================== */

    function test_Approve_And_TransferFrom() public {
        // Alice approves Bob to spend 2 tokens
        vm.prank(alice);
        bool ok = token.approve(bob, 2 * ONE);
        assertTrue(ok, "approve should return true");
        assertEq(token.allowance(alice, bob), 2 * ONE, "allowance set");

        // Bob transfers 1 token from Alice to Eve
        vm.prank(bob);
        ok = token.transferFrom(alice, eve, ONE);
        assertTrue(ok, "transferFrom should return true");

        // Allowance should decrease by 1
        assertEq(token.allowance(alice, bob), ONE, "allowance decreased");
        // Balances updated
        assertEq(token.balanceOf(alice), HUNDRED - ONE, "alice decreased");
        assertEq(token.balanceOf(eve), ONE, "eve increased");
    }

    function test_TransferFrom_Emits_Approval_When_Decreasing() public {
        // Approve exactly 1 token
        vm.prank(alice);
        token.approve(bob, ONE);

        // We expect both Transfer and Approval events (Approval for updated allowance = 0)
        vm.expectEmit(true, true, false, true);
        emit Approval(alice, bob, 0);

        vm.expectEmit(true, true, false, true);
        emit Transfer(alice, eve, ONE);

        vm.prank(bob);
        token.transferFrom(alice, eve, ONE);
    }

    function test_Revert_TransferFrom_InsufficientAllowance() public {
        // No approval given yet → should revert
        vm.prank(bob);
        vm.expectRevert(ERC20Token.InsufficientAllowance.selector);
        token.transferFrom(alice, eve, ONE);
    }

    function test_InfiniteApproval_DoesNotDecrease() public {
        // Alice sets infinite approval for Bob
        vm.prank(alice);
        token.approve(bob, type(uint256).max);

        // Bob transfers 1 token from Alice to Eve twice; allowance should remain max
        vm.startPrank(bob);
        token.transferFrom(alice, eve, ONE);
        assertEq(token.allowance(alice, bob), type(uint256).max, "still infinite after first transfer");

        token.transferFrom(alice, eve, ONE);
        assertEq(token.allowance(alice, bob), type(uint256).max, "still infinite after second transfer");
        vm.stopPrank();
    }

    /* ===================== MINT / BURN TESTS ===================== */

    function test_Mint_Emits_Transfer_FromZero() public {
        // Expect Transfer(address(0), alice, ONE)
        vm.expectEmit(true, true, false, true);
        emit Transfer(address(0), alice, ONE);

        token.mint(alice, ONE);
    }

    function test_Burn_Self() public {
        // Alice burns 2 tokens from her own balance
        uint256 beforeSupply = token.totalSupply();

        vm.prank(alice);
        token.burn(2 * ONE);

        assertEq(token.balanceOf(alice), HUNDRED - 2 * ONE, "alice decreased by 2");
        assertEq(token.totalSupply(), beforeSupply - 2 * ONE, "supply decreased by 2");
    }

    function test_Burn_Emits_Transfer_ToZero() public {
        // Alice burns 1 token; should emit Transfer(alice, address(0), ONE)
        vm.expectEmit(true, true, false, true);
        emit Transfer(alice, address(0), ONE);

        vm.prank(alice);
        token.burn(ONE);
    }

    function test_Revert_Burn_InsufficientBalance() public {
        // Bob has 0; attempting to burn should revert
        vm.prank(bob);
        vm.expectRevert(ERC20Token.InsufficientBalance.selector);
        token.burn(ONE);
    }

    function test_BurnFrom_OwnerOnly() public {
        // Owner burns 3 tokens from Alice
        uint256 beforeSupply = token.totalSupply();
        token.burnFrom(alice, 3 * ONE);

        assertEq(token.balanceOf(alice), HUNDRED - 3 * ONE, "alice decreased by 3");
        assertEq(token.totalSupply(), beforeSupply - 3 * ONE, "supply decreased by 3");
    }

    function test_Revert_BurnFrom_When_NotOwner() public {
        // Non-owner trying to burn from Alice → should revert due to onlyOwner
        vm.prank(alice);
        vm.expectRevert(Ownable.NotOwner.selector);
        token.burnFrom(alice, ONE);
    }

    /* ===================== TOTAL SUPPLY INVARIANT ===================== */

    function test_TotalSupplyConsistency() public {
        // Sum of all balances should equal totalSupply after a series of ops

        // Start with: Alice = 100
        assertEq(token.totalSupply(), token.balanceOf(alice), "initial: supply == alice");

        // Mint to Bob 10
        token.mint(bob, 10 * ONE);

        // Burn from Alice 5
        token.burnFrom(alice, 5 * ONE);

        // Alice -> Eve 1
        vm.prank(alice);
        token.transfer(eve, ONE);

        // Compute sum of balances
        uint256 sum = token.balanceOf(alice) + token.balanceOf(bob) + token.balanceOf(eve);
        assertEq(sum, token.totalSupply(), "sum of balances should match totalSupply");
    }
}