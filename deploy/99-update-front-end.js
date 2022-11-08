const { ethers, network } = require("hardhat");
const fs = require("fs");

const frontEndContractFilePath = "";

async function updateContractAddress() {
  const coinSwap = await ethers.getContractFactory("CoinSwap");
  const chainId = network.config.chainId.toString();
  const contractAddresses = JSON.parse(
    fs.readFileSync(frontEndContractFilePath, "utf-8")
  );

  if (chainId in contractAddresses) {
    if (!contractAddresses[chainId]["CoinSwap"].includes(coinSwap.address)) {
      contractAddresses[chainId]["CoinSwap"].push(coinSwap.address);
    }
  } else {
    contractAddresses[chainId] = { CoinSwap: [coinSwap.address] };
  }
  fs.writeFileSync(frontEndContractFilePath, JSON.stringify(contractAddresses));
}

module.exports = async function () {
  if (process.env.UPDATE_FRONT_END) {
    console.log("updating front end...");
    await updateContractAddress();
  }
};

module.exports.tags = ["all", "frontend"];
