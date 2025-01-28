'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';

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
              <Link href="/governance" className="btn btn-primary w-full block text-center">
                Create Proposal
              </Link>
              <Link href="/governance" className="btn btn-secondary w-full block text-center">
                View Proposals
              </Link>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-secondary-900 mb-4">
              Treasury
            </h2>
            <div className="space-y-4">
              <Link href="/treasury" className="btn btn-primary w-full block text-center">
                View Balance
              </Link>
              <Link href="/treasury/transactions" className="btn btn-secondary w-full block text-center">
                Transaction History
              </Link>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-secondary-900 mb-4">
              Token Distribution
            </h2>
            <div className="space-y-4">
              <Link href="/distribution/claim" className="btn btn-primary w-full block text-center">
                Claim Tokens
              </Link>
              <Link href="/distribution" className="btn btn-secondary w-full block text-center">
                View Distribution
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
