import { Program, AnchorProvider, web3, Idl } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';

export const PRIVACY_VAULT_IDL: Idl = {
  "accounts": [
    {
      "discriminator": [
        227,
        5,
        25,
        198,
        217,
        128,
        160,
        130
      ],
      "name": "DepositMetadata"
    },
    {
      "discriminator": [
        85,
        199,
        220,
        160,
        205,
        190,
        232,
        56
      ],
      "name": "EncryptedNote"
    },
    {
      "discriminator": [
        99,
        86,
        43,
        216,
        184,
        102,
        119,
        77
      ],
      "name": "VaultConfig"
    }
  ],
  "address": "9RCJQa7HXgVv6L2RTSvAWw9hhh4DZRqRChHxpkdGQ553",
  "errors": [
    {
      "code": 6000,
      "msg": "Invalid signature for deposit ID",
      "name": "InvalidSignature"
    },
    {
      "code": 6001,
      "msg": "Deposit has already been used",
      "name": "DepositAlreadyUsed"
    },
    {
      "code": 6002,
      "msg": "Invalid deposit ID",
      "name": "InvalidDepositId"
    },
    {
      "code": 6003,
      "msg": "Unauthorized access",
      "name": "Unauthorized"
    },
    {
      "code": 6004,
      "msg": "Invalid amount",
      "name": "InvalidAmount"
    },
    {
      "code": 6005,
      "msg": "Arithmetic overflow",
      "name": "ArithmeticOverflow"
    },
    {
      "code": 6006,
      "msg": "Encrypted note data too large",
      "name": "NoteTooLarge"
    }
  ],
  "instructions": [
    {
      "accounts": [
        {
          "name": "deposit_metadata",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  112,
                  111,
                  115,
                  105,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "deposit_id"
              }
            ]
          },
          "writable": true
        },
        {
          "name": "encrypted_note",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  110,
                  111,
                  116,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "note_nonce"
              }
            ]
          },
          "writable": true
        },
        {
          "name": "vault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          },
          "writable": true
        },
        {
          "name": "depositor",
          "signer": true,
          "writable": true
        },
        {
          "address": "11111111111111111111111111111111",
          "name": "system_program"
        }
      ],
      "args": [
        {
          "name": "deposit_id",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "note_nonce",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "encrypted_note_data",
          "type": "bytes"
        },
        {
          "name": "signature",
          "type": {
            "array": [
              "u8",
              64
            ]
          }
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ],
      "discriminator": [
        242,
        35,
        198,
        137,
        82,
        225,
        242,
        182
      ],
      "name": "deposit"
    },
    {
      "accounts": [
        {
          "name": "vault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          },
          "writable": true
        },
        {
          "name": "payer",
          "signer": true,
          "writable": true
        },
        {
          "address": "11111111111111111111111111111111",
          "name": "system_program"
        }
      ],
      "args": [],
      "discriminator": [
        48,
        191,
        163,
        44,
        71,
        129,
        63,
        164
      ],
      "name": "initialize_vault"
    },
    {
      "accounts": [
        {
          "name": "vault_config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          },
          "writable": true
        },
        {
          "name": "payer",
          "signer": true,
          "writable": true
        },
        {
          "address": "11111111111111111111111111111111",
          "name": "system_program"
        }
      ],
      "args": [
        {
          "name": "authority",
          "type": "pubkey"
        },
        {
          "name": "reward_mint",
          "type": "pubkey"
        },
        {
          "name": "reward_token_vault",
          "type": "pubkey"
        },
        {
          "name": "reward_rate_per_second",
          "type": "u64"
        }
      ],
      "discriminator": [
        199,
        95,
        61,
        130,
        239,
        178,
        88,
        193
      ],
      "name": "initialize_vault_config"
    },
    {
      "accounts": [
        {
          "name": "vault_config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          },
          "writable": true
        },
        {
          "name": "authority",
          "relations": [
            "vault_config"
          ],
          "signer": true
        }
      ],
      "args": [
        {
          "name": "reward_mint",
          "type": {
            "option": "pubkey"
          }
        },
        {
          "name": "reward_token_vault",
          "type": {
            "option": "pubkey"
          }
        },
        {
          "name": "reward_rate_per_second",
          "type": {
            "option": "u64"
          }
        }
      ],
      "discriminator": [
        122,
        3,
        21,
        222,
        158,
        255,
        238,
        157
      ],
      "name": "update_vault_config"
    },
    {
      "accounts": [
        {
          "name": "deposit_metadata",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  112,
                  111,
                  115,
                  105,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "deposit_id"
              }
            ]
          },
          "writable": true
        },
        {
          "name": "encrypted_note",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  110,
                  111,
                  116,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "note_nonce"
              }
            ]
          }
        },
        {
          "name": "vault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          },
          "writable": true
        },
        {
          "name": "destination_wallet",
          "writable": true
        },
        {
          "name": "relayer",
          "writable": true
        },
        {
          "address": "11111111111111111111111111111111",
          "name": "system_program"
        }
      ],
      "args": [
        {
          "name": "deposit_id",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "note_nonce",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "destination_wallet",
          "type": "pubkey"
        },
        {
          "name": "relayer",
          "type": "pubkey"
        }
      ],
      "discriminator": [
        183,
        18,
        70,
        156,
        148,
        109,
        161,
        34
      ],
      "name": "withdraw"
    }
  ],
  "metadata": {
    "description": "Privacy-preserving vault with FHE support and relayer rewards",
    "name": "privacy_vault",
    "spec": "0.1.0",
    "version": "0.1.0"
  },
  "types": [
    {
      "name": "DepositMetadata",
      "type": {
        "fields": [
          {
            "name": "deposit_id",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "used",
            "type": "bool"
          },
          {
            "name": "note_nonce",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ],
        "kind": "struct"
      }
    },
    {
      "name": "EncryptedNote",
      "type": {
        "fields": [
          {
            "name": "encrypted_data",
            "type": "bytes"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ],
        "kind": "struct"
      }
    },
    {
      "name": "VaultConfig",
      "type": {
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "reward_mint",
            "type": "pubkey"
          },
          {
            "name": "reward_token_vault",
            "type": "pubkey"
          },
          {
            "name": "reward_rate_per_second",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ],
        "kind": "struct"
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
