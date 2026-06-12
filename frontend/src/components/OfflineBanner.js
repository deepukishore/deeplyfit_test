import React from 'react';
import { useNetworkStatus } from '../context/NetworkContext';

const OfflineBanner = () => {
  const { online, syncing, pendingCount } = useNetworkStatus();

  if (online && !syncing && pendingCount === 0) {
    return null;
  }

  return (
    <div className={`offline-banner ${online ? 'is-online' : 'is-offline'}`}>
      <div className="offline-banner-dot" />
      <div>
        <strong>{online ? 'Back online' : 'Offline mode'}</strong>
        <span>
          {online
            ? (syncing ? ' Syncing your saved diary changes...' : ` ${pendingCount} queued change${pendingCount === 1 ? '' : 's'} still pending.`)
            : ' Today’s diary is cached locally. New entries will sync when your internet returns.'}
        </span>
      </div>
    </div>
  );
};

export default OfflineBanner;
