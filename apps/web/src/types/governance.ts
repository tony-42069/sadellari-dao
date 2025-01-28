import { PublicKey } from '@solana/web3.js';

export enum ProposalStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  EXECUTED = 'EXECUTED',
  CANCELLED = 'CANCELLED'
}

export enum VoteType {
  FOR = 'FOR',
  AGAINST = 'AGAINST',
  ABSTAIN = 'ABSTAIN'
}

export interface VoteCount {
  for: number;
  against: number;
  abstain: number;
  quorum: number;
  totalEligible: number;
}

export interface Vote {
  voter: PublicKey;
  proposalId: string;
  type: VoteType;
  votingPower: number;
  timestamp: Date;
}

export interface ExecutionPlan {
  instructions: {
    programId: PublicKey;
    data: Buffer;
    accounts: {
      pubkey: PublicKey;
      isSigner: boolean;
      isWritable: boolean;
    }[];
  }[];
  timelock: number; // Duration in seconds
}

export interface Proposal {
  id: string;
  title: string;
  description: string;
  proposer: PublicKey;
  status: ProposalStatus;
  votes: VoteCount;
  executionPlan: ExecutionPlan;
  startTime: Date;
  endTime: Date;
  executionTime?: Date;
  metadata?: Record<string, any>;
}

export interface CreateProposalInput {
  title: string;
  description: string;
  executionPlan: ExecutionPlan;
}

export interface ProposalVoteInput {
  proposalId: string;
  voteType: VoteType;
}
