'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useTreasury } from '@/hooks/useTreasury';
import { PublicKey } from '@solana/web3.js';

// Mock SADL token mint for now
const SADL_MINT = new PublicKey('SADLhZfKKxkbGxGDbv7HvKDGDGZxe5D7wNCgrVEwm4k');

export function TreasuryDashboard() {
  const { publicKey } = useWallet();
  const { getTreasuryBalance, getPendingTransactions, loading, error } = useTreasury();
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (publicKey) {
      fetchTreasuryData();
    }
  }, [publicKey]);

  const fetchTreasuryData = async () => {
    try {
      const [treasuryBalance, pendingTxs] = await Promise.all([
        getTreasuryBalance(SADL_MINT),
        getPendingTransactions()
      ]);
      setBalance(treasuryBalance);
      setTransactions(pendingTxs);
    } catch (err) {
      console.error('Failed to fetch treasury data:', err);
    }
  };

  if (!publicKey) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Connect your wallet to view treasury
        </h2>
        <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Balance Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Treasury Balance</h2>
        {loading ? (
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          </div>
        ) : (
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-gray-900">
              {balance !== null ? (balance / 1e9).toFixed(2) : '0.00'}
            </span>
            <span className="text-lg text-gray-600">SADL</span>
          </div>
        )}
      </div>

      {/* Pending Transactions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Pending Transactions</h2>
        {loading ? (
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        ) : transactions.length > 0 ? (
          <div className="space-y-4">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{tx.description}</h3>
                    <p className="text-sm text-gray-500">
                      Amount: {(tx.amount / 1e9).toFixed(2)} SADL
                    </p>
                    <p className="text-sm text-gray-500">
                      Approvals: {tx.approvals.length}
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No pending transactions</p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
