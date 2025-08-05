import { Program, AnchorProvider, web3, Idl } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';

export const PRIVACY_VAULT_IDL: Idl = {
  "version": "0.1.0",
  "name": "privacy_vault",
  "instructions": [
    {
      "name": "initializeVaultConfig",
      "accounts": [
        { "name": "vaultConfig", "isMut": true, "isSigner": false },
        { "name": "payer", "isMut": true, "isSigner": true },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "authority", "type": "publicKey" },
        { "name": "rewardMint", "type": "publicKey" },
        { "name": "rewardTokenVault", "type": "publicKey" },
        { "name": "rewardRatePerSecond", "type": "u64" }
      ]
    },
    {
      "name": "initializeVault",
      "accounts": [
        { "name": "vault", "isMut": true, "isSigner": false },
        { "name": "payer", "isMut": true, "isSigner": true },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": []
    },
    {
      "name": "deposit",
      "accounts": [
        { "name": "depositMetadata", "isMut": true, "isSigner": false },
        { "name": "encryptedNote", "isMut": true, "isSigner": false },
        { "name": "vault", "isMut": true, "isSigner": false },
        { "name": "depositor", "isMut": true, "isSigner": true },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "depositId", "type": { "array": ["u8", 32] } },
        { "name": "noteNonce", "type": { "array": ["u8", 32] } },
        { "name": "encryptedNoteData", "type": { "vec": "u8" } },
        { "name": "signature", "type": { "array": ["u8", 64] } },
        { "name": "amount", "type": "u64" }
      ]
    },
    {
      "name": "withdraw",
      "accounts": [
        { "name": "depositMetadata", "isMut": true, "isSigner": false },
        { "name": "encryptedNote", "isMut": false, "isSigner": false },
        { "name": "vaultConfig", "isMut": false, "isSigner": false },
        { "name": "vault", "isMut": true, "isSigner": false },
        { "name": "destinationWallet", "isMut": true, "isSigner": false },
        { "name": "destinationTokenAccount", "isMut": true, "isSigner": false },
        { "name": "relayer", "isMut": true, "isSigner": false },
        { "name": "vaultTokenAccount", "isMut": true, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "depositId", "type": { "array": ["u8", 32] } },
        { "name": "noteNonce", "type": { "array": ["u8", 32] } },
        { "name": "destinationWallet", "type": "publicKey" },
        { "name": "destinationTokenAccount", "type": "publicKey" },
        { "name": "relayer", "type": "publicKey" }
      ]
    }
  ],
  "accounts": [
    {
      "name": "DepositMetadata",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "depositId", "type": { "array": ["u8", 32] } },
          { "name": "amount", "type": "u64" },
          { "name": "timestamp", "type": "i64" },
          { "name": "used", "type": "bool" },
          { "name": "noteNonce", "type": { "array": ["u8", 32] } },
          { "name": "bump", "type": "u8" }
        ]
      }
    },
    {
      "name": "EncryptedNote",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "encryptedData", "type": { "vec": "u8" } },
          { "name": "bump", "type": "u8" }
        ]
      }
    },
    {
      "name": "VaultConfig",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "authority", "type": "publicKey" },
          { "name": "rewardMint", "type": "publicKey" },
          { "name": "rewardTokenVault", "type": "publicKey" },
          { "name": "rewardRatePerSecond", "type": "u64" },
          { "name": "bump", "type": "u8" }
        ]
      }
    }
  ]
};

export function getProgram(connection: Connection, wallet: any, programId: PublicKey) {
  const provider = new AnchorProvider(connection, wallet, {});
  return new Program(PRIVACY_VAULT_IDL, programId, provider);
}

export function getVaultPDA(programId: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault")],
    programId
  );
}

export function getVaultConfigPDA(programId: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault_config")],
    programId
  );
}

export function getDepositMetadataPDA(depositId: number[], programId: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("deposit"), Buffer.from(depositId)],
    programId
  );
}

export function getEncryptedNotePDA(noteNonce: number[], programId: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("note"), Buffer.from(noteNonce)],
    programId
  );
}
