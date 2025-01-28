import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useGovernance } from '@/hooks/useGovernance';
import { CreateProposalInput } from '@/types/governance';

export function ProposalForm() {
  const { publicKey } = useWallet();
  const { createProposal, loading, error } = useGovernance();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!publicKey) {
      setFormError('Please connect your wallet first');
      return;
    }

    if (!title.trim() || !description.trim()) {
      setFormError('Please fill in all required fields');
      return;
    }

    try {
      setFormError(null);
      setSuccessMessage(null);

      const input: CreateProposalInput = {
        title: title.trim(),
        description: description.trim(),
        executionPlan: {
          instructions: [],
          timelock: 43200 // 12 hours
        }
      };

      await createProposal(input);
      
      // Reset form
      setTitle('');
      setDescription('');
      setSuccessMessage('Proposal created successfully!');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create proposal');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Create Proposal</h2>
      
      {!publicKey ? (
        <div className="text-center py-6">
          <p className="text-gray-600 mb-4">Connect your wallet to create a proposal</p>
          <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              placeholder="Enter proposal title"
              required
              minLength={5}
              maxLength={100}
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              placeholder="Describe your proposal in detail"
              required
              minLength={20}
              maxLength={2000}
              disabled={loading}
            />
          </div>

          {formError && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
              {formError}
            </div>
          )}

          {successMessage && (
            <div className="text-green-600 text-sm bg-green-50 p-3 rounded-md">
              {successMessage}
            </div>
          )}

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
              ${loading 
                ? 'bg-purple-400 cursor-not-allowed' 
                : 'bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500'
              }`}
          >
            {loading ? 'Creating Proposal...' : 'Create Proposal'}
          </button>

          <p className="text-xs text-gray-500 mt-2">
            Note: Creating a proposal requires a minimum of 1000 SADL tokens
          </p>
        </form>
      )}
    </div>
  );
}
