use anchor_lang::prelude::*;
use anchor_lang::solana_program::clock::Clock;

declare_id!("Govz1Dj1JhKqXGfdRg7gG3LgYMPJhH5kR2vWGtJfFd2A");

#[program]
pub mod governance {
    use super::*;

    pub fn create_proposal(ctx: Context<CreateProposal>, proposal: Proposal) -> Result<()> {
        let proposal_account = &mut ctx.accounts.proposal;
        proposal_account.id = proposal.id;
        proposal_account.proposer = proposal.proposer;
        proposal_account.title = proposal.title;
        proposal_account.description = proposal.description;
        proposal_account.execution_plan = proposal.execution_plan;
        proposal_account.votes = VoteCount { yes: 0, no: 0 };
        proposal_account.status = ProposalStatus::Active;
        proposal_account.created_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn vote(ctx: Context<Vote>, vote: Vote) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        
        match vote {
            Vote::Yes => proposal.votes.yes += 1,
            Vote::No => proposal.votes.no += 1,
        }
        
        Ok(())
    }

    pub fn execute(ctx: Context<Execute>) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        proposal.status = ProposalStatus::Executed;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateProposal<'info> {
    #[account(init, payer = proposer, space = 8 + 8 + 32 + 128 + 128 + 256 + 16 + 4 + 8)]
    pub proposal: Account<'info, Proposal>,
    #[account(mut)]
    pub proposer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Vote<'info> {
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
    pub voter: Signer<'info>,
}

#[derive(Accounts)]
pub struct Execute<'info> {
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
    pub executor: Signer<'info>,
}

#[account]
pub struct Proposal {
    pub id: u64,
    pub proposer: Pubkey,
    pub title: String,
    pub description: String,
    pub execution_plan: Vec<u8>,
    pub votes: VoteCount,
    pub status: ProposalStatus,
    pub created_at: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct VoteCount {
    pub yes: u64,
    pub no: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, PartialEq, Clone)]
pub enum ProposalStatus {
    Active,
    Passed,
    Rejected,
    Executed,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub enum Vote {
    Yes,
    No,
}
