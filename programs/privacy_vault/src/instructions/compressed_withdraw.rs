use anchor_lang::prelude::*;
use account_compression::{program::AccountCompression, cpi::accounts::NullifyLeaves};

#[derive(Accounts)]
pub struct CompressedWithdraw<'info> {
    #[account(mut)]
    pub withdrawer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault"],
        bump
    )]
    pub vault: AccountInfo<'info>,

    #[account(mut)]
    pub merkle_tree: AccountInfo<'info>,
    
    #[account(mut)]
    pub nullifier_queue: AccountInfo<'info>,
    
    pub registered_program_pda: AccountInfo<'info>,
    
    pub log_wrapper: AccountInfo<'info>,
    
    pub destination_wallet: AccountInfo<'info>,

    pub relayer: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
    pub account_compression_program: Program<'info, AccountCompression>,
}

pub fn compressed_withdraw(
    ctx: Context<CompressedWithdraw>,
    nullifier: [u8; 32],
    leaf_index: u64,
    _merkle_proof: Vec<[u8; 32]>,
    _destination_wallet: Pubkey,
    _relayer: Pubkey,
    withdrawal_amount: u64,
) -> Result<()> {
    let cpi_accounts = NullifyLeaves {
        authority: ctx.accounts.withdrawer.to_account_info(),
        registered_program_pda: Some(ctx.accounts.registered_program_pda.to_account_info()),
        log_wrapper: ctx.accounts.log_wrapper.to_account_info(),
        merkle_tree: ctx.accounts.merkle_tree.to_account_info(),
        nullifier_queue: ctx.accounts.nullifier_queue.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(
        ctx.accounts.account_compression_program.to_account_info(),
        cpi_accounts,
    );

    account_compression::cpi::nullify_leaves(
        cpi_ctx,
        vec![0u64],
        vec![0u16], 
        vec![leaf_index],
        vec![_merkle_proof],
    )?;
    
    let vault_seeds = &[b"vault".as_ref(), &[ctx.bumps.vault]];
    let vault_signer = &[&vault_seeds[..]];

    anchor_lang::system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.destination_wallet.to_account_info(),
            },
            vault_signer,
        ),
        withdrawal_amount,
    )?;

    msg!("Compressed withdrawal completed - Nullifier: {:?}, Leaf index: {}, Amount: {}", 
         nullifier, leaf_index, withdrawal_amount);
    
    Ok(())
}
