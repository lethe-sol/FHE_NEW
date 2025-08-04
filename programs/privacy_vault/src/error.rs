use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid signature for deposit ID")]
    InvalidSignature,
    #[msg("Deposit has already been used")]
    DepositAlreadyUsed,
    #[msg("Invalid deposit ID")]
    InvalidDepositId,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
    #[msg("Encrypted note data too large")]
    NoteTooLarge,
}
