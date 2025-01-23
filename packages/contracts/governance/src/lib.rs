use anchor_lang::prelude::*;
use anchor_lang::solana_program::clock::Clock;
use anchor_spl::token::{self, Token, TokenAccount};

declare_id!("Govz1Dj1JhKqXGfdRg7gG2LgYMPJhH5kR2vWGtJfFd2A");

#[program]
pub mod governance {
    use super::*;

    pub fn create_proposal(ctx: Context<CreateProposal>, proposal: ProposalInput) -> Result<()> {
        require!(
            proposal.title.len() <= 128,
            GovernanceError::TitleTooLong
        );
        require!(
            proposal.description.len() <= 1024,
            GovernanceError::DescriptionTooLong
        );

        let proposal_account = &mut ctx.accounts.proposal;
        let token_balance = ctx.accounts.proposer_tokens.amount;
        
        require!(
            token_balance >= 1000,  // 1000 SADL minimum
            GovernanceError::InsufficientTokens
        );

        proposal_account.id = proposal.id;
        proposal_account.proposer = ctx.accounts.proposer.key();
        proposal_account.title = proposal.title;
        proposal_account.description = proposal.description;
        proposal_account.execution_plan = proposal.execution_plan;
        proposal_account.votes = VoteCount::default();
        proposal_account.status = ProposalStatus::Active;
        proposal_account.created_at = Clock::get()?.unix_timestamp;
        proposal_account.voting_ends_at = proposal_account.created_at + 86400; // 24 hours
        proposal_account.total_voting_power = 0;
        proposal_account.quorum_reached = false;

        Ok(())
    }

    pub fn vote(ctx: Context<Vote>, vote_type: VoteType) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        let voter_tokens = ctx.accounts.voter_tokens.amount;
        let current_time = Clock::get()?.unix_timestamp;

        require!(
            proposal.status == ProposalStatus::Active,
            GovernanceError::ProposalNotActive
        );
        require!(
            current_time <= proposal.voting_ends_at,
            GovernanceError::VotingEnded
        );
        require!(
            voter_tokens > 0,
            GovernanceError::NoVotingPower
        );

        // Update vote counts
        match vote_type {
            VoteType::Yes => {
                proposal.votes.yes += voter_tokens;
            }
            VoteType::No => {
                proposal.votes.no += voter_tokens;
            }
            VoteType::Abstain => {
                proposal.votes.abstain += voter_tokens;
            }
        }

        proposal.total_voting_power += voter_tokens;

        // Check if quorum is reached (20% of total supply)
        if proposal.total_voting_power >= 20_000_000 { // 20M tokens
            proposal.quorum_reached = true;
        }

        // Check if voting period has ended
        if current_time >= proposal.voting_ends_at {
            finalize_proposal(proposal)?;
        }

        Ok(())
    }

    pub fn execute(ctx: Context<Execute>) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        let current_time = Clock::get()?.unix_timestamp;

        require!(
            proposal.status == ProposalStatus::Passed,
            GovernanceError::ProposalNotPassed
        );
        require!(
            current_time >= proposal.voting_ends_at + 43200, // 12 hour timelock
            GovernanceError::TimelockNotExpired
        );

        proposal.status = ProposalStatus::Executed;
        Ok(())
    }
}

fn finalize_proposal(proposal: &mut Account<Proposal>) -> Result<()> {
    if !proposal.quorum_reached {
        proposal.status = ProposalStatus::Failed;
        return Ok(());
    }

    let total_votes = proposal.votes.yes + proposal.votes.no;
    if total_votes == 0 {
        proposal.status = ProposalStatus::Failed;
        return Ok(());
    }

    let yes_percentage = (proposal.votes.yes as f64 / total_votes as f64) * 100.0;
    if yes_percentage > 66.0 { // 66% majority required
        proposal.status = ProposalStatus::Passed;
    } else {
        proposal.status = ProposalStatus::Failed;
    }

    Ok(())
}

#[derive(Accounts)]
pub struct CreateProposal<'info> {
    #[account(init, payer = proposer, space = Proposal::LEN)]
    pub proposal: Account<'info, Proposal>,
    #[account(mut)]
    pub proposer: Signer<'info>,
    pub proposer_tokens: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Vote<'info> {
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
    pub voter: Signer<'info>,
    pub voter_tokens: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Execute<'info> {
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
    pub executor: Signer<'info>,
    pub token_program: Program<'info, Token>,
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
    pub voting_ends_at: i64,
    pub total_voting_power: u64,
    pub quorum_reached: bool,
}

impl Proposal {
    pub const LEN: usize = 8 + // discriminator
        8 + // id
        32 + // proposer
        4 + 128 + // title
        4 + 1024 + // description
        4 + 1024 + // execution_plan
        24 + // votes
        1 + // status
        8 + // created_at
        8 + // voting_ends_at
        8 + // total_voting_power
        1; // quorum_reached
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct VoteCount {
    pub yes: u64,
    pub no: u64,
    pub abstain: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, PartialEq, Clone)]
pub enum ProposalStatus {
    Active,
    Passed,
    Failed,
    Executed,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub enum VoteType {
    Yes,
    No,
    Abstain,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ProposalInput {
    pub id: u64,
    pub title: String,
    pub description: String,
    pub execution_plan: Vec<u8>,
}

#[error_code]
pub enum GovernanceError {
    #[msg("Title exceeds maximum length")]
    TitleTooLong,
    #[msg("Description exceeds maximum length")]
    DescriptionTooLong,
    #[msg("Insufficient tokens to create proposal")]
    InsufficientTokens,
    #[msg("Proposal is not active")]
    ProposalNotActive,
    #[msg("Voting period has ended")]
    VotingEnded,
    #[msg("No voting power")]
    NoVotingPower,
    #[msg("Proposal has not passed")]
    ProposalNotPassed,
    #[msg("Timelock period has not expired")]
    TimelockNotExpired,
}
