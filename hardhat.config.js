require("@nomiclabs/hardhat-ethers");

module.exports = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    // Required by "npm run deploy", which targets --network localhost.
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
  },
};
