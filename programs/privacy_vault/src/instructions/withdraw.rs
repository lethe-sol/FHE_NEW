use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::*;
use crate::error::ErrorCode as VaultErrorCode;

#[derive(Accounts)]
#[instruction(deposit_id: [u8; 32])]
pub struct Withdraw<'info> {
    #[account(
        mut,
        seeds = [b"deposit", deposit_id.as_ref()],
        bump = deposit_metadata.bump,
        constraint = !deposit_metadata.used @ VaultErrorCode::DepositAlreadyUsed,
        constraint = deposit_metadata.deposit_id == deposit_id @ VaultErrorCode::InvalidDepositId
    )]
    pub deposit_metadata: Account<'info, DepositMetadata>,
    
    #[account(
        seeds = [b"vault_config"],
        bump = vault_config.bump
    )]
    pub vault_config: Account<'info, VaultConfig>,
    
    #[account(
        mut,
        seeds = [b"vault"],
        bump
    )]
    pub vault: AccountInfo<'info>,
    
    #[account(mut)]
    pub destination_wallet: AccountInfo<'info>,
    
    #[account(mut)]
    pub destination_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub relayer: AccountInfo<'info>,
    
    #[account(
        mut,
        constraint = vault_token_account.mint == vault_config.reward_mint,
        constraint = vault_token_account.key() == vault_config.reward_token_vault
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    
    pub system_program: Program<'info, System>,
}

pub fn withdraw(
    ctx: Context<Withdraw>,
    deposit_id: [u8; 32],
    destination_wallet: Pubkey,
    destination_token_account: Pubkey,
    relayer: Pubkey,
) -> Result<()> {
    let deposit_metadata = &mut ctx.accounts.deposit_metadata;
    let vault_config = &ctx.accounts.vault_config;
    
    let current_time = Clock::get()?.unix_timestamp;
    let holding_duration = current_time
        .checked_sub(deposit_metadata.timestamp)
        .ok_or(VaultErrorCode::ArithmeticOverflow)?;
    
    let reward_amount = (holding_duration as u64)
        .checked_mul(vault_config.reward_rate_per_second)
        .ok_or(VaultErrorCode::ArithmeticOverflow)?;
    
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
    
    let vault_seeds = &[b"vault".as_ref(), &[ctx.bumps.vault]];
    let signer_seeds = &[&vault_seeds[..]];
    
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_token_account.to_account_info(),
                to: ctx.accounts.destination_token_account.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            signer_seeds,
        ),
        reward_amount,
    )?;
    
    deposit_metadata.used = true;
    
    msg!(
        "Withdrawal completed - Destination: {}, Relayer: {}, Reward: {}",
        withdrawal_amount,
        relayer_fee,
        reward_amount
    );
    
    Ok(())
}
