//
// 🧑‍💻 Mock Blockchain Developer Coding Assignment
//

// ## ❓ Q1: Implement a basic ERC-20 token with minting, burning, and access control.
/*
ERC-20 is the fungible token standard. Would want to see:
- Proper standard compliance (`totalSupply`, `balanceOf`, `transfer`, `approve`, `transferFrom`).
- Minting restricted to an owner/admin.
- Burning available to token holders.
- Events emitted for transparency.
*/

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

// Compatible with OpenZeppelin Contracts ^5.4.0

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyToken is ERC20, Ownable {
    constructor()
        ERC20("My Token", "MYT")
        Ownable(msg.sender) {
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}

/*
❓ Q2: Build a DocumentNotary contract that stores a file hash with timestamp and allows verification.
✅ Response

A notary service requires:

    notarize(hash) → saves hash + timestamp.

    verify(hash) → returns timestamp and revocation status.

    Only admin can revoke.

    Events emitted for notarization and revocation.
*/

// 💻 Solidity Code (Document Notary)
contract DocumentNotary {
    address public owner;
    
    // ✅ UPGRADEABLE: Use initialize() to set owner
    function initialize(address _owner) external {
        require(owner == address(0), "Already initialized");
        owner = _owner;
    }

    // Structure to store details about each notarized document
    struct Record {
        uint256 timestamp;  // The time at which the document was notarized (block timestamp)
        bool revoked;       // Flag indicating if the document has been revoked
    }

    // Mapping from document hash to its associated record
    // Stores information about notarization and revocation state for each document hash
    mapping(string => Record) private records;
    string[] private recordsHashes; // <-- keep an array of keys

    // Event emitted whenever a document is successfully notarized
    // The document hash and the timestamp of notarization are indexed and stored in logs
    event Notarized(string indexed docHash, uint256 timestamp);

    // Event emitted whenever a document is revoked by the owner
    // The document hash and revocation timestamp are logged for transparency
    event Revoked(string indexed docHash, uint256 timestamp);

    // Function to notarize a document by its hash
    // Anyone can call this function
    // Throws an error if the document hash has already been notarized
    function notarize(string calldata docHash) external {
        // Check if the document has not been previously notarized (timestamp == 0 means no record)
        require(records[docHash].timestamp == 0, "Already notarized");

        // Create a new record with current block timestamp and mark as not revoked
        records[docHash] = Record(block.timestamp, false);
        recordsHashes.push(docHash);

        // Emit a Notarized event indicating successful notarization
        emit Notarized(docHash, block.timestamp);
    }

    // View function to verify notarization status of a document hash
    // Returns the timestamp of notarization and whether it has been revoked
    function verify(string calldata docHash) external view returns (uint256, bool) {
        // Load record from storage into memory
        Record memory rec = records[docHash];

        // Return timestamp and revocation status
        return (rec.timestamp, rec.revoked);
    }

    // Function to revoke a previously notarized document
    // Only the contract owner (deployer or assigned) can call this
    function revoke(string calldata docHash) external onlyOwner {
        // Check if the document hash was notarized before revocation can occur
        require(records[docHash].timestamp != 0, "Not found");

        // Check if the document has not been revoked already
        require(!records[docHash].revoked, "Already revoked");

        // Mark the document as revoked in the records mapping
        records[docHash].revoked = true;

        // Emit a Revoked event to log the revocation on the blockchain
        emit Revoked(docHash, block.timestamp);
    }

    function getCount() external view returns (uint256) {
        return recordsHashes.length;
    }
}

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract DocumentNotaryUpgradeable is Initializable, OwnableUpgradeable {
    struct Record {
        uint256 timestamp;
        bool revoked;
    }

    mapping(string => Record) private records;
    string[] private recordsHashes;

    event Notarized(string indexed docHash, uint256 timestamp);
    event Revoked(string indexed docHash, uint256 timestamp);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        // Prevents implementation contract from being initialized
        _disableInitializers();
    }

    // Instead of constructor
    function initialize(address owner) public initializer {
        __Ownable_init(owner);
    }

    function notarize(string calldata docHash) external {
        require(records[docHash].timestamp == 0, "Already notarized");

        records[docHash] = Record(block.timestamp, false);
        recordsHashes.push(docHash);

        emit Notarized(docHash, block.timestamp);
    }

    function verify(string calldata docHash) external view returns (uint256, bool) {
        Record memory rec = records[docHash];
        return (rec.timestamp, rec.revoked);
    }

    function revoke(string calldata docHash) external onlyOwner {
        require(records[docHash].timestamp != 0, "Not found");
        require(!records[docHash].revoked, "Already revoked");

        records[docHash].revoked = true;
        emit Revoked(docHash, block.timestamp);
    }

    function getCount() external view returns (uint256) {
        return recordsHashes.length;
    }
}

import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20FlashMint} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20FlashMint.sol";
import {ERC20Pausable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";
import {ERC1363} from "@openzeppelin/contracts/token/ERC20/extensions/ERC1363.sol";

contract MyToken2 is ERC20, ERC20Burnable, ERC20Pausable, Ownable, ERC1363, ERC20Permit, ERC20Votes, ERC20FlashMint {
    constructor()
        ERC20("MyToken", "MTK")
        Ownable(_msgSender())
        ERC20Permit("MyToken")
    {
        _mint(_msgSender(), 100 * 10 ** decimals());
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    // The following functions are overrides required by Solidity.

    function _update(address from, address to, uint256 value) internal
    override(ERC20, ERC20Pausable, ERC20Votes)
    {
        super._update(from, to, value);
    }

    function nonces(address owner) public view
    override(ERC20Permit, Nonces)
    returns (uint256)
    {
        return super.nonces(owner);
    }
}

