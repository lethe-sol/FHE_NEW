use anchor_lang::prelude::*;

#[account]
pub struct DepositMetadata {
    pub deposit_id: [u8; 32],
    pub amount: u64,
    pub timestamp: i64,
    pub used: bool,
    pub note_nonce: [u8; 32],
    pub bump: u8,
}

impl DepositMetadata {
    pub const LEN: usize = 8 + 32 + 8 + 8 + 1 + 32 + 1;
}

#[account]
pub struct EncryptedNote {
    pub encrypted_data: Vec<u8>,
    pub bump: u8,
}

impl EncryptedNote {
    pub const MAX_SIZE: usize = 8 + 4 + 1024 + 1; // 8 (discriminator) + 4 (vec length) + 1024 (max encrypted data) + 1 (bump)
}

#[account]
pub struct VaultConfig {
    pub authority: Pubkey,
    pub reward_mint: Pubkey,
    pub reward_token_vault: Pubkey,
    pub reward_rate_per_second: u64,
    pub bump: u8,
}

impl VaultConfig {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 8 + 1;
}
