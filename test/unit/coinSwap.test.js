const { assert, expect } = require("chai");
const { providers } = require("ethers");
const { getNamedAccounts, deployments, ethers, network } = require("hardhat");
const {
  TASK_COMPILE_SOLIDITY_COMPILE,
} = require("hardhat/builtin-tasks/task-names");

const { developmentChains } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Swap for custom Coin testing", function () {
      let swapContract, erc20Contract, deployer, exchanger, ethValue;

      beforeEach(async function () {
        [deployer, exchanger] = await ethers.getSigners();
        ethValue = 1500;
        await deployments.fixture(["all"]);
        swapContract = await ethers.getContractFactory("CoinSwap", deployer);
        swapContract = await swapContract.deploy();
        erc20Contract = await ethers.getContractFactory("ERC20");
      });

      describe("constructor", function () {
        it("Creates two new coins initially", async () => {
          const initialTokens = ["1Coin", "FunCoin"];
          initialTokens.forEach(async (tokenName) => {
            let createdToken = await swapContract.nameToTokens(tokenName);
            assert(createdToken.isActive === true);
          });
        });
      });

      describe("addCoin", function () {
        it("creates new coin once added", async () => {
          const coinName = "Bao";
          const symbol = "bbb";
          const tx = await swapContract.addCoin(coinName, symbol);
          tx.wait();
          const nameToTokens = await swapContract.nameToTokens(coinName);
          expect(tx).to.emit("NewCoin__Added");
          assert(nameToTokens.isActive === true);
        });

        it("raises an error when name is already there", async () => {
          const tokenName = "1Coin";
          await expect(swapContract.addCoin(tokenName, tokenName)).revertedWith(
            "The value is not present"
          );
        });
      });

      describe("deactivateCoin", function () {
        it("deactivate existing coin", async () => {
          const tx = await swapContract.deactivateCoin("1Coin");
          await tx.wait();
          expect(tx).to.emit("CoinSwap__Deactivate");
          const nameToTokens = await swapContract.nameToTokens("1Coin");
          assert(nameToTokens.isActive === false);
        });
      });

      describe("swapEthToCoin", function () {
        it("outputs correct value when swapping", async () => {
          const inputValue = 0.05;
          const outputValue = await swapContract.getEthToToken(
            ethers.utils.parseEther(inputValue.toString())
          );
          const expectedOutputValue = inputValue * ethValue * 10 ** 18;
          expect(outputValue.toString()).to.equal(
            expectedOutputValue.toString()
          );
        });

        it("can exchange an accounts eth to Coin", async () => {
          const inputValue = 0.05;
          const exchangerConnectedSwapContract = await swapContract.connect(
            exchanger
          );
          const tx = await exchangerConnectedSwapContract.swapEthToToken(
            "1Coin",
            {
              value: ethers.utils.parseEther(inputValue.toString()),
            }
          );
          await tx.wait();
          //transaction should emit event
          expect(tx).to.emit("CoinSwap__SwapEthToToken");

          const expectedOutputValue = inputValue * ethValue * 10 ** 18;
          const exchangerTokenBalance =
            await exchangerConnectedSwapContract.getTokenBalance(
              "1Coin",
              exchanger.address
            );
          //we should expect the output should be the same as the return value
          expect(exchangerTokenBalance.toString()).to.equal(
            expectedOutputValue.toString()
          );
        });

        it("throw error if there aren't enough tokens in DEX", async () => {
          const exchangerConnectedSwapContract = await swapContract.connect(
            exchanger
          );
          await expect(
            exchangerConnectedSwapContract.swapEthToToken("1Coin", {
              value: ethers.utils.parseEther("1000"),
            })
          ).to.revertedWith("There isn't enough coin in the DEX");
        });
      });

      describe("swapTokenToEth", async () => {
        it("can swap a token from another user with eth", async () => {
          //First Exchanging eth for token
          const inputValue = 0.05;
          const exchangerConnectedSwapContract = await swapContract.connect(
            exchanger
          );
          const tx = await exchangerConnectedSwapContract.swapEthToToken(
            "1Coin",
            {
              value: ethers.utils.parseEther(inputValue.toString()),
            }
          );
          await tx.wait();

          //Exchanging back to eth
          const exchangerTokenBalance =
            await exchangerConnectedSwapContract.getTokenBalance(
              "1Coin",
              exchanger.address
            );

          const exchangeToEth =
            await exchangerConnectedSwapContract.swapTokenToEth(
              "1Coin",
              exchangerTokenBalance
            );

          const finalEthValue = ethers.utils.formatEther(exchangeToEth.value);

          expect(finalEthValue).to.emit("CoinSwap__SwapTokenToEth");
          expect(finalEthValue).to.equal(inputValue);
        });
      });
    });
