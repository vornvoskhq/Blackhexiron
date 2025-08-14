// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleStorage {
    uint public value;
    function setValue(uint _value) public {
        value = _value;
    }
}
