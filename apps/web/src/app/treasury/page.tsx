'use client';

import { TreasuryDashboard } from '@/components/treasury/TreasuryDashboard';
import { TransactionForm } from '@/components/treasury/TransactionForm';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function TreasuryPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Treasury</h1>
        <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <TreasuryDashboard />
        </div>

        <div>
          <TransactionForm />
        </div>
      </div>
    </div>
  );
}
