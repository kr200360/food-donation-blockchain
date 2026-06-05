const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

async function main() {
  const Factory = await ethers.getContractFactory("FoodDonation");
  const contract = await Factory.deploy();

  await contract.deployed();

  const configPath = path.join(__dirname, "..", "frontend", "src", "contractConfig.js");
  const configContents = `export const contractConfig = {
  address: "${contract.address}",
  admin: "${contract.deployTransaction.from}",
  chainIdHex: "0x7a69",
  chainIdDecimal: 31337
};
`;

  fs.writeFileSync(configPath, configContents);

  console.log("Contract deployed to:", contract.address);
  console.log("Frontend config updated:", configPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
