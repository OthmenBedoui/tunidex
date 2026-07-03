import React from 'react';
import { Trash2 } from 'lucide-react';
import { CartItem } from '../../../types';
import { ListingImage } from '../ListingImage';
import PriceDisplay from '../PriceDisplay';

interface CartItemsListProps {
  items: CartItem[];
  onRemove: (item: CartItem) => void;
}

const CartItemsList: React.FC<CartItemsListProps> = ({ items, onRemove }) => (
  <div className="space-y-6">
    {items.map((item) => (
      <div key={item.id} className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md sm:flex-row">
        <div className="mb-4 h-24 w-24 overflow-hidden rounded-xl shadow-sm sm:mb-0 sm:mr-6">
          <ListingImage listing={item.listing} />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <div className="mb-1 text-xs font-bold uppercase text-indigo-600">{item.listing.game}</div>
          <h3 className="mb-1 text-xl font-bold text-slate-900">{item.listing.title}</h3>
          {item.variant && (
            <div className="mb-1 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
              {item.listing.variantLabel ? `${item.listing.variantLabel}: ` : ''}
              {item.variant.name}
            </div>
          )}
        </div>
        <div className="mx-6 mt-4 text-right sm:mt-0">
          {item.variant ? (
            <div className="text-xl font-black text-slate-900">
              {item.variant.price.toFixed(2)} <span className="text-xs font-normal text-slate-500">TND</span>
            </div>
          ) : (
            <PriceDisplay listing={item.listing} priceClassName="text-xl font-black text-slate-900" />
          )}
          <div className="mt-1 inline-block rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-400">Qte: {item.quantity}</div>
        </div>
        <button onClick={() => onRemove(item)} className="mt-4 rounded-xl p-3 text-slate-300 transition-all hover:bg-indigo-50 hover:text-indigo-500 sm:mt-0">
          <Trash2 size={20} />
        </button>
      </div>
    ))}
  </div>
);

export default CartItemsList;
