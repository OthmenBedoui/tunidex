import React from 'react';

interface ProductStickyMobileBarProps {
  price: number;
  onAddToCart: () => void;
  onBuyNow: () => void;
}

const ProductStickyMobileBar: React.FC<ProductStickyMobileBarProps> = ({ price, onAddToCart, onBuyNow }) => (
  <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border-soft)] bg-[color-mix(in_srgb,var(--surface-card)_94%,transparent)] px-4 py-3 text-[var(--text-strong)] shadow-2xl backdrop-blur-xl xl:hidden">
    <div className="mx-auto flex max-w-[1224px] items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">Featured Offer</div>
        <div className="text-xl font-black">TND {price.toFixed(2)}</div>
      </div>
      <button type="button" onClick={onAddToCart} className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-3 text-xs font-black uppercase text-[var(--text-strong)]">
        Cart
      </button>
      <button type="button" onClick={onBuyNow} className="rounded-xl bg-emerald-500 px-5 py-3 text-xs font-black uppercase text-black">
        Buy now
      </button>
    </div>
  </div>
);

export default ProductStickyMobileBar;
