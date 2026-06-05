# Food Donation Tracking System using Blockchain

This project is a decentralized food donation platform for hostels and cafeterias. It records donation creation, claiming, and pickup confirmation on Ethereum through a Solidity smart contract and a React dashboard connected with MetaMask.

## System Design

### Objective

Reduce untracked surplus food distribution by storing every workflow step on-chain so donation records are transparent, tamper-resistant, and auditable.

### Roles

- Donor: creates food donation entries with quantity and optional pickup details.
- Student / Beneficiary: views available donations, claims food, and confirms pickup.
- Admin: monitors overall analytics and platform activity through the dashboard.

### On-Chain Data

- Donation ID
- Donor wallet
- Food details
- Quantity
- Pickup time
- Pickup location
- Created timestamp
- Expiry timestamp
- Status: `0 = Available`, `1 = Claimed`, `2 = Completed`, `3 = Expired`
- Claimer wallet
- Claimed timestamp
- Completed timestamp

### Workflow

1. Donor creates a donation.
2. Smart contract stores the donation and marks it `Available`.
3. Student claims the donation.
4. Smart contract prevents double claiming and marks it `Claimed`.
5. Student confirms pickup.
6. Smart contract marks it `Completed`.
7. If the donation is still unclaimed after its expiry time, it auto-resolves to `Expired`.

## Code Architecture

### Blockchain Layer

- `contracts/FoodDonation.sol`
  Smart contract for donation lifecycle, analytics counters, and role-aware validation.

### Deployment Layer

- `scripts/deploy.js`
  Deploys the contract and writes the live contract address/admin into `frontend/src/contractConfig.js`.

### Frontend Layer

- `frontend/src/App.js`
  Dashboard UI with donor, student, and admin views, search, filtering, refresh, and on-chain actions.
- `frontend/src/contract.js`
  Ethers.js integration, MetaMask connection helpers, network switching, and donation mapping.
- `frontend/src/contractConfig.js`
  Generated deployment config used by the frontend.
- `frontend/src/App.css`
  Modern responsive dashboard styling.

## Features

- MetaMask wallet connection
- Hardhat local network verification
- Donation creation with optional pickup time and location
- Expiry time input with automatic donation auto-close
- Donation claiming and pickup confirmation
- Notification center for newly available food
- Search by food name
- Status filtering
- Refresh button for blockchain data reload
- Dynamic action buttons by status and wallet
- Dashboard statistics for total, available, claimed, and completed donations
- Admin analytics panel
- Separate admin-only moderation tools for closing and restoring donations

## Run the Project

### 1. Start Hardhat node

```powershell
cd "C:\Users\Kanniyappa Ranjith M\food-donation-blockchain"
npx.cmd hardhat node
```

### 2. Add Hardhat network in MetaMask

- Network name: `Hardhat Local`
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Currency symbol: `ETH`

Import one of the test accounts shown by `hardhat node` into MetaMask.

### 3. Deploy smart contract

```powershell
cd "C:\Users\Kanniyappa Ranjith M\food-donation-blockchain"
npx.cmd hardhat run scripts/deploy.js --network localhost
```

This updates `frontend/src/contractConfig.js` automatically.

### 4. Start frontend

```powershell
cd "C:\Users\Kanniyappa Ranjith M\food-donation-blockchain\frontend"
npm.cmd start
```

Open `http://localhost:3000`.

## Viva Explanation

### How blockchain ensures immutability

Every donation action is submitted as a blockchain transaction. Once mined into a block, the record becomes part of the shared ledger and cannot be silently altered without changing the chain history.

### How smart contracts enforce logic

The Solidity contract checks rules such as required food details, positive quantity, future expiry time, prevention of donor self-claiming, prevention of double claiming, and valid transition from `Claimed` to `Completed`. Available donations are auto-resolved to `Expired` once the deadline passes.

### How the frontend interacts using Ethers.js

The React dashboard uses `ethers` to:

- connect to MetaMask
- create a signer
- instantiate the contract with ABI + deployed address
- read dashboard data from view functions
- send signed transactions for create, claim, and confirm actions
- detect newly available donations during refresh and raise in-app/browser notifications

### How MetaMask enables secure transactions

MetaMask keeps private keys in the wallet. The app only requests account access and transaction approval, so signing happens securely in MetaMask instead of exposing private keys inside the frontend.

## Optional Improvements

- IPFS image uploads for food photos
- QR-based pickup verification
- Expiry time / auto-close for donations
- Maps integration for pickup location
- Event history timeline using emitted smart contract events
