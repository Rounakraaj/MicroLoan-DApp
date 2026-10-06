# MicroLend

MicroLend is a peer to peer loan marketplace on Ethereum Sepolia. Borrowers publish loan terms; lenders fund requests; borrowers withdraw and repay through the `MicroLoan` contract.

## Deployed contract

- Network: Sepolia (chain ID `11155111`)
- Address: `0xc31313e6139e6ba8Ff5923b2b2c30f33E037391a`
- Explorer: https://sepolia.etherscan.io/address/0xc31313e6139e6ba8Ff5923b2b2c30f33E037391a

## Run the frontend

The frontend uses MetaMask or another injected EVM wallet and requires Sepolia ETH for transactions.

```powershell
cd frontend
Copy-Item .env.example .env.local
# Set NEXT_PUBLIC_MICROLOAN_ADDRESS in .env.local to the deployed address above.
npm install
npm run dev
```

For a production build, run `npm run build` then `npm run start` from `frontend`. To host the frontend, configure `NEXT_PUBLIC_MICROLOAN_ADDRESS` with the contract address in the hosting provider and deploy the `frontend` directory as a Next.js application.

## Contract development and deployment

Set `SEPOLIA_RPC_URL` and `SEPOLIA_PRIVATE_KEY` in the root `.env` file. Never commit `.env` or expose the private key in frontend variables. The deployer account needs Sepolia ETH for gas.

```powershell
npx hardhat build
npx hardhat ignition deploy --network sepolia ignition/modules/MicroLoan.ts
```

Copy the resulting address to `frontend/.env.local` as `NEXT_PUBLIC_MICROLOAN_ADDRESS`, then rebuild the frontend. Local contract deployment can use Hardhat's simulated network.
