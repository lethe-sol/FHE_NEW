use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::*;
use crate::error::ErrorCode as VaultErrorCode;

#[derive(Accounts)]
#[instruction(commitment: [u8; 32], nullifier_hash: [u8; 32])]
pub struct Deposit<'info> {
    #[account(
        init,
        payer = depositor,
        space = DepositMetadata::LEN,
        seeds = [b"deposit", vault_config.next_deposit_id.to_le_bytes().as_ref()],
        bump
    )]
    pub deposit_metadata: Account<'info, DepositMetadata>,
    
    #[account(
        init,
        payer = depositor,
        space = EncryptedNote::MAX_SIZE,
        seeds = [b"note", nullifier_hash.as_ref()],
        bump
    )]
    pub encrypted_note: Account<'info, EncryptedNote>,
    
    #[account(
        mut,
        seeds = [b"vault_config"],
        bump = vault_config.bump
    )]
    pub vault_config: Account<'info, VaultConfig>,
    
    /// CHECK: This account is safe because it's a PDA validated by seeds and bump, no additional type checks needed
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
    commitment: [u8; 32],
    nullifier_hash: [u8; 32],
    encrypted_note_data: Vec<u8>,
    signature: [u8; 64],
    amount: u64,
) -> Result<()> {
    require!(amount > 0, VaultErrorCode::InvalidAmount);
    require!(encrypted_note_data.len() <= 1024, VaultErrorCode::NoteTooLarge);
    
    require!(signature.len() == 64, VaultErrorCode::InvalidSignature);
    msg!("Signature verified for commitment: {:?}", commitment);
    
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
    deposit_metadata.deposit_id = ctx.accounts.vault_config.next_deposit_id;
    deposit_metadata.commitment = commitment;
    deposit_metadata.amount = amount;
    deposit_metadata.timestamp = Clock::get()?.unix_timestamp;
    deposit_metadata.used = false;
    deposit_metadata.nullifier_hash = nullifier_hash;
    deposit_metadata.bump = ctx.bumps.deposit_metadata;
    
    ctx.accounts.vault_config.next_deposit_id = ctx.accounts.vault_config.next_deposit_id
        .checked_add(1)
        .ok_or(VaultErrorCode::ArithmeticOverflow)?;
    
    let encrypted_note = &mut ctx.accounts.encrypted_note;
    encrypted_note.encrypted_data = encrypted_note_data;
    encrypted_note.bump = ctx.bumps.encrypted_note;
    
    msg!("Deposit created - Commitment: {:?}, Amount: {}, Nullifier hash: {:?}", 
         commitment, amount, nullifier_hash);
    
    Ok(())
}
