use anchor_lang::prelude::*;
use anchor_lang::solana_program::clock::Clock;
use anchor_spl::token::{self, Token, TokenAccount};

declare_id!("Govz1Dj1JhKqXGfdRg7gG2LgYMPJhH5kR2vWGtJfFd2A");

// Constants for rate limiting
pub const PROPOSAL_COOLDOWN: i64 = 86400; // 24 hours between proposals from same proposer
pub const MAX_CONCURRENT_PROPOSALS: u32 = 10;
pub const MIN_VOTING_POWER: u64 = 1000 * 10u64.pow(9); // 1000 tokens with 9 decimals

#[program]
pub mod governance {
    use super::*;

    // Events
    #[event]
    pub struct ProposalCreated {
        pub id: u64,
        pub proposer: Pubkey,
        pub title: String,
        pub timestamp: i64,
    }

    #[event]
    pub struct VoteCast {
        pub proposal_id: u64,
        pub voter: Pubkey,
        pub vote_type: VoteType,
        pub voting_power: u64,
        pub timestamp: i64,
    }

    #[event]
    pub struct ProposalExecuted {
        pub id: u64,
        pub executor: Pubkey,
        pub timestamp: i64,
    }

    #[event]
    pub struct EmergencyAction {
        pub action_type: EmergencyActionType,
        pub initiator: Pubkey,
        pub timestamp: i64,
    }

    pub fn create_proposal(ctx: Context<CreateProposal>, proposal: ProposalInput) -> Result<()> {
        let governance = &mut ctx.accounts.governance;
        require!(!governance.paused, GovernanceError::ContractPaused);

        require!(
            proposal.title.len() <= 128,
            GovernanceError::TitleTooLong
        );
        require!(
            proposal.description.len() <= 1024,
            GovernanceError::DescriptionTooLong
        );

        let token_balance = ctx.accounts.proposer_tokens.amount;
        require!(
            token_balance >= MIN_VOTING_POWER,
            GovernanceError::InsufficientTokens
        );

        // Rate limiting checks
        let current_time = Clock::get()?.unix_timestamp;
        let proposer = ctx.accounts.proposer.key();
        
        if let Some(last_proposal_time) = governance.last_proposal_times.get(&proposer) {
            require!(
                current_time >= last_proposal_time + PROPOSAL_COOLDOWN,
                GovernanceError::ProposalCooldownActive
            );
        }

        require!(
            governance.active_proposal_count < MAX_CONCURRENT_PROPOSALS,
            GovernanceError::TooManyActiveProposals
        );

        let proposal_account = &mut ctx.accounts.proposal;
        proposal_account.id = proposal.id;
        proposal_account.proposer = proposer;
        proposal_account.title = proposal.title;
        proposal_account.description = proposal.description;
        proposal_account.execution_plan = proposal.execution_plan;
        proposal_account.votes = VoteCount::default();
        proposal_account.status = ProposalStatus::Active;
        proposal_account.created_at = current_time;
        proposal_account.voting_ends_at = current_time + 86400; // 24 hours
        proposal_account.total_voting_power = 0;
        proposal_account.quorum_reached = false;

        // Update governance state
        governance.last_proposal_times.insert(proposer, current_time);
        governance.active_proposal_count += 1;

        emit!(ProposalCreated {
            id: proposal.id,
            proposer,
            title: proposal.title.clone(),
            timestamp: current_time,
        });

        Ok(())
    }

