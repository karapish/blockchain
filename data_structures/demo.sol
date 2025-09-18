// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DataStructuresDemo {

    // 1. Enums: Define a set of named constants
    enum Status { Pending, Shipped, Delivered }
    Status public currentStatus;

    function setStatus(Status _status) public {
        currentStatus = _status;
    }

    // 2. Structs: Custom data types grouping fields
    struct Product {
        uint id;
        string name;
        uint price;
        Status status;
    }

    mapping(uint => Product) public products;

    function addProduct(uint _id, string memory _name, uint _price) public {
        products[_id] = Product(_id, _name, _price, Status.Pending);
    }

    // 3. Arrays
    uint[] public numbers;

    function addNumber(uint _num) public {
        numbers.push(_num);
    }

    // 4. Mappings (hash tables)
    mapping(address => uint) public balances;

    function setBalance(uint _amount) public {
        balances[msg.sender] = _amount;
    }

    // 5. Bytes (fixed or dynamic)
    bytes32 public fixedData = keccak256("hello"); // fixed 32-byte
    bytes public dynamicData;

    function setDynamic(bytes memory _data) public {
        dynamicData = _data;
    }
}