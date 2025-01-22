use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod sadl_token {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, config: TokenConfig) -> Result<()> {
        let token = &mut ctx.accounts.token;
        token.supply = config.supply;
        token.decimals = config.decimals;
        token.authority = config.authority;
        Ok(())
    }

    pub fn transfer(ctx: Context<Transfer>, amount: u64) -> Result<()> {
        // Implement transfer logic
        Ok(())
    }

    pub fn delegate(ctx: Context<Delegate>, amount: u64) -> Result<()> {
        // Implement delegation logic
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = 8 + 32 + 1 + 8)]
    pub token: Account<'info, Token>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Transfer<'info> {
    #[account(mut)]
    pub from: AccountInfo<'info>,
    #[account(mut)]
    pub to: AccountInfo<'info>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct Delegate<'info> {
    #[account(mut)]
    pub token: Account<'info, Token>,
    pub delegator: Signer<'info>,
}

#[account]
pub struct Token {
    pub supply: u64,
    pub decimals: u8,
    pub authority: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct TokenConfig {
    pub supply: u64,
    pub decimals: u8,
    pub authority: Pubkey,
}
