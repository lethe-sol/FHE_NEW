use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    /// CHECK: This account is safe because it's a PDA validated by seeds and bump, no additional type checks needed
    #[account(
        init,
        payer = payer,
        space = 8,
        seeds = [b"vault"],
        bump
    )]
    pub vault: AccountInfo<'info>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
    msg!("Vault initialized successfully");
    Ok(())
}
