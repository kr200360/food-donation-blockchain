# Food Donation Blockchain

A React + Solidity decentralized application (dApp) for recording surplus-food donations on a local Ethereum-compatible blockchain. Donors publish food, students claim available donations, and pickup completion is recorded by the smart contract.

> **Development setup:** This repository is configured for a local Hardhat chain (chain ID `31337`). It is not a production deployment. Use only disposable Hardhat test accounts and test ETH.

## Features

- Create donations with food details, positive whole-number quantity, pickup details, and a future expiry time.
- Claim available donations, with contract checks preventing self-claims and duplicate claims.
- Let the claimer confirm pickup.
- Calculate expired status from the blockchain timestamp when reading donation data.
- Allow the deployer/admin wallet to close and restore eligible donations.
- View dashboard statistics and connect through MetaMask.
- Run automated smart-contract tests for expiry and authorization rules.

## Tech stack

- Solidity `0.8.26`
- Hardhat 2 with `@nomiclabs/hardhat-ethers` and Ethers v5 in the repository root
- React and Ethers v6 in `frontend/`
- MetaMask for wallet connection and transaction signing

The root and frontend intentionally use separate dependency installations. Do not copy the frontend's Ethers v6 APIs into the root Hardhat scripts, which currently use Ethers v5.

## Repository layout

```text
contracts/FoodDonation.sol       Donation lifecycle and on-chain authorization
scripts/deploy.js                Deploys the contract and writes frontend config
test/FoodDonation.test.js        Hardhat smart-contract tests
hardhat.config.js                Solidity compiler and localhost network settings
frontend/src/App.js              React dashboard and form validation
frontend/src/contract.js         MetaMask connection and Ethers v6 contract client
frontend/src/contractConfig.js   Generated deployed address and local chain settings
```

## Prerequisites

- Node.js and npm
- MetaMask browser extension
- A browser able to access `http://localhost:3000`

## Install dependencies

Run from the repository root:

```bash
npm install
npm --prefix frontend install
```

## Run the application locally

Use three terminals, all from the repository root unless stated otherwise.

### 1. Start the local blockchain

```bash
npm run node
```

Keep this terminal running. Hardhat exposes JSON-RPC at `http://127.0.0.1:8545` and uses chain ID `31337`. The terminal prints funded test accounts and private keys. **Never use these development keys with real funds or on a public network.**

### 2. Deploy the contract

```bash
npm run compile
npm run deploy
```

The deployment command targets the configured `localhost` network. It updates `frontend/src/contractConfig.js` with the newly deployed contract address and deployer/admin address. Redeploy whenever the local Hardhat node is restarted, because a fresh node has a new chain state and contract address.

### 3. Configure MetaMask

Add or select this custom network:

| Setting | Value |
|---|---|
| Network name | Hardhat Local |
| RPC URL | `http://127.0.0.1:8545` |
| Chain ID | `31337` |
| Currency symbol | `ETH` |

Import a disposable private key printed by the local Hardhat node. The deployer account is the contract admin; use that account for admin actions. Use another local account to test donor/student flows.

### 4. Start the React frontend

```bash
cd frontend
npm start
```

Open [http://localhost:3000](http://localhost:3000). Make sure the Hardhat node remains running and MetaMask is connected to the local network.

## Smart-contract lifecycle

1. A donor creates a donation. The contract checks that the food details are non-empty, quantity is greater than zero, and expiry is in the future.
2. The donation begins in `Available` status.
3. A different wallet can claim it while it remains available and unexpired.
4. Only the recorded claimer can confirm pickup, changing status to `Completed`.
5. An available donation whose expiry timestamp has passed is reported as `Expired` by read methods. Expiry is timestamp-based; it does not require a background job.
6. The contract deployer is the immutable admin and can close eligible donations or restore closed donations with a future expiry.

The dashboard's donor/student/admin mode is a user-interface convenience, not a security boundary. Contract modifiers and caller checks are the authoritative on-chain authorization rules.

## Commands

From the repository root:

| Command | Purpose |
|---|---|
| `npm run node` | Start local Hardhat JSON-RPC node |
| `npm run compile` | Compile Solidity contracts |
| `npm test` | Run smart-contract tests |
| `npm run deploy` | Deploy to the configured localhost node and refresh frontend config |

From `frontend/`:

| Command | Purpose |
|---|---|
| `npm start` | Start React development server |
| `npm test -- --watchAll=false` | Run React tests once |
| `npm run build` | Create production build |

## Tests

Run the checks before opening or merging a change:

```bash
npm run compile
npm test
npm --prefix frontend test -- --watchAll=false
npm --prefix frontend run build
```

Smart-contract tests cover expiry reporting, rejection of claims after expiry, prevention of self-claims, zero-quantity rejection, and admin-only moderation. A successful file edit does not mean tests have passed; run these commands in an environment with dependencies installed.

## Troubleshooting

### MetaMask says the network is wrong

Select the Hardhat Local network (chain ID `31337`). Confirm the local node is running at `http://127.0.0.1:8545`.

### MetaMask cannot find the network

Add the custom network manually using the settings listed above. Refresh the frontend after switching networks.

### The contract address is stale or calls fail after restarting Hardhat

A restarted Hardhat node has a fresh local blockchain. Run `npm run deploy` again, then refresh the browser. The deploy script regenerates `frontend/src/contractConfig.js`.

### Wallet has no test ETH

Use a funded account printed by the local Hardhat node. Do not send real assets to this local development network.

### Admin actions revert or are unavailable

Switch the dashboard to Admin mode and connect the same wallet address printed as the deployer/admin in `frontend/src/contractConfig.js`. The contract independently checks the admin address, so changing the UI mode alone does not grant permissions.

### Donation creation is rejected

Enter a non-empty food description, a positive whole-number quantity, and an expiry time in the future. The contract repeats critical validation on-chain.

### Transaction was rejected

Confirm the MetaMask prompt, active account, and selected local network. A user-rejected transaction is not submitted.

## Security notes and limitations

- This project is a local demonstration, not an audited production application.
- Never commit private keys, seed phrases, or real credentials.
- Wallet addresses and donation data stored on a public blockchain are visible to network participants; do not put sensitive personal data in on-chain fields.
- Frontend validation improves usability, but smart-contract validation is authoritative.
- The current contract loops through all donations when calculating dashboard statistics. This can become expensive as data grows; use indexed events or off-chain indexing/pagination for a larger deployment.
- Before production use, perform a security review, add deployment/network-specific configuration, and test against the intended chain.

## License

The root package currently declares the ISC license. The Solidity contract also includes the SPDX identifier `MIT`; confirm the intended project-wide license before distributing the project.
