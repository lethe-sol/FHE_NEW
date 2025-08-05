import { Program, AnchorProvider, web3, Idl } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';

export const PRIVACY_VAULT_IDL: Idl = {
  "address": "9RCJQa7HXgVv6L2RTSvAWw9hhh4DZRqRChHxpkdGQ553",
  "metadata": {
    "name": "privacy_vault",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Privacy-preserving vault with FHE support and relayer rewards"
  },
  "instructions": [
    {
      "name": "deposit",
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
      "accounts": [
        {
          "name": "deposit_metadata",
          "writable": true,
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
          }
        },
        {
          "name": "encrypted_note",
          "writable": true,
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
          "writable": true,
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
          }
        },
        {
          "name": "depositor",
          "writable": true,
          "signer": true
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
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
      ]
    },
    {
      "name": "initialize_vault",
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
      "accounts": [
        {
          "name": "vault",
          "writable": true,
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
          }
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initialize_vault_config",
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
      "accounts": [
        {
          "name": "vault_config",
          "writable": true,
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
          }
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
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
      ]
    },
    {
      "name": "update_vault_config",
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
      "accounts": [
        {
          "name": "vault_config",
          "writable": true,
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
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "vault_config"
          ]
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
      ]
    },
    {
      "name": "withdraw",
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
      "accounts": [
        {
          "name": "deposit_metadata",
          "writable": true,
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
          }
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
          "writable": true,
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
          }
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
          "name": "system_program",
          "address": "11111111111111111111111111111111"
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
      ]
    }
  ],
  "accounts": [
    {
      "name": "DepositMetadata",
      "discriminator": [
        227,
        5,
        25,
        198,
        217,
        128,
        160,
        130
      ]
    },
    {
      "name": "EncryptedNote",
      "discriminator": [
        85,
        199,
        220,
        160,
        205,
        190,
        232,
        56
      ]
    },
    {
      "name": "VaultConfig",
      "discriminator": [
        99,
        86,
        43,
        216,
        184,
        102,
        119,
        77
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidSignature",
      "msg": "Invalid signature for deposit ID"
    },
    {
      "code": 6001,
      "name": "DepositAlreadyUsed",
      "msg": "Deposit has already been used"
    },
    {
      "code": 6002,
      "name": "InvalidDepositId",
      "msg": "Invalid deposit ID"
    },
    {
      "code": 6003,
      "name": "Unauthorized",
      "msg": "Unauthorized access"
    },
    {
      "code": 6004,
      "name": "InvalidAmount",
      "msg": "Invalid amount"
    },
    {
      "code": 6005,
      "name": "ArithmeticOverflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6006,
      "name": "NoteTooLarge",
      "msg": "Encrypted note data too large"
    }
  ],
  "types": [
    {
      "name": "DepositMetadata",
      "type": {
        "kind": "struct",
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
        ]
      }
    },
    {
      "name": "EncryptedNote",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "encrypted_data",
            "type": "bytes"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "VaultConfig",
      "type": {
        "kind": "struct",
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
        ]
      }
    }
  ]
};

export function getProgram(connection: Connection, wallet: any, programId: PublicKey) {
  const provider = new AnchorProvider(connection, wallet, {});
  return new Program(PRIVACY_VAULT_IDL, provider);
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

export function getDepositMetadataPDA(depositId: Uint8Array | number[], programId: PublicKey) {
  const depositIdBytes = depositId instanceof Uint8Array ? depositId : new Uint8Array(depositId);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("deposit"), Buffer.from(depositIdBytes)],
    programId
  );
}

export function getEncryptedNotePDA(noteNonce: Uint8Array | number[], programId: PublicKey) {
  const noteNonceBytes = noteNonce instanceof Uint8Array ? noteNonce : new Uint8Array(noteNonce);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("note"), Buffer.from(noteNonceBytes)],
    programId
  );
}
