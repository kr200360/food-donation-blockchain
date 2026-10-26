const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

async function main() {
  const Factory = await ethers.getContractFactory("FoodDonation");
  const contract = await Factory.deploy();

  // Ethers v5 ContractFactory deployment returns a contract with deployed()
  // and deployTransaction. Keep this script aligned with the root package,
  // which uses @nomiclabs/hardhat-ethers and ethers v5.
  await contract.deployed();

  const configPath = path.join(__dirname, "..", "frontend", "src", "contractConfig.js");
  const configContents = `export const contractConfig = {
  address: "${contract.address}",
  admin: "${contract.deployTransaction.from}",
  chainIdHex: "0x7a69",
  chainIdDecimal: 31337
};
`;

  fs.writeFileSync(configPath, configContents, "utf8");

  console.log("Contract deployed to:", contract.address);
  console.log("Admin wallet:", contract.deployTransaction.from);
  console.log("Frontend config updated:", configPath);
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
