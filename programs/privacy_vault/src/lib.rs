use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;
pub mod error;

use instructions::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

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
        deposit_id: [u8; 32],
        note_nonce: [u8; 32],
        encrypted_note_data: Vec<u8>,
        signature: [u8; 64],
        amount: u64,
    ) -> Result<()> {
        instructions::deposit(ctx, deposit_id, note_nonce, encrypted_note_data, signature, amount)
    }

    pub fn withdraw(
        ctx: Context<Withdraw>,
        deposit_id: [u8; 32],
        note_nonce: [u8; 32],
        destination_wallet: Pubkey,
        destination_token_account: Pubkey,
        relayer: Pubkey,
    ) -> Result<()> {
        instructions::withdraw(
            ctx,
            deposit_id,
            note_nonce,
            destination_wallet,
            destination_token_account,
            relayer,
        )
    }
}
