'use client';

import BlockedUserScreen from '@/components/BlockedUserScreen';
import CrashGameArea from '@/components/crash/CrashGameArea';
import { Header } from '@/components/crash/Header';
import { TonPurchaseModal } from '@/components/crash/TonPurchaseModal';
import { useLobbySocket } from '@/hooks/useLobbySocket';
import { useStore } from '@/lib/store';
import { retrieveRawInitData } from '@telegram-apps/sdk';
import { useEffect, useState } from 'react';

export default function Page() {
  const { user, balance, demoBalance } = useStore();
  const [initData, setInitData] = useState<string>('');
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const initDataRaw = retrieveRawInitData();
        if (initDataRaw) {
          setInitData(initDataRaw);
        } else {
          setInitData('dev');
        }
      } catch (err) {
        console.warn('[Page] retrieveRawInitData error, using dev mode:', err);
        setInitData('dev');
      }
    }
  }, []);

  const { connected } = useLobbySocket({ initData });

  if (user?.blocked) {
    return <BlockedUserScreen />;
  }

  return (
    <div className="min-h-screen bg-[#121316] text-white flex justify-center items-start selection:bg-yellow-400/30">
      <div className="w-full max-w-[483px] min-h-screen bg-[#181a20] flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.8)] relative sm:border-x sm:border-[#374151]/30">
        <Header
          balance={balance}
          demoBalance={demoBalance}
          connected={connected}
          onBalanceClick={() => setIsPurchaseModalOpen(true)}
        />
        <main className="w-full flex-1 px-2.5 sm:px-3 py-2 sm:py-3 flex flex-col">
          <CrashGameArea />
        </main>
        <TonPurchaseModal
          isOpen={isPurchaseModalOpen}
          onCloseAction={() => setIsPurchaseModalOpen(false)}
        />
      </div>
    </div>
  );
}
