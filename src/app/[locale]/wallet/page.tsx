import React from 'react';
import WalletPage from '@/modules/wallet/WalletPage';

export default function Page() {
  // Keep this server component minimal. All locale-aware links are handled
  // inside the client WalletPage via next-intl's useLocale().
  return <WalletPage />;
}
