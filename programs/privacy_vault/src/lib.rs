use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;
pub mod error;

use instructions::*;

declare_id!("9RCJQa7HXgVv6L2RTSvAWw9hhh4DZRqRChHxpkdGQ553");

#[program]
pub mod privacy_vault {
    use super::*;

    pub fn initialize_vault_config(
        ctx: Context<InitializeVaultConfig>,
        authority: Pubkey,
        reward_mint: Pubkey,
        reward_token_vault: Pubkey,
        reward_rate_per_second: u64,
    ) -> Result<()> {
        instructions::initialize_vault_config(
            ctx,
            authority,
            reward_mint,
            reward_token_vault,
            reward_rate_per_second,
        )
    }

    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        instructions::initialize_vault(ctx)
    }

    pub fn update_vault_config(
        ctx: Context<UpdateVaultConfig>,
        reward_mint: Option<Pubkey>,
        reward_token_vault: Option<Pubkey>,
        reward_rate_per_second: Option<u64>,
    ) -> Result<()> {
        instructions::update_vault_config(
            ctx,
            reward_mint,
            reward_token_vault,
            reward_rate_per_second,
        )
    }

    pub fn deposit(
        ctx: Context<Deposit>,
        commitment: [u8; 32],
        nullifier_hash: [u8; 32],
        encrypted_note_data: Vec<u8>,
        signature: [u8; 64],
        amount: u64,
    ) -> Result<()> {
        instructions::deposit(ctx, commitment, nullifier_hash, encrypted_note_data, signature, amount)
    }

    pub fn withdraw(
        ctx: Context<Withdraw>,
        commitment: [u8; 32],
        nullifier_hash: [u8; 32],
        destination_wallet: Pubkey,
        relayer: Pubkey,
    ) -> Result<()> {
        instructions::withdraw(
            ctx,
            commitment,
            nullifier_hash,
            destination_wallet,
            relayer,
        )
    }
}
