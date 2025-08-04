use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::*;
use crate::error::ErrorCode as VaultErrorCode;

#[derive(Accounts)]
#[instruction(deposit_id: [u8; 32])]
pub struct Deposit<'info> {
    #[account(
        init,
        payer = depositor,
        space = DepositMetadata::LEN,
        seeds = [b"deposit", deposit_id.as_ref()],
        bump
    )]
    pub deposit_metadata: Account<'info, DepositMetadata>,
    
    #[account(
        mut,
        seeds = [b"vault"],
        bump
    )]
    pub vault: AccountInfo<'info>,
    
    #[account(mut)]
    pub depositor: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn deposit(
    ctx: Context<Deposit>,
    deposit_id: [u8; 32],
    signature: [u8; 64],
    amount: u64,
) -> Result<()> {
    require!(amount > 0, VaultErrorCode::InvalidAmount);
    
    let message = deposit_id;
    let pubkey_bytes = ctx.accounts.depositor.key().to_bytes();
    
    msg!("Deposit signature verification placeholder - signature: {:?}", signature);
    
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.depositor.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        ),
        amount,
    )?;
    
    let deposit_metadata = &mut ctx.accounts.deposit_metadata;
    deposit_metadata.deposit_id = deposit_id;
    deposit_metadata.amount = amount;
    deposit_metadata.timestamp = Clock::get()?.unix_timestamp;
    deposit_metadata.used = false;
    deposit_metadata.bump = ctx.bumps.deposit_metadata;
    
    msg!("Deposit created - ID: {:?}, Amount: {}", deposit_id, amount);
    
    Ok(())
}
