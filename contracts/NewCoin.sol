// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

//importing contracts
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract NewCoin is ERC20 {
    constructor(string memory coinName, string memory coinSymbol)
        ERC20(coinName, coinSymbol)
    {
        _mint(msg.sender, 100000 * 10**18);
    }
}
