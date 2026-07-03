import React from 'react';
import { CheckCircle2, Gamepad2, Globe2, MonitorPlay } from 'lucide-react';
import { ProductInfoAction } from './types';

interface ProductInfoHighlightsProps {
  activationCountry: string;
  region: string;
  platform: string;
  systemLabel: string;
  infoButtons: ProductInfoAction[];
  onOpenInfo: (info: ProductInfoAction) => void;
}

const ProductInfoHighlights: React.FC<ProductInfoHighlightsProps> = ({
  activationCountry,
  region,
  platform,
  systemLabel,
  infoButtons,
  onOpenInfo
}) => (
  <div className="mt-8 border-t border-[var(--border-soft)] pt-7">
    <div className="grid grid-cols-1 gap-x-14 gap-y-6 lg:grid-cols-2">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-[var(--border-soft)] bg-[var(--surface-card)]">
          <CheckCircle2 size={30} className="text-emerald-500" />
        </div>
        <div className="min-w-0 text-sm text-[var(--text-body)]">
          <div>
            Can be activated in <span className="font-black text-[var(--text-strong)]">{activationCountry}</span>
          </div>
          <button type="button" onClick={() => onOpenInfo(infoButtons[0])} className="mt-1 text-xs font-black text-blue-500 hover:text-blue-400">
            {infoButtons[0].label}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-[var(--border-soft)] bg-[var(--surface-card)]">
          <Globe2 size={30} className="text-blue-500" />
        </div>
        <div className="min-w-0 text-sm text-[var(--text-body)]">
          <div>
            Region: <span className="font-black text-[var(--text-strong)]">{region}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-[var(--border-soft)] bg-[var(--surface-card)]">
          <Gamepad2 size={30} className="text-sky-500" />
        </div>
        <div className="min-w-0 text-sm text-[var(--text-body)]">
          <div>
            Platform: <span className="font-black text-[var(--text-strong)]">{platform}</span>
          </div>
          <button type="button" onClick={() => onOpenInfo(infoButtons[1])} className="mt-1 text-xs font-black text-blue-500 hover:text-blue-400">
            {infoButtons[1].label}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-[var(--border-soft)] bg-[var(--surface-card)]">
          <MonitorPlay size={30} className="text-blue-500" />
        </div>
        <div className="min-w-0 text-sm text-[var(--text-body)]">
          <div>
            Works on: <span className="font-black text-[var(--text-strong)]">{systemLabel}</span>
          </div>
          <button
            type="button"
            onClick={() => document.getElementById('system-requirements')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="mt-1 text-xs font-black text-blue-500 hover:text-blue-400"
          >
            System Requirements
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default ProductInfoHighlights;
