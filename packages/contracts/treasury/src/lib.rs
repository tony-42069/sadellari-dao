use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("TreasHZQVHDR2qXkP3FvPQ4FvXJKo6E9gA");

// Constants for rate limiting
pub const MAX_DAILY_TRANSACTION_AMOUNT: u64 = 1_000_000 * 10u64.pow(9); // 1M tokens per day
pub const TRANSACTION_COOLDOWN: i64 = 3600; // 1 hour between large transactions
pub const LARGE_TRANSACTION_THRESHOLD: u64 = 100_000 * 10u64.pow(9); // 100K tokens

#[program]
pub mod treasury {
    use super::*;

    // Events
    #[event]
    pub struct TreasuryInitialized {
        pub authority: Pubkey,
        pub required_signers: u8,
        pub timestamp: i64,
    }

    #[event]
    pub struct TransactionProposed {
        pub id: u64,
        pub amount: u64,
        pub destination: Pubkey,
        pub proposer: Pubkey,
        pub timestamp: i64,
    }

    #[event]
    pub struct TransactionApproved {
        pub id: u64,
        pub approver: Pubkey,
        pub timestamp: i64,
    }

    #[event]
    pub struct TransactionExecuted {
        pub id: u64,
        pub amount: u64,
        pub destination: Pubkey,
        pub executor: Pubkey,
        pub timestamp: i64,
    }

    #[event]
    pub struct EmergencyAction {
        pub action_type: EmergencyActionType,
        pub initiator: Pubkey,
        pub timestamp: i64,
    }

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
        treasury.paused = false;
        treasury.emergency_admin = ctx.accounts.authority.key();
        treasury.daily_transaction_total = 0;
        treasury.last_transaction_time = 0;
        treasury.last_daily_reset = Clock::get()?.unix_timestamp;

        emit!(TreasuryInitialized {
            authority: ctx.accounts.authority.key(),
            required_signers,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn add_signer(ctx: Context<UpdateSigners>, new_signer: Pubkey) -> Result<()> {
        let treasury = &mut ctx.accounts.treasury;
        require!(!treasury.paused, TreasuryError::ContractPaused);
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
        require!(!treasury.paused, TreasuryError::ContractPaused);
        require!(
            treasury.signers.contains(&ctx.accounts.proposer.key()),
            TreasuryError::UnauthorizedSigner
        );

        // Rate limiting checks
        let current_time = Clock::get()?.unix_timestamp;
        
        // Reset daily total if 24 hours have passed
        if current_time - treasury.last_daily_reset >= 86400 {
            treasury.daily_transaction_total = 0;
            treasury.last_daily_reset = current_time;
        }

        // Check daily limit
        require!(
            treasury.daily_transaction_total + amount <= MAX_DAILY_TRANSACTION_AMOUNT,
            TreasuryError::DailyLimitExceeded
        );

        // Cooldown for large transactions
        if amount >= LARGE_TRANSACTION_THRESHOLD {
            require!(
                current_time >= treasury.last_transaction_time + TRANSACTION_COOLDOWN,
                TreasuryError::TransactionCooldownActive
            );
        }

        let transaction = Transaction {
            id: treasury.transaction_count,
            amount,
            destination,
            description,
            approvals: vec![ctx.accounts.proposer.key()],
            executed: false,
            created_at: current_time,
        };

        treasury.pending_transactions.push(transaction);
        treasury.transaction_count += 1;

        emit!(TransactionProposed {
            id: treasury.transaction_count - 1,
            amount,
            destination,
            proposer: ctx.accounts.proposer.key(),
            timestamp: current_time,
        });

        Ok(())
    }

    pub fn approve_transaction(ctx: Context<ApproveTransaction>, transaction_id: u64) -> Result<()> {
        let treasury = &mut ctx.accounts.treasury;
        require!(!treasury.paused, TreasuryError::ContractPaused);

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

        emit!(TransactionApproved {
            id: transaction_id,
            approver: ctx.accounts.signer.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn execute_transaction(ctx: Context<ExecuteTransaction>, transaction_id: u64) -> Result<()> {
        let treasury = &mut ctx.accounts.treasury;
        require!(!treasury.paused, TreasuryError::ContractPaused);

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

        let current_time = Clock::get()?.unix_timestamp;

        // Update rate limiting state
        if current_time - treasury.last_daily_reset >= 86400 {
            treasury.daily_transaction_total = 0;
            treasury.last_daily_reset = current_time;
        }

        treasury.daily_transaction_total += transaction.amount;
        treasury.last_transaction_time = current_time;

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

        emit!(TransactionExecuted {
            id: transaction_id,
            amount: transaction.amount,
            destination: transaction.destination,
            executor: ctx.accounts.treasury.key(),
            timestamp: current_time,
        });

        Ok(())
    }

    pub fn pause(ctx: Context<EmergencyAction>) -> Result<()> {
        let treasury = &mut ctx.accounts.treasury;
        require!(
            ctx.accounts.admin.key() == treasury.emergency_admin,
            TreasuryError::Unauthorized
        );
        
        treasury.paused = true;

        emit!(EmergencyAction {
            action_type: EmergencyActionType::Pause,
            initiator: ctx.accounts.admin.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn unpause(ctx: Context<EmergencyAction>) -> Result<()> {
        let treasury = &mut ctx.accounts.treasury;
        require!(
            ctx.accounts.admin.key() == treasury.emergency_admin,
            TreasuryError::Unauthorized
        );
        
        treasury.paused = false;

        emit!(EmergencyAction {
            action_type: EmergencyActionType::Unpause,
            initiator: ctx.accounts.admin.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn update_emergency_admin(ctx: Context<EmergencyAction>, new_admin: Pubkey) -> Result<()> {
        let treasury = &mut ctx.accounts.treasury;
        require!(
            ctx.accounts.admin.key() == treasury.emergency_admin,
            TreasuryError::Unauthorized
        );
        
        treasury.emergency_admin = new_admin;

        emit!(EmergencyAction {
            action_type: EmergencyActionType::UpdateAdmin,
            initiator: ctx.accounts.admin.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

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

#[derive(Accounts)]
pub struct EmergencyAction<'info> {
    #[account(mut)]
    pub treasury: Account<'info, Treasury>,
    pub admin: Signer<'info>,
}

#[account]
pub struct Treasury {
    pub signers: Vec<Pubkey>,
    pub required_signers: u8,
    pub pending_transactions: Vec<Transaction>,
    pub transaction_count: u64,
    pub bump: u8,
    pub paused: bool,
    pub emergency_admin: Pubkey,
    pub daily_transaction_total: u64,
    pub last_transaction_time: i64,
    pub last_daily_reset: i64,
}

impl Treasury {
    pub const LEN: usize = 8 + // discriminator
        4 + (32 * 5) + // signers (max 5)
        1 + // required_signers
        4 + (Transaction::LEN * 100) + // pending_transactions (max 100)
        8 + // transaction_count
        1 + // bump
        1 + // paused
        32 + // emergency_admin
        8 + // daily_transaction_total
        8 + // last_transaction_time
        8; // last_daily_reset
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

#[derive(AnchorSerialize, AnchorDeserialize)]
pub enum EmergencyActionType {
    Pause,
    Unpause,
    UpdateAdmin,
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
    #[msg("Contract is paused")]
    ContractPaused,
    #[msg("Daily transaction limit exceeded")]
    DailyLimitExceeded,
    #[msg("Transaction cooldown period active")]
    TransactionCooldownActive,
    #[msg("Unauthorized")]
    Unauthorized,
}
