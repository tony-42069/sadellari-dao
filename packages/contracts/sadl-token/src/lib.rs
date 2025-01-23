use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token as SplToken, TokenAccount};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod sadl_token {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, config: TokenConfig) -> Result<()> {
        let token = &mut ctx.accounts.token;
        token.supply = config.supply;
        token.decimals = config.decimals;
        token.authority = config.authority;
        token.total_distributed = 0;
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

        Ok(())
    }

    pub fn distribute(ctx: Context<Distribute>, pool_type: PoolType, amount: u64) -> Result<()> {
        let token = &mut ctx.accounts.token;
        let pool = token.distribution_pools.get_pool_mut(pool_type);

        // Validate distribution
        require!(
            amount <= pool.allocation - pool.distributed,
            DistributionError::ExceedsAllocation
        );
        require!(
            Clock::get()?.unix_timestamp >= pool.start_time,
            DistributionError::DistributionNotStarted
        );
        if let Some(end_time) = pool.end_time {
            require!(
                Clock::get()?.unix_timestamp <= end_time,
                DistributionError::DistributionEnded
            );
        }

        // Update distribution state
        pool.distributed += amount;
        token.total_distributed += amount;

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

        Ok(())
    }

    pub fn transfer(ctx: Context<Transfer>, amount: u64) -> Result<()> {
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
    pub from: Account<'info, TokenAccount>,
    #[account(mut)]
    pub to: Account<'info, TokenAccount>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, SplToken>,
}

#[derive(Accounts)]
pub struct Delegate<'info> {
    #[account(mut)]
    pub delegate_account: Account<'info, TokenAccount>,
    pub delegate: AccountInfo<'info>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, SplToken>,
}

#[account]
pub struct Token {
    pub supply: u64,
    pub decimals: u8,
    pub authority: Pubkey,
    pub bump: u8,
    pub total_distributed: u64,
    pub distribution_pools: DistributionPools,
}

impl Token {
    pub const LEN: usize = 8 + 1 + 32 + 1 + 8 + DistributionPools::LEN;
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

#[derive(AnchorSerialize, AnchorDeserialize)]
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

#[error_code]
pub enum DistributionError {
    #[msg("Distribution amount exceeds pool allocation")]
    ExceedsAllocation,
    #[msg("Distribution period has not started")]
    DistributionNotStarted,
    #[msg("Distribution period has ended")]
    DistributionEnded,
}
