// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./NewCoin.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract CoinSwap {
    string[] public initialTokens = ["1Coin", "FunCoin"];
    struct tokenInformation {
        ERC20 coin;
        bool isActive;
    }
    mapping(string => tokenInformation) public nameToTokens;

    uint256 private constant ethValue = 1500000000000000000000;

    //emit
    event NewCoin__Added(NewCoin newCoin);
    event CoinSwap__Deactivate(string name);
    event CoinSwap__SwapEthToToken(string name, uint256 value);
    event CoinSwap__SwapTokenToEth(string name, uint256 value);

    //modifiers
    /**
     * @dev coinExistsAndActive checks to make sure there aren't any duplicate names of coins
     * @param name represents the name of the coin
     */
    modifier coinExistsAndActive(string memory name) {
        require(
            nameToTokens[name].isActive == false,
            "The value is not present"
        );
        _;
    }

    constructor() {
        for (uint i = 0; i < initialTokens.length; i++) {
            NewCoin token = new NewCoin(initialTokens[i], initialTokens[i]);

            nameToTokens[initialTokens[i]] = tokenInformation(token, true);
        }
    }

    /**
     * @dev addCoin allows us to both add and create a new Coin to the exchange
     * @param name - describes the name of the coin created
     * @param symbol - describes the symbol of the coin being created
     */
    function addCoin(string memory name, string memory symbol)
        external
        coinExistsAndActive(name)
        returns (string memory)
    {
        //Creates new coin
        NewCoin newlyCreatedCoin = new NewCoin(name, symbol);
        //Adds Coin to mapping of coins
        nameToTokens[name] = tokenInformation(newlyCreatedCoin, true);
        //emitting event for adding coin
        emit NewCoin__Added(newlyCreatedCoin);
        return symbol;
    }

    /**
     * @dev Deactivates coin from exchange so that it is no longer active for swapping
     * @param name - name of coin wanted to deactivate
     */
    function deactivateCoin(string memory name) external {
        nameToTokens[name].isActive = false;
        emit CoinSwap__Deactivate(name);
    }

    function swapTokenToEth(string memory tokenName, uint _amount)
        public
        returns (uint256)
    {
        uint256 ethToBeTransferred = _amount / ethValue;
        require(
            address(this).balance >= ethToBeTransferred,
            "Dex has low balance of eth"
        );
        payable(msg.sender).transfer(ethToBeTransferred);
        _approveCoin(tokenName, _amount);
        require(
            nameToTokens[tokenName].coin.transferFrom(
                msg.sender,
                address(this),
                _amount
            ),
            "ISSUEEEE"
        );
        emit CoinSwap__SwapTokenToEth(tokenName, ethToBeTransferred);
        return ethToBeTransferred;
    }

    function swapEthToToken(string memory tokenName)
        public
        payable
        returns (uint256)
    {
        uint256 outputValue = getEthToToken(msg.value);
        require(
            getTokenBalance(tokenName, address(this)) >= outputValue,
            "There isn't enough coin in the DEX"
        );
        require(nameToTokens[tokenName].coin.transfer(msg.sender, outputValue));
        emit CoinSwap__SwapEthToToken(tokenName, outputValue);
        return outputValue;
    }

    function swapTokenToToken(
        string memory tokenName,
        string memory destTokenName,
        uint _amount
    ) public {
        require(
            nameToTokens[tokenName].coin.transferFrom(
                msg.sender,
                address(this),
                _amount
            )
        );
        require(nameToTokens[destTokenName].coin.transfer(msg.sender, _amount));
    }

    //internal
    function _approveCoin(string memory tokenName, uint256 _amount) internal {
        nameToTokens[tokenName].coin.approve(msg.sender, _amount);
    }

    //pure functions
    function getEthToToken(uint256 inputValue) public pure returns (uint256) {
        return (inputValue * ethValue) / 10**18;
    }

    //view function
    function getCoin(string memory tokenName) public view returns (ERC20) {
        return nameToTokens[tokenName].coin;
    }

    function getTokenBalance(string memory tokenName, address _address)
        public
        view
        returns (uint256)
    {
        return getCoin(tokenName).balanceOf(_address);
    }
}
