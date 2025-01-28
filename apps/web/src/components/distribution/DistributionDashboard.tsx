'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useTokenDistribution, PoolType } from '@/hooks/useTokenDistribution';

export function DistributionDashboard() {
  const { publicKey } = useWallet();
  const { getDistributionPools, getClaimableAmount, claimTokens, loading, error } = useTokenDistribution();
  const [pools, setPools] = useState<any>(null);
  const [claimableAmounts, setClaimableAmounts] = useState<Record<PoolType, number>>({} as Record<PoolType, number>);

  useEffect(() => {
    if (publicKey) {
      fetchDistributionData();
    }
  }, [publicKey]);

  const fetchDistributionData = async () => {
    try {
      const [distributionPools, ...claimable] = await Promise.all([
        getDistributionPools(),
        ...Object.values(PoolType).map(poolType => getClaimableAmount(poolType))
      ]);

      setPools(distributionPools);
      setClaimableAmounts(
        Object.values(PoolType).reduce((acc, poolType, index) => ({
          ...acc,
          [poolType]: claimable[index]
        }), {} as Record<PoolType, number>)
      );
    } catch (err) {
      console.error('Failed to fetch distribution data:', err);
    }
  };

  const handleClaim = async (poolType: PoolType) => {
    try {
      const amount = claimableAmounts[poolType];
      if (amount > 0) {
        await claimTokens(poolType, amount);
        await fetchDistributionData(); // Refresh data after claiming
      }
    } catch (err) {
      console.error('Failed to claim tokens:', err);
    }
  };

  const calculateProgress = (allocated: number, distributed: number) => {
    return (distributed / allocated) * 100;
  };

  if (!publicKey) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Connect your wallet to view token distribution
        </h2>
        <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Total Distribution Progress */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Token Distribution</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="bg-purple-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-purple-900">Total Supply</h3>
            <p className="text-2xl font-bold text-purple-700">100,000,000 SADL</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-green-900">Total Distributed</h3>
            <p className="text-2xl font-bold text-green-700">
              {pools ? (
                `${(Object.values(pools).reduce((sum: number, pool: any) => sum + pool.distributed, 0)).toLocaleString()} SADL`
              ) : (
                <span className="animate-pulse">Loading...</span>
              )}
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900">Distribution Progress</h3>
            <p className="text-2xl font-bold text-blue-700">
              {pools ? (
                `${((Object.values(pools).reduce((sum: number, pool: any) => sum + pool.distributed, 0) / 100_000_000) * 100).toFixed(2)}%`
              ) : (
                <span className="animate-pulse">Loading...</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Distribution Pools */}
      <div className="space-y-6">
        {loading && !pools ? (
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        ) : pools ? (
          Object.entries(pools).map(([key, pool]: [string, any]) => {
            const progress = calculateProgress(pool.allocation, pool.distributed);
            const claimable = claimableAmounts[key as PoolType] || 0;
            const isVested = 'endTime' in pool;

            return (
              <div key={key} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {key.charAt(0).toUpperCase() + key.slice(1)} Pool
                    </h3>
                    <p className="text-sm text-gray-500">
                      {pool.allocation.toLocaleString()} SADL allocated
                    </p>
                  </div>
                  {isVested && (
                    <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                      2-Year Vesting
                    </span>
                  )}
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Distribution Progress</span>
                    <span>{progress.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-purple-600 h-2.5 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-sm">
                    <p className="text-gray-500">Distributed: {pool.distributed.toLocaleString()} SADL</p>
                    <p className="text-gray-500">
                      Remaining: {(pool.allocation - pool.distributed).toLocaleString()} SADL
                    </p>
                  </div>
                  {claimable > 0 && (
                    <button
                      onClick={() => handleClaim(key as PoolType)}
                      disabled={loading}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-purple-300"
                    >
                      Claim {claimable.toLocaleString()} SADL
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : null}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
