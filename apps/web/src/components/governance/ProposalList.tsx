import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useGovernance } from '@/hooks/useGovernance';
import { Proposal, ProposalStatus, VoteType } from '@/types/governance';

export function ProposalList() {
  const { publicKey } = useWallet();
  const { getProposals, castVote, loading, error } = useGovernance();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [votingStates, setVotingStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchProposals();
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchProposals, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchProposals = async () => {
    try {
      const fetchedProposals = await getProposals();
      setProposals(fetchedProposals);
    } catch (err) {
      console.error('Failed to fetch proposals:', err);
    }
  };

  const handleVote = async (proposalId: string, voteType: VoteType) => {
    if (!publicKey) return;

    try {
      setVotingStates(prev => ({ ...prev, [proposalId]: true }));
      await castVote({ proposalId, voteType });
      await fetchProposals(); // Refresh proposals after voting
    } catch (err) {
      console.error('Failed to cast vote:', err);
    } finally {
      setVotingStates(prev => ({ ...prev, [proposalId]: false }));
    }
  };

  const calculateProgress = (votes: Proposal['votes']) => {
    const totalVotes = votes.for + votes.against + votes.abstain;
    const quorumProgress = (totalVotes / votes.quorum) * 100;
    const forPercentage = totalVotes > 0 ? (votes.for / totalVotes) * 100 : 0;
    
    return {
      quorumProgress: Math.min(quorumProgress, 100),
      forPercentage
    };
  };

  if (!publicKey) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Connect your wallet to view proposals
        </h2>
        <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {loading && proposals.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading proposals...</p>
        </div>
      )}

      {!loading && proposals.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600">No proposals found</p>
        </div>
      )}

      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      {proposals.map((proposal) => {
        const { quorumProgress, forPercentage } = calculateProgress(proposal.votes);
        const isVoting = votingStates[proposal.id];

        return (
          <div
            key={proposal.id}
            className="bg-white rounded-lg shadow-md p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold">{proposal.title}</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium
                ${proposal.status === ProposalStatus.ACTIVE ? 'bg-green-100 text-green-800' :
                  proposal.status === ProposalStatus.SUCCEEDED ? 'bg-blue-100 text-blue-800' :
                  proposal.status === ProposalStatus.EXECUTED ? 'bg-purple-100 text-purple-800' :
                  'bg-red-100 text-red-800'}`}
              >
                {proposal.status}
              </span>
            </div>

            <p className="text-gray-600 mb-4">{proposal.description}</p>

            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Quorum Progress</span>
                <span>{quorumProgress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${quorumProgress}%` }}
                />
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Vote Distribution</span>
                <span>{forPercentage.toFixed(1)}% For</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-green-500 h-2.5 rounded-full"
                  style={{ width: `${forPercentage}%` }}
                />
              </div>
            </div>

            {proposal.status === ProposalStatus.ACTIVE && (
              <div className="flex space-x-4">
                <button
                  onClick={() => handleVote(proposal.id, VoteType.FOR)}
                  disabled={isVoting}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-md disabled:bg-gray-300"
                >
                  {isVoting ? 'Voting...' : 'Vote For'}
                </button>
                <button
                  onClick={() => handleVote(proposal.id, VoteType.AGAINST)}
                  disabled={isVoting}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-md disabled:bg-gray-300"
                >
                  {isVoting ? 'Voting...' : 'Vote Against'}
                </button>
                <button
                  onClick={() => handleVote(proposal.id, VoteType.ABSTAIN)}
                  disabled={isVoting}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md disabled:bg-gray-300"
                >
                  {isVoting ? 'Voting...' : 'Abstain'}
                </button>
              </div>
            )}

            <div className="mt-4 text-sm text-gray-500">
              <p>Proposer: {proposal.proposer.toString()}</p>
              <p>Ends: {new Date(proposal.endTime).toLocaleString()}</p>
              {proposal.executionTime && (
                <p>Execution Time: {new Date(proposal.executionTime).toLocaleString()}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
