import React from 'react';
import { SiteConfig } from '../../types';

interface StoreBootLoaderProps {
  siteConfig: SiteConfig;
  message?: string;
}

const defaultLoaderMessage = 'Chargement du catalogue TuniBots...';

const StoreBootLoader: React.FC<StoreBootLoaderProps> = ({ siteConfig, message }) => {
  const hasCustomLoader = siteConfig.startupLoaderEnabled && Boolean(siteConfig.startupLoaderImageUrl);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
      style={{ background: siteConfig.startupLoaderBackground || '#020617' }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.28),transparent_35%),radial-gradient(circle_at_bottom,rgba(14,165,233,0.18),transparent_30%)]" />
      <div className="relative flex w-full max-w-md flex-col items-center px-6 text-center text-white">
        <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl backdrop-blur-md">
          {hasCustomLoader ? (
            <img
              src={siteConfig.startupLoaderImageUrl}
              alt={`${siteConfig.siteName} loader`}
              className="h-full w-full object-contain"
              referrerPolicy="no-referrer"
            />
          ) : siteConfig.logoUrl ? (
            <img
              src={siteConfig.logoUrl}
              alt={siteConfig.siteName}
              className="h-24 w-24 object-contain"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="text-4xl font-black uppercase tracking-[0.24em]">
              {siteConfig.siteName.slice(0, 2)}
            </div>
          )}
        </div>
        <div className="mt-8 text-xs font-black uppercase tracking-[0.35em] text-white/60">Store Loading</div>
        <div className="mt-3 text-3xl font-black">{siteConfig.siteName || 'TuniBots'}</div>
        <p className="mt-3 text-sm leading-7 text-white/75">
          {message || defaultLoaderMessage}
        </p>
      </div>
    </div>
  );
};

export default StoreBootLoader;
