use anchor_lang::prelude::*;
use crate::state::*;

#[derive(Accounts)]
pub struct InitializeVaultConfig<'info> {
    #[account(
        init,
        payer = payer,
        space = VaultConfig::LEN,
        seeds = [b"vault_config"],
        bump
    )]
    pub vault_config: Account<'info, VaultConfig>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn initialize_vault_config(
    ctx: Context<InitializeVaultConfig>,
    authority: Pubkey,
    reward_mint: Pubkey,
    reward_token_vault: Pubkey,
    reward_rate_per_second: u64,
) -> Result<()> {
    let vault_config = &mut ctx.accounts.vault_config;
    
    vault_config.authority = authority;
    vault_config.reward_mint = reward_mint;
    vault_config.reward_token_vault = reward_token_vault;
    vault_config.reward_rate_per_second = reward_rate_per_second;
    vault_config.bump = ctx.bumps.vault_config;
    
    msg!("Vault config initialized with authority: {}", authority);
    
    Ok(())
}
