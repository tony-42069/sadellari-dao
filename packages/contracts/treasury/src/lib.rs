use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("TreasHZQVHDR2qXkP3FvPQ4FvXJKo6E9gA");

#[program]
pub mod treasury {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, required_signers: u8) -> Result<()> {
        require!(
            required_signers > 0 && required_signers <= 5,
            TreasuryError::InvalidSignerCount
        );

        let treasury = &mut ctx.accounts.treasury;
        treasury.signers = vec![ctx.accounts.authority.key()];
        treasury.required_signers = required_signers;
        treasury.pending_transactions = Vec::new();
        treasury.transaction_count = 0;
        Ok(())
    }

    pub fn add_signer(ctx: Context<UpdateSigners>, new_signer: Pubkey) -> Result<()> {
        let treasury = &mut ctx.accounts.treasury;
        require!(
            treasury.signers.len() < 5,
            TreasuryError::MaxSignersReached
        );
        require!(
            !treasury.signers.contains(&new_signer),
            TreasuryError::SignerAlreadyExists
        );

        treasury.signers.push(new_signer);
        Ok(())
    }

    pub fn propose_transaction(
        ctx: Context<ProposeTransaction>,
        amount: u64,
        destination: Pubkey,
        description: String,
    ) -> Result<()> {
        let treasury = &mut ctx.accounts.treasury;
        require!(
            treasury.signers.contains(&ctx.accounts.proposer.key()),
            TreasuryError::UnauthorizedSigner
        );

        let transaction = Transaction {
            id: treasury.transaction_count,
            amount,
            destination,
            description,
            approvals: vec![ctx.accounts.proposer.key()],
            executed: false,
            created_at: Clock::get()?.unix_timestamp,
        };

        treasury.pending_transactions.push(transaction);
        treasury.transaction_count += 1;
        Ok(())
    }

    pub fn approve_transaction(ctx: Context<ApproveTransaction>, transaction_id: u64) -> Result<()> {
        let treasury = &mut ctx.accounts.treasury;
        let transaction = treasury.pending_transactions
            .iter_mut()
            .find(|t| t.id == transaction_id)
            .ok_or(TreasuryError::TransactionNotFound)?;

        require!(
            !transaction.executed,
            TreasuryError::AlreadyExecuted
        );
        require!(
            treasury.signers.contains(&ctx.accounts.signer.key()),
            TreasuryError::UnauthorizedSigner
        );
        require!(
            !transaction.approvals.contains(&ctx.accounts.signer.key()),
            TreasuryError::AlreadyApproved
        );

        transaction.approvals.push(ctx.accounts.signer.key());
        Ok(())
    }

    pub fn execute_transaction(ctx: Context<ExecuteTransaction>, transaction_id: u64) -> Result<()> {
        let treasury = &mut ctx.accounts.treasury;
        let transaction = treasury.pending_transactions
            .iter_mut()
            .find(|t| t.id == transaction_id)
            .ok_or(TreasuryError::TransactionNotFound)?;

        require!(
            !transaction.executed,
            TreasuryError::AlreadyExecuted
        );
        require!(
            transaction.approvals.len() >= treasury.required_signers as usize,
            TreasuryError::InsufficientApprovals
        );

        // Transfer tokens
        let transfer_instruction = Transfer {
            from: ctx.accounts.treasury_vault.to_account_info(),
            to: ctx.accounts.destination.to_account_info(),
            authority: ctx.accounts.treasury.to_account_info(),
        };

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                transfer_instruction,
                &[&[&treasury.signers[0].to_bytes()[..], &[treasury.bump]]],
            ),
            transaction.amount,
        )?;

        transaction.executed = true;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = authority, space = Treasury::LEN)]
    pub treasury: Account<'info, Treasury>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateSigners<'info> {
    #[account(mut)]
    pub treasury: Account<'info, Treasury>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ProposeTransaction<'info> {
    #[account(mut)]
    pub treasury: Account<'info, Treasury>,
    pub proposer: Signer<'info>,
}

#[derive(Accounts)]
pub struct ApproveTransaction<'info> {
    #[account(mut)]
    pub treasury: Account<'info, Treasury>,
    pub signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct ExecuteTransaction<'info> {
    #[account(mut)]
    pub treasury: Account<'info, Treasury>,
    #[account(mut)]
    pub treasury_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub destination: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Treasury {
    pub signers: Vec<Pubkey>,
    pub required_signers: u8,
    pub pending_transactions: Vec<Transaction>,
    pub transaction_count: u64,
    pub bump: u8,
}

impl Treasury {
    pub const LEN: usize = 8 + // discriminator
        4 + (32 * 5) + // signers (max 5)
        1 + // required_signers
        4 + (Transaction::LEN * 100) + // pending_transactions (max 100)
        8 + // transaction_count
        1; // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Transaction {
    pub id: u64,
    pub amount: u64,
    pub destination: Pubkey,
    pub description: String,
    pub approvals: Vec<Pubkey>,
    pub executed: bool,
    pub created_at: i64,
}

impl Transaction {
    pub const LEN: usize = 8 + // id
        8 + // amount
        32 + // destination
        4 + 128 + // description
        4 + (32 * 5) + // approvals (max 5)
        1 + // executed
        8; // created_at
}

#[error_code]
pub enum TreasuryError {
    #[msg("Invalid number of required signers")]
    InvalidSignerCount,
    #[msg("Maximum number of signers reached")]
    MaxSignersReached,
    #[msg("Signer already exists")]
    SignerAlreadyExists,
    #[msg("Unauthorized signer")]
    UnauthorizedSigner,
    #[msg("Transaction not found")]
    TransactionNotFound,
    #[msg("Transaction already executed")]
    AlreadyExecuted,
    #[msg("Already approved this transaction")]
    AlreadyApproved,
    #[msg("Insufficient approvals to execute")]
    InsufficientApprovals,
}
