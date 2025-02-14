use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token as SplToken, TokenAccount};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

// Constants for rate limiting and supply caps
pub const MAX_SUPPLY: u64 = 1_000_000_000 * 10u64.pow(9); // 1 billion tokens with 9 decimals
pub const MAX_DISTRIBUTION_RATE: u64 = MAX_SUPPLY / 100; // 1% of total supply per distribution
pub const DISTRIBUTION_COOLDOWN: i64 = 3600; // 1 hour cooldown between distributions

#[program]
pub mod sadl_token {
    use super::*;

    // Events
    #[event]
    pub struct TokenInitialized {
        pub supply: u64,
        pub authority: Pubkey,
        pub timestamp: i64,
    }

    #[event]
    pub struct Distribution {
        pub pool_type: PoolType,
        pub amount: u64,
        pub recipient: Pubkey,
        pub timestamp: i64,
    }

    #[event]
    pub struct EmergencyAction {
        pub action_type: EmergencyActionType,
        pub initiator: Pubkey,
        pub timestamp: i64,
    }

    pub fn initialize(ctx: Context<Initialize>, config: TokenConfig) -> Result<()> {
        require!(
            config.supply <= MAX_SUPPLY,
            DistributionError::SupplyCapExceeded
        );

        let token = &mut ctx.accounts.token;
        token.supply = config.supply;
        token.decimals = config.decimals;
        token.authority = config.authority;
        token.emergency_admin = config.authority; // Initially same as authority
        token.total_distributed = 0;
        token.paused = false;
        token.last_distribution = 0;
        token.distribution_pools = DistributionPools {
            community: Pool {
                allocation: (config.supply * 30) / 100,  // 30%
                distributed: 0,
                start_time: config.distribution_start,
                end_time: None,
            },
            development: Pool {
                allocation: (config.supply * 25) / 100,  // 25%
                distributed: 0,
                start_time: config.distribution_start,
                end_time: None,
            },
            treasury: Pool {
                allocation: (config.supply * 20) / 100,  // 20%
                distributed: 0,
                start_time: config.distribution_start,
                end_time: None,
            },
            agent_incentives: Pool {
                allocation: (config.supply * 15) / 100,  // 15%
                distributed: 0,
                start_time: config.distribution_start,
                end_time: None,
            },
            team: Pool {
                allocation: (config.supply * 10) / 100,  // 10%
                distributed: 0,
                start_time: config.distribution_start,
                end_time: Some(config.distribution_start + 63072000), // 2 years
            },
        };

        // Initialize mint
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
                &[&[&token.authority.to_bytes()[..], &[token.bump]]],
            ),
            config.supply,
        )?;

        // Emit initialization event
        emit!(TokenInitialized {
            supply: config.supply,
            authority: config.authority,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn distribute(ctx: Context<Distribute>, pool_type: PoolType, amount: u64) -> Result<()> {
        let token = &mut ctx.accounts.token;
        
        // Check if contract is paused
        require!(!token.paused, DistributionError::ContractPaused);

        // Rate limiting checks
        let current_time = Clock::get()?.unix_timestamp;
        require!(
            current_time >= token.last_distribution + DISTRIBUTION_COOLDOWN,
            DistributionError::CooldownNotElapsed
        );
        require!(
            amount <= MAX_DISTRIBUTION_RATE,
            DistributionError::RateLimitExceeded
        );

        let pool = token.distribution_pools.get_pool_mut(pool_type);

        // Validate distribution
        require!(
            amount <= pool.allocation - pool.distributed,
            DistributionError::ExceedsAllocation
        );
        require!(
            current_time >= pool.start_time,
            DistributionError::DistributionNotStarted
        );
        if let Some(end_time) = pool.end_time {
            require!(
                current_time <= end_time,
                DistributionError::DistributionEnded
            );
        }

        // Update distribution state
        pool.distributed += amount;
        token.total_distributed += amount;
        token.last_distribution = current_time;

        // Transfer tokens
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.recipient.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
                &[&[&token.authority.to_bytes()[..], &[token.bump]]],
            ),
            amount,
        )?;

        // Emit distribution event
        emit!(Distribution {
            pool_type,
            amount,
            recipient: ctx.accounts.recipient.key(),
            timestamp: current_time,
        });

        Ok(())
    }

    pub fn transfer(ctx: Context<Transfer>, amount: u64) -> Result<()> {
        let token = &ctx.accounts.token;
        require!(!token.paused, DistributionError::ContractPaused);

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.from.to_account_info(),
                    to: ctx.accounts.to.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            amount,
        )?;
        Ok(())
    }

    pub fn delegate(ctx: Context<Delegate>, amount: u64) -> Result<()> {
        let token = &ctx.accounts.token;
        require!(!token.paused, DistributionError::ContractPaused);

        token::approve(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Approve {
                    to: ctx.accounts.delegate_account.to_account_info(),
                    delegate: ctx.accounts.delegate.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            amount,
        )?;
        Ok(())
    }

    pub fn pause(ctx: Context<EmergencyAction>) -> Result<()> {
        let token = &mut ctx.accounts.token;
        require!(
            ctx.accounts.admin.key() == token.emergency_admin,
            DistributionError::Unauthorized
        );
        
        token.paused = true;

        emit!(EmergencyAction {
            action_type: EmergencyActionType::Pause,
            initiator: ctx.accounts.admin.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn unpause(ctx: Context<EmergencyAction>) -> Result<()> {
        let token = &mut ctx.accounts.token;
        require!(
            ctx.accounts.admin.key() == token.emergency_admin,
            DistributionError::Unauthorized
        );
        
        token.paused = false;

        emit!(EmergencyAction {
            action_type: EmergencyActionType::Unpause,
            initiator: ctx.accounts.admin.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn update_emergency_admin(ctx: Context<EmergencyAction>, new_admin: Pubkey) -> Result<()> {
        let token = &mut ctx.accounts.token;
        require!(
            ctx.accounts.admin.key() == token.emergency_admin,
            DistributionError::Unauthorized
        );
        
        token.emergency_admin = new_admin;

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
    #[account(init, payer = authority, space = 8 + Token::LEN)]
    pub token: Account<'info, Token>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub token_program: Program<'info, SplToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Distribute<'info> {
    #[account(mut)]
    pub token: Account<'info, Token>,
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub recipient: Account<'info, TokenAccount>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, SplToken>,
}

#[derive(Accounts)]
pub struct Transfer<'info> {
    #[account(mut)]
    pub token: Account<'info, Token>,
    #[account(mut)]
    pub from: Account<'info, TokenAccount>,
    #[account(mut)]
    pub to: Account<'info, TokenAccount>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, SplToken>,
}

#[derive(Accounts)]
pub struct Delegate<'info> {
    #[account(mut)]
    pub token: Account<'info, Token>,
    #[account(mut)]
    pub delegate_account: Account<'info, TokenAccount>,
    pub delegate: AccountInfo<'info>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, SplToken>,
}

#[derive(Accounts)]
pub struct EmergencyAction<'info> {
    #[account(mut)]
    pub token: Account<'info, Token>,
    pub admin: Signer<'info>,
}

#[account]
pub struct Token {
    pub supply: u64,
    pub decimals: u8,
    pub authority: Pubkey,
    pub bump: u8,
    pub total_distributed: u64,
    pub distribution_pools: DistributionPools,
    pub paused: bool,
    pub last_distribution: i64,
    pub emergency_admin: Pubkey,
}

impl Token {
    pub const LEN: usize = 8 + // discriminator
        8 + // supply
        1 + // decimals
        32 + // authority
        1 + // bump
        8 + // total_distributed
        DistributionPools::LEN +
        1 + // paused
        8 + // last_distribution
        32; // emergency_admin
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DistributionPools {
    pub community: Pool,
    pub development: Pool,
    pub treasury: Pool,
    pub agent_incentives: Pool,
    pub team: Pool,
}

impl DistributionPools {
    pub const LEN: usize = Pool::LEN * 5;

    pub fn get_pool_mut(&mut self, pool_type: PoolType) -> &mut Pool {
        match pool_type {
            PoolType::Community => &mut self.community,
            PoolType::Development => &mut self.development,
            PoolType::Treasury => &mut self.treasury,
            PoolType::AgentIncentives => &mut self.agent_incentives,
            PoolType::Team => &mut self.team,
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Pool {
    pub allocation: u64,
    pub distributed: u64,
    pub start_time: i64,
    pub end_time: Option<i64>,
}

impl Pool {
    pub const LEN: usize = 8 + 8 + 8 + 9;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub enum PoolType {
    Community,
    Development,
    Treasury,
    AgentIncentives,
    Team,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct TokenConfig {
    pub supply: u64,
    pub decimals: u8,
    pub authority: Pubkey,
    pub distribution_start: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub enum EmergencyActionType {
    Pause,
    Unpause,
    UpdateAdmin,
}

#[error_code]
pub enum DistributionError {
    #[msg("Distribution amount exceeds pool allocation")]
    ExceedsAllocation,
    #[msg("Distribution period has not started")]
    DistributionNotStarted,
    #[msg("Distribution period has ended")]
    DistributionEnded,
    #[msg("Contract is paused")]
    ContractPaused,
    #[msg("Distribution rate limit exceeded")]
    RateLimitExceeded,
    #[msg("Distribution cooldown period not elapsed")]
    CooldownNotElapsed,
    #[msg("Supply cap exceeded")]
    SupplyCapExceeded,
    #[msg("Unauthorized")]
    Unauthorized,
}
