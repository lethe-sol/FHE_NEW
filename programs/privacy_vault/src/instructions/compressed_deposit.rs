use anchor_lang::prelude::*;
use account_compression::{program::AccountCompression, cpi::accounts::BatchAppend};

#[derive(Accounts)]
pub struct CompressedDeposit<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault"],
        bump
    )]
    pub vault: AccountInfo<'info>,

    #[account(mut)]
    pub merkle_tree: AccountInfo<'info>,
    
    #[account(mut)]
    pub output_queue: AccountInfo<'info>,
    
    pub registered_program_pda: AccountInfo<'info>,
    
    pub log_wrapper: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
    pub account_compression_program: Program<'info, AccountCompression>,
}

pub fn compressed_deposit(
    ctx: Context<CompressedDeposit>,
    encrypted_note_data: Vec<u8>,
    signature: [u8; 64],
    amount: u64,
) -> Result<()> {
    require!(encrypted_note_data.len() <= 1024, crate::error::ErrorCode::NoteTooLarge);
    require!(signature.len() == 64, crate::error::ErrorCode::InvalidSignature);

    anchor_lang::system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.depositor.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        ),
        amount,
    )?;

    let mut leaf_data = Vec::new();
    leaf_data.extend_from_slice(&encrypted_note_data);
    leaf_data.extend_from_slice(&signature);
    leaf_data.extend_from_slice(&amount.to_le_bytes());
    leaf_data.extend_from_slice(&Clock::get()?.unix_timestamp.to_le_bytes());
    leaf_data.extend_from_slice(&ctx.accounts.depositor.key().to_bytes());

    let cpi_accounts = BatchAppend {
        authority: ctx.accounts.depositor.to_account_info(),
        registered_program_pda: Some(ctx.accounts.registered_program_pda.to_account_info()),
        log_wrapper: ctx.accounts.log_wrapper.to_account_info(),
        merkle_tree: ctx.accounts.merkle_tree.to_account_info(),
        output_queue: ctx.accounts.output_queue.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(
        ctx.accounts.account_compression_program.to_account_info(),
        cpi_accounts,
    );

    account_compression::cpi::batch_append(cpi_ctx, leaf_data)?;

    msg!("Compressed deposit completed - Amount: {}", amount);
    
    Ok(())
}
