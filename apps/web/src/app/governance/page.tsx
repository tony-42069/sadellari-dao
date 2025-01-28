'use client';

import { ProposalForm } from '@/components/governance/ProposalForm';
import { ProposalList } from '@/components/governance/ProposalList';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function GovernancePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Governance</h1>
        <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-semibold mb-4">Active Proposals</h2>
          <ProposalList />
        </div>

        <div>
          <ProposalForm />
        </div>
      </div>
    </div>
  );
}
