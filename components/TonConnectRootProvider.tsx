'use client';

import { THEME, TonConnectUIProvider } from '@tonconnect/ui-react';
import React, { useEffect, useState } from 'react';

export default function TonConnectRootProvider({ children }: { children: React.ReactNode }) {
  const [manifestUrl, setManifestUrl] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      setManifestUrl(`${origin}/tonconnect-manifest.json`);
    }
  }, []);

  if (!manifestUrl) {
    return <>{children}</>;
  }

  return (
    <TonConnectUIProvider
      manifestUrl={manifestUrl}
      uiPreferences={{
        theme: THEME.DARK,
      }}
    >
      {children}
    </TonConnectUIProvider>
  );
}
