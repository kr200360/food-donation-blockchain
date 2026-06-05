import { ethers } from "ethers";
import { contractConfig } from "./contractConfig";

const abi = [
  "function admin() view returns (address)",
  "function createDonation(string foodDetails, uint256 quantity, uint256 expiresAt)",
  "function createDonationDetailed(string foodDetails, uint256 quantity, string pickupTime, string pickupLocation, uint256 expiresAt)",
  "function adminCloseDonation(uint256 donationId)",
  "function adminRestoreDonation(uint256 donationId, uint256 newExpiresAt)",
  "function claimDonation(uint256 donationId)",
  "function closeExpiredDonation(uint256 donationId)",
  "function confirmPickup(uint256 donationId)",
  "function donationCount() view returns (uint256)",
  "function getDonation(uint256 donationId) view returns (uint256 id, address donor, string foodDetails, uint256 quantity, string pickupTime, string pickupLocation, uint256 createdAt, uint256 expiresAt, uint8 status, address claimer, uint256 claimedAt, uint256 completedAt)",
  "function getDashboardStats() view returns (uint256 total, uint256 available, uint256 claimed, uint256 completed, uint256 expired)",
  "function isAdmin(address account) view returns (bool)"
];

const emptyAddress = "0x0000000000000000000000000000000000000000";

const getEthereum = () => {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed. Please install it and refresh the page.");
  }

  return window.ethereum;
};

export const getCurrentChainId = async () => {
  const ethereum = getEthereum();
  return ethereum.request({ method: "eth_chainId" });
};

export const ensureHardhatNetwork = async () => {
  const ethereum = getEthereum();
  const chainId = await getCurrentChainId();

  if (chainId === contractConfig.chainIdHex) {
    return chainId;
  }

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: contractConfig.chainIdHex }]
    });
    return contractConfig.chainIdHex;
  } catch (error) {
    if (error.code === 4902) {
      throw new Error(
        "Hardhat local network is missing in MetaMask. Add a network with Chain ID 31337 and RPC URL http://127.0.0.1:8545."
      );
    }

    throw new Error("Please switch MetaMask to the Hardhat local network (Chain ID 31337).");
  }
};

export const connectWallet = async () => {
  const ethereum = getEthereum();
  await ensureHardhatNetwork();
  const accounts = await ethereum.request({ method: "eth_requestAccounts" });
  return accounts[0] || "";
};

export const getConnectedAccount = async () => {
  const ethereum = getEthereum();
  const accounts = await ethereum.request({ method: "eth_accounts" });
  return accounts[0] || "";
};

export const getContract = async () => {
  const ethereum = getEthereum();
  await ensureHardhatNetwork();

  const provider = new ethers.BrowserProvider(ethereum);
  const signer = await provider.getSigner();

  return new ethers.Contract(contractConfig.address, abi, signer);
};

export const mapDonation = (donation) => ({
  id: Number(donation.id ?? donation[0]),
  donor: donation.donor ?? donation[1],
  foodDetails: donation.foodDetails ?? donation[2],
  quantity: Number(donation.quantity ?? donation[3]),
  pickupTime: donation.pickupTime ?? donation[4],
  pickupLocation: donation.pickupLocation ?? donation[5],
  createdAt: Number(donation.createdAt ?? donation[6]),
  expiresAt: Number(donation.expiresAt ?? donation[7]),
  status: Number(donation.status ?? donation[8]),
  claimer: donation.claimer ?? donation[9],
  claimedAt: Number(donation.claimedAt ?? donation[10]),
  completedAt: Number(donation.completedAt ?? donation[11])
});

export { abi, emptyAddress, contractConfig };
