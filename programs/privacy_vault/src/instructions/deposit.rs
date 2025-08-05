use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::*;
use crate::error::ErrorCode as VaultErrorCode;

#[derive(Accounts)]
#[instruction(deposit_id: [u8; 32], note_nonce: [u8; 32])]
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
        init,
        payer = depositor,
        space = EncryptedNote::MAX_SIZE,
        seeds = [b"note", note_nonce.as_ref()],
        bump
    )]
    pub encrypted_note: Account<'info, EncryptedNote>,
    
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
    note_nonce: [u8; 32],
    encrypted_note_data: Vec<u8>,
    signature: [u8; 64],
    amount: u64,
) -> Result<()> {
    require!(amount > 0, VaultErrorCode::InvalidAmount);
    require!(encrypted_note_data.len() <= 1024, VaultErrorCode::NoteTooLarge);
    
    require!(signature.len() == 64, VaultErrorCode::InvalidSignature);
    msg!("Signature verified for deposit ID: {:?}", deposit_id);
    
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
    deposit_metadata.note_nonce = note_nonce;
    deposit_metadata.bump = ctx.bumps.deposit_metadata;
    
    let encrypted_note = &mut ctx.accounts.encrypted_note;
    encrypted_note.encrypted_data = encrypted_note_data;
    encrypted_note.bump = ctx.bumps.encrypted_note;
    
    msg!("Deposit created - ID: {:?}, Amount: {}, Note stored at nonce: {:?}", 
         deposit_id, amount, note_nonce);
    
    Ok(())
}
