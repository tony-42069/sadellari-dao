'use client';

import { DistributionDashboard } from '@/components/distribution/DistributionDashboard';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function DistributionPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Token Distribution</h1>
        <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700" />
      </div>

      <DistributionDashboard />
    </div>
  );
}
