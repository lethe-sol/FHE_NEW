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
        relayer: Pubkey,
    ) -> Result<()> {
        instructions::withdraw(
            ctx,
            deposit_id,
            note_nonce,
            destination_wallet,
            relayer,
        )
    }

    pub fn initialize_merkle_tree(
        ctx: Context<InitializeMerkleTree>,
        bump: u8,
        index: u64,
        merkle_tree_config: Vec<u8>,
        nullifier_queue_config: Vec<u8>,
    ) -> Result<()> {
        instructions::initialize_merkle_tree(ctx, bump, index, merkle_tree_config, nullifier_queue_config)
    }

    pub fn compressed_deposit(
        ctx: Context<CompressedDeposit>,
        encrypted_note_data: Vec<u8>,
        signature: [u8; 64],
        amount: u64,
    ) -> Result<()> {
        instructions::compressed_deposit(ctx, encrypted_note_data, signature, amount)
    }

    pub fn compressed_withdraw(
        ctx: Context<CompressedWithdraw>,
        nullifier: [u8; 32],
        leaf_index: u64,
        merkle_proof: Vec<[u8; 32]>,
        destination_wallet: Pubkey,
        relayer: Pubkey,
        withdrawal_amount: u64,
    ) -> Result<()> {
        instructions::compressed_withdraw(
            ctx,
            nullifier,
            leaf_index,
            merkle_proof,
            destination_wallet,
            relayer,
            withdrawal_amount,
        )
    }
}