    pub fn vote(ctx: Context<Vote>, vote_type: VoteType) -> Result<()> {
        let governance = &ctx.accounts.governance;
        require!(!governance.paused, GovernanceError::ContractPaused);

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

        // Check for double voting
        require!(
            !proposal.has_voted(&ctx.accounts.voter.key()),
            GovernanceError::AlreadyVoted
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
        proposal.voters.push(ctx.accounts.voter.key());

        // Check if quorum is reached (20% of total supply)
        if proposal.total_voting_power >= 20_000_000 * 10u64.pow(9) { // 20M tokens
            proposal.quorum_reached = true;
        }

        // Check if voting period has ended
        if current_time >= proposal.voting_ends_at {
            finalize_proposal(proposal)?;
            if proposal.status == ProposalStatus::Failed {
                let governance = &mut ctx.accounts.governance;
                governance.active_proposal_count -= 1;
            }
        }

        emit!(VoteCast {
            proposal_id: proposal.id,
            voter: ctx.accounts.voter.key(),
            vote_type,
            voting_power: voter_tokens,
            timestamp: current_time,
        });

        Ok(())
    }

    pub fn execute(ctx: Context<Execute>) -> Result<()> {
        let governance = &ctx.accounts.governance;
        require!(!governance.paused, GovernanceError::ContractPaused);

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
        
        let governance = &mut ctx.accounts.governance;
        governance.active_proposal_count -= 1;

        emit!(ProposalExecuted {
            id: proposal.id,
            executor: ctx.accounts.executor.key(),
            timestamp: current_time,
        });

        Ok(())
    }

    pub fn pause(ctx: Context<EmergencyAction>) -> Result<()> {
        let governance = &mut ctx.accounts.governance;
        require!(
            ctx.accounts.admin.key() == governance.emergency_admin,
            GovernanceError::Unauthorized
        );
        
        governance.paused = true;

        emit!(EmergencyAction {
            action_type: EmergencyActionType::Pause,
            initiator: ctx.accounts.admin.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn unpause(ctx: Context<EmergencyAction>) -> Result<()> {
        let governance = &mut ctx.accounts.governance;
        require!(
            ctx.accounts.admin.key() == governance.emergency_admin,
            GovernanceError::Unauthorized
        );
        
        governance.paused = false;

        emit!(EmergencyAction {
            action_type: EmergencyActionType::Unpause,
            initiator: ctx.accounts.admin.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn update_emergency_admin(ctx: Context<EmergencyAction>, new_admin: Pubkey) -> Result<()> {
        let governance = &mut ctx.accounts.governance;
        require!(
            ctx.accounts.admin.key() == governance.emergency_admin,
            GovernanceError::Unauthorized
        );
        
        governance.emergency_admin = new_admin;

        emit!(EmergencyAction {
            action_type: EmergencyActionType::UpdateAdmin,
            initiator: ctx.accounts.admin.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

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
    #[account(mut)]
    pub governance: Account<'info, Governance>,
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
    pub governance: Account<'info, Governance>,
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
    pub voter: Signer<'info>,
    pub voter_tokens: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Execute<'info> {
    #[account(mut)]
    pub governance: Account<'info, Governance>,
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
    pub executor: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct EmergencyAction<'info> {
    #[account(mut)]
    pub governance: Account<'info, Governance>,
    pub admin: Signer<'info>,
}

#[account]
pub struct Governance {
    pub emergency_admin: Pubkey,
    pub paused: bool,
    pub active_proposal_count: u32,
    pub last_proposal_times: std::collections::BTreeMap<Pubkey, i64>,
}

impl Governance {
    pub const LEN: usize = 8 + // discriminator
        32 + // emergency_admin
        1 + // paused
        4 + // active_proposal_count
        1024; // last_proposal_times (approximate space for BTreeMap)
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
    pub voters: Vec<Pubkey>,
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
        1 + // quorum_reached
        4 + (32 * 100); // voters (max 100 voters)

    pub fn has_voted(&self, voter: &Pubkey) -> bool {
        self.voters.contains(voter)
    }
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

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
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

#[derive(AnchorSerialize, AnchorDeserialize)]
pub enum EmergencyActionType {
    Pause,
    Unpause,
    UpdateAdmin,
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
    #[msg("Contract is paused")]
    ContractPaused,
    #[msg("Proposal cooldown period active")]
    ProposalCooldownActive,
    #[msg("Too many active proposals")]
    TooManyActiveProposals,
    #[msg("Already voted on this proposal")]
    AlreadyVoted,
    #[msg("Unauthorized")]
    Unauthorized,
}
