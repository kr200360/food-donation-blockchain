<<<<<<< ours
# Food Donation Blockchain

A local Ethereum dApp for tracking surplus food donations from creation to pickup. Donors post available food, students claim it, and the pickup confirmation is stored on-chain through a Solidity smart contract.

## What This Project Does

- Records each donation on a Hardhat local blockchain.
- Tracks donation status as `Available`, `Claimed`, `Completed`, or `Expired`.
- Prevents donors from claiming their own donations.
- Prevents multiple students from claiming the same donation.
- Lets the original claimer confirm pickup.
- Lets the deployed admin wallet close or restore eligible donations.
- Connects the React dashboard to MetaMask using Ethers.js.

## Tech Stack

- Solidity `0.8.26`
- Hardhat
- React
- Ethers.js
- MetaMask

## Project Structure

```text
contracts/FoodDonation.sol      Smart contract for donation lifecycle rules
scripts/deploy.js               Deploys the contract and updates frontend config
test/FoodDonation.test.js       Hardhat tests for expiry and claim behavior
frontend/src/App.js             React dashboard
frontend/src/contract.js        MetaMask and contract helper functions
frontend/src/contractConfig.js  Generated contract address and chain config
```

## Smart Contract Flow

1. A donor creates a donation with food details, quantity, and expiry time.
2. The contract stores the donation as `Available`.
3. A student claims an available donation.
4. The contract marks it as `Claimed` and stores the claimer wallet.
5. The same student confirms pickup.
6. The contract marks it as `Completed`.
7. If an available donation passes its expiry time, reads report it as `Expired`.

## Prerequisites

- Node.js and npm
- MetaMask browser extension
- A browser that can access `http://localhost:3000`

## Setup

Install root dependencies:

```powershell
npm install
```

Install frontend dependencies:

```powershell
cd frontend
npm install
cd ..
```

## Run Locally

Start the Hardhat blockchain:

```powershell
npm run node
```

Keep that terminal open. In a second terminal, deploy the contract:

```powershell
npm run deploy
```

The deploy script writes the new contract address to:

```text
frontend/src/contractConfig.js
```

Start the React app:

```powershell
cd frontend
npm start
```

Open:

```text
http://localhost:3000
```

## MetaMask Local Network

Add this network in MetaMask:

```text
Network name: Hardhat Local
RPC URL: http://127.0.0.1:8545
Chain ID: 31337
Currency symbol: ETH
```

Import one of the private keys printed by `npm run node` so the wallet has local test ETH.

## Available Scripts

From the project root:

```powershell
npm run node      # start local Hardhat blockchain
npm run compile   # compile Solidity contracts
npm run deploy    # deploy to localhost and update frontend config
npm test          # run Hardhat tests
```

From `frontend/`:

```powershell
npm start         # run React development server
npm run build     # create production build
npm test          # run React tests
```

## Dashboard Modes

- Donor mode: create donations with quantity, expiry, pickup time, and pickup location.
- Student mode: browse available donations, claim food, and confirm pickup.
- Admin mode: view platform stats and use moderation actions with the deployed admin wallet.

Switching modes changes which actions are shown in the dashboard. Wallet permissions are still enforced by the smart contract.

## Testing

Run smart contract tests:

```powershell
npm test
```

Current tests cover:

- Donations becoming expired after their deadline.
- Claims failing after expiry.
- Dashboard stats reporting expired donations correctly.

## Common Issues

**MetaMask is on the wrong network**

Switch MetaMask to `Hardhat Local` with chain ID `31337`.

**Contract address is stale**

Restart the Hardhat node and run:

```powershell
npm run deploy
```

Then refresh the frontend.

**Wallet has no ETH**

Import one of the test accounts printed by the Hardhat node terminal.

**Admin buttons do not appear**

Use the wallet address shown as `admin` in `frontend/src/contractConfig.js` and switch the dashboard to admin mode.
=======
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
>>>>>>> theirs
