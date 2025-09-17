// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * Simple demo of Prover and Verifier roles
 * NOTE: This is only an educational illustration,
 * not a true zero-knowledge proof implementation.
 */

/*How it works:

Verifier (contract deployer): Sets up the system and defines the hidden value (stored as a hash).

Prover: Tries to prove they know the secret by submitting a candidate string.

Verification: Contract checks if the guess’s hash matches the stored hash. If yes → proof accepted.

This is a very primitive ZK-like demo: the verifier never learns the raw secret (only checks hash equality).*/
contract SimpleZKDemo {
    address public verifier;
    address public prover;

    // A secret value (hash stored, not the raw secret)
    bytes32 private secretHash;

    constructor(address _prover) {
        verifier = msg.sender; // deployer is verifier
        prover = _prover;      // prover is set at deployment
        // Example: the secret is "42"
        secretHash = keccak256(abi.encodePacked("42"));
    }

    // Prover submits a proof (the preimage of the hash)
    function submitProof(string memory guess) external view returns (bool) {
        require(msg.sender == prover, "Only prover can submit proof");
        // Check if prover's guess matches the secret (without revealing secret publicly)
        return keccak256(abi.encodePacked(guess)) == secretHash;
    }
}
