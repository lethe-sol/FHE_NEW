use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::ErrorCode as VaultErrorCode;

#[derive(Accounts)]
#[instruction(deposit_id: [u8; 32], note_nonce: [u8; 32])]
pub struct Withdraw<'info> {
    #[account(
        mut,
        seeds = [b"deposit", deposit_id.as_ref()],
        bump = deposit_metadata.bump,
        constraint = !deposit_metadata.used @ VaultErrorCode::DepositAlreadyUsed,
        constraint = deposit_metadata.deposit_id == deposit_id @ VaultErrorCode::InvalidDepositId,
        constraint = deposit_metadata.note_nonce == note_nonce @ VaultErrorCode::InvalidDepositId
    )]
    pub deposit_metadata: Account<'info, DepositMetadata>,
    
    #[account(
        seeds = [b"note", note_nonce.as_ref()],
        bump = encrypted_note.bump
    )]
    pub encrypted_note: Account<'info, EncryptedNote>,
    
    /// CHECK: This account is safe because it's a PDA validated by seeds and bump, no additional type checks needed
    #[account(
        mut,
        seeds = [b"vault"],
        bump
    )]
    pub vault: AccountInfo<'info>,

    /// CHECK: This account is safe because it's validated by the relayer and used for SOL transfers
    #[account(mut)]
    pub destination_wallet: AccountInfo<'info>,

    /// CHECK: This account is safe because it's validated by the relayer and used for fee collection
    #[account(mut)]
    pub relayer: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn withdraw(
    ctx: Context<Withdraw>,
    _deposit_id: [u8; 32],
    _note_nonce: [u8; 32],
    _destination_wallet: Pubkey,
    _relayer: Pubkey,
) -> Result<()> {
    let deposit_metadata = &mut ctx.accounts.deposit_metadata;
    
    let relayer_fee = deposit_metadata.amount
        .checked_mul(5)
        .ok_or(VaultErrorCode::ArithmeticOverflow)?
        .checked_div(1000)
        .ok_or(VaultErrorCode::ArithmeticOverflow)?;
    
    let withdrawal_amount = deposit_metadata.amount
        .checked_sub(relayer_fee)
        .ok_or(VaultErrorCode::ArithmeticOverflow)?;
    
    **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= withdrawal_amount;
    **ctx.accounts.destination_wallet.to_account_info().try_borrow_mut_lamports()? += withdrawal_amount;
    
    **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= relayer_fee;
    **ctx.accounts.relayer.to_account_info().try_borrow_mut_lamports()? += relayer_fee;
    
    deposit_metadata.used = true;
    
    msg!(
        "Withdrawal completed - Destination: {}, Relayer: {}",
        withdrawal_amount,
        relayer_fee
    );
    
    Ok(())
}
