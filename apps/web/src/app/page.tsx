'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function Home() {
  const { connected } = useWallet();

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-secondary-900">Sadellari DAO</h1>
        <WalletMultiButton />
      </header>

      {!connected ? (
        <div className="card text-center py-12">
          <h2 className="text-xl font-semibold text-secondary-900 mb-4">
            Connect your wallet to get started
          </h2>
          <p className="text-secondary-600 mb-6">
            You need to connect a Solana wallet to interact with the DAO
          </p>
          <WalletMultiButton />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-secondary-900 mb-4">
              Governance
            </h2>
            <div className="space-y-4">
              <button className="btn btn-primary w-full">Create Proposal</button>
              <button className="btn btn-secondary w-full">View Proposals</button>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-secondary-900 mb-4">
              Treasury
            </h2>
            <div className="space-y-4">
              <button className="btn btn-primary w-full">View Balance</button>
              <button className="btn btn-secondary w-full">Transaction History</button>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-secondary-900 mb-4">
              Token Distribution
            </h2>
            <div className="space-y-4">
              <button className="btn btn-primary w-full">Claim Tokens</button>
              <button className="btn btn-secondary w-full">View Distribution</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
