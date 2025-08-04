# Privacy Vault Frontend

A React frontend for interacting with the Privacy-Preserving Vault smart contract on Solana.

## Features

- Wallet connection (Phantom, Solflare)
- Deposit SOL with encrypted withdrawal instructions
- Generate unlinkable withdrawal strings
- Process withdrawals to fresh wallets
- Mock FHE encryption/decryption (to be replaced with real FHE library)

## Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Update the program ID in `src/components/PrivacyVault.tsx` with your deployed contract address.

3. Start the development server:
```bash
npm start
```

## Usage

1. Connect your Solana wallet
2. Enter deposit amount and optional destination wallet
3. Click "Create Deposit" to generate a withdrawal string
4. Save the withdrawal string securely
5. Use the withdrawal string later to withdraw funds to any wallet

## Next Steps

- Replace mock FHE functions with real FHE library (TFHE-rs, Concrete, etc.)
- Add proper transaction signing and submission to the smart contract
- Implement relayer network integration
- Add error handling and loading states
- Create proper key management system

## Security Notes

- This is a demo implementation with mock FHE
- Do not use with real funds until FHE integration is complete
- Always verify transactions before signing
