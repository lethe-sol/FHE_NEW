use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::ErrorCode as VaultErrorCode;

#[derive(Accounts)]
pub struct UpdateVaultConfig<'info> {
    #[account(
        mut,
        seeds = [b"vault_config"],
        bump = vault_config.bump,
        has_one = authority @ VaultErrorCode::Unauthorized
    )]
    pub vault_config: Account<'info, VaultConfig>,
    
    pub authority: Signer<'info>,
}

pub fn update_vault_config(
    ctx: Context<UpdateVaultConfig>,
    reward_mint: Option<Pubkey>,
    reward_token_vault: Option<Pubkey>,
    reward_rate_per_second: Option<u64>,
) -> Result<()> {
    let vault_config = &mut ctx.accounts.vault_config;
    
    if let Some(mint) = reward_mint {
        vault_config.reward_mint = mint;
        msg!("Updated reward mint to: {}", mint);
    }
    
    if let Some(vault) = reward_token_vault {
        vault_config.reward_token_vault = vault;
        msg!("Updated reward token vault to: {}", vault);
    }
    
    if let Some(rate) = reward_rate_per_second {
        vault_config.reward_rate_per_second = rate;
        msg!("Updated reward rate per second to: {}", rate);
    }
    
    Ok(())
}
