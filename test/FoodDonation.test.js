const assert = require("assert");
const { ethers } = require("hardhat");

async function expectRevert(promise, expectedMessage) {
  try {
    await promise;
    assert.fail("Expected transaction to revert");
  } catch (error) {
    assert(
      error.message.includes(expectedMessage),
      `Expected revert message to include "${expectedMessage}", got "${error.message}"`
    );
  }
}

describe("FoodDonation", function () {
  async function deployFixture() {
    const [admin, donor, student] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("FoodDonation");
    const contract = await Factory.deploy();
    await contract.deployed();

    return { contract, admin, donor, student };
  }

  it("stores expiry time and reports expired donations as auto-closed", async function () {
    const { contract, donor } = await deployFixture();
    const latestBlock = await ethers.provider.getBlock("latest");
    const expiresAt = latestBlock.timestamp + 3600;

    await contract.connect(donor).createDonation("Veg rice", 8, expiresAt);

    let donation = await contract.getDonation(1);
    assert.strictEqual(Number(donation.expiresAt), expiresAt);
    assert.strictEqual(Number(donation.status), 0);

    await ethers.provider.send("evm_increaseTime", [3700]);
    await ethers.provider.send("evm_mine", []);

    donation = await contract.getDonation(1);
    assert.strictEqual(Number(donation.status), 3);

    const stats = await contract.getDashboardStats();
    assert.strictEqual(Number(stats.total), 1);
    assert.strictEqual(Number(stats.available), 0);
    assert.strictEqual(Number(stats.claimed), 0);
    assert.strictEqual(Number(stats.completed), 0);
    assert.strictEqual(Number(stats.expired), 1);
  });

  it("prevents claiming donations after expiry", async function () {
    const { contract, donor, student } = await deployFixture();
    const latestBlock = await ethers.provider.getBlock("latest");
    const expiresAt = latestBlock.timestamp + 120;

    await contract
      .connect(donor)
      .createDonationDetailed("Sandwich packs", 5, "7:00 PM", "Hostel gate", expiresAt);

    await ethers.provider.send("evm_increaseTime", [180]);
    await ethers.provider.send("evm_mine", []);

    await expectRevert(
      contract.connect(student).claimDonation(1),
      "Donation is not available"
    );
  });
});
