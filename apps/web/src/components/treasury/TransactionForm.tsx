'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useTreasury } from '@/hooks/useTreasury';
import { PublicKey } from '@solana/web3.js';

export function TransactionForm() {
  const { publicKey } = useWallet();
  const { proposeTransaction, loading, error } = useTreasury();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [destination, setDestination] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!publicKey) {
      setFormError('Please connect your wallet first');
      return;
    }

    if (!amount || !description || !destination) {
      setFormError('Please fill in all required fields');
      return;
    }

    try {
      setFormError(null);
      setSuccessMessage(null);

      let destinationPubkey: PublicKey;
      try {
        destinationPubkey = new PublicKey(destination);
      } catch (err) {
        setFormError('Invalid destination address');
        return;
      }

      const amountLamports = Math.floor(parseFloat(amount) * 1e9);
      if (isNaN(amountLamports) || amountLamports <= 0) {
        setFormError('Invalid amount');
        return;
      }

      await proposeTransaction(
        amountLamports,
        destinationPubkey,
        description.trim()
      );
      
      // Reset form
      setAmount('');
      setDescription('');
      setDestination('');
      setSuccessMessage('Transaction proposed successfully!');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to propose transaction');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Propose Transaction</h2>
      
      {!publicKey ? (
        <div className="text-center py-6">
          <p className="text-gray-600 mb-4">Connect your wallet to propose transactions</p>
          <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
              Amount (SADL)
            </label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.000000001"
              min="0"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              placeholder="0.00"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="destination" className="block text-sm font-medium text-gray-700">
              Destination Address
            </label>
            <input
              type="text"
              id="destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              placeholder="Solana address"
              required
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
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              placeholder="Explain the purpose of this transaction"
              required
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
            {loading ? 'Proposing...' : 'Propose Transaction'}
          </button>

          <p className="text-xs text-gray-500 mt-2">
            Note: Transaction proposals require approval from multiple signers
          </p>
        </form>
      )}
    </div>
  );
}
