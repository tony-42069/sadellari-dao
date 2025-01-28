import { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import {
  Proposal,
  CreateProposalInput,
  ProposalVoteInput,
  ProposalStatus,
  VoteType
} from '../types/governance';

const GOVERNANCE_PROGRAM_ID = new PublicKey('YOUR_GOVERNANCE_PROGRAM_ID');
const MIN_PROPOSAL_TOKENS = 1000; // 1000 SADL required to create proposal

export function useGovernance() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProposal = useCallback(async (input: CreateProposalInput): Promise<string> => {
    if (!publicKey || !signTransaction) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      // Check token balance
      const balance = await connection.getBalance(publicKey);
      if (balance < MIN_PROPOSAL_TOKENS) {
        throw new Error(`Insufficient SADL tokens. Minimum ${MIN_PROPOSAL_TOKENS} required.`);
      }

      // Create proposal transaction
      const transaction = new Transaction();
      
      // Add create proposal instruction
      // TODO: Replace with actual governance program instruction
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: GOVERNANCE_PROGRAM_ID,
          lamports: 0,
        })
      );

      // Sign and send transaction
      transaction.recentBlockhash = (
        await connection.getRecentBlockhash()
      ).blockhash;
      transaction.feePayer = publicKey;

      const signed = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(signature);

      return signature;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create proposal';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey, signTransaction]);

  const castVote = useCallback(async (input: ProposalVoteInput): Promise<string> => {
    if (!publicKey || !signTransaction) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      // Create vote transaction
      const transaction = new Transaction();
      
      // Add vote instruction
      // TODO: Replace with actual governance program instruction
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: GOVERNANCE_PROGRAM_ID,
          lamports: 0,
        })
      );

      // Sign and send transaction
      transaction.recentBlockhash = (
        await connection.getRecentBlockhash()
      ).blockhash;
      transaction.feePayer = publicKey;

      const signed = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(signature);

      return signature;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cast vote';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey, signTransaction]);

  const getProposals = useCallback(async (): Promise<Proposal[]> => {
    setLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual governance program account fetching
      // For now, return mock data
      return [
        {
          id: '1',
          title: 'Example Proposal',
          description: 'This is an example proposal for testing the interface.',
          proposer: publicKey || SystemProgram.programId,
          status: ProposalStatus.ACTIVE,
          votes: {
            for: 100000,
            against: 50000,
            abstain: 10000,
            quorum: 200000,
            totalEligible: 1000000
          },
          executionPlan: {
            instructions: [],
            timelock: 43200 // 12 hours
          },
          startTime: new Date(),
          endTime: new Date(Date.now() + 86400000), // 24 hours from now
        }
      ];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch proposals';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  const getProposal = useCallback(async (proposalId: string): Promise<Proposal> => {
    setLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual governance program account fetching
      const proposals = await getProposals();
      const proposal = proposals.find(p => p.id === proposalId);
      if (!proposal) {
        throw new Error('Proposal not found');
      }
      return proposal;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch proposal';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [getProposals]);

  return {
    createProposal,
    castVote,
    getProposals,
    getProposal,
    loading,
    error
  };
}
