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
