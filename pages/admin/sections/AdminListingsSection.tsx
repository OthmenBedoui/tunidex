import React from 'react';
import { Edit, Loader2, Trash2 } from 'lucide-react';
import { ListingImage } from '../../../components/store-client/ListingImage';
import { AdminEmptyState } from '../../../components/admin/AdminWorkspace';
import { getListingDiscountLabel, getListingFinalPrice, hasListingDiscount } from '../../../utils/pricing';
import { Category, Listing, UserRole } from '../../../types';

interface AdminListingsSectionProps {
  listings: Listing[];
  categories: Category[];
  userRole: UserRole;
  navigateTo: (page: string, slug?: string) => void;
  onCreateNew: () => void;
  onEditListing: (listing: Listing) => void;
  onDeleteListing: (listing: Listing) => void;
  getListingStateClasses: (listing: Listing) => string;
}

const AdminListingsSection: React.FC<AdminListingsSectionProps> = ({
  listings,
  categories,
  userRole,
  navigateTo,
  onCreateNew,
  onEditListing,
  onDeleteListing,
  getListingStateClasses
}) => (
  <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
    <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4 font-bold">
      <span>Inventaire Produits</span>
      <button onClick={onCreateNew} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-indigo-700">Nouveau</button>
    </div>
    {listings.length === 0 ? (
      <div className="p-6">
        <AdminEmptyState
          title="Aucun produit dans le catalogue"
          description="Commence par créer un produit ou un pack pour alimenter la marketplace."
          action={
            <button onClick={onCreateNew} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
              Ajouter un produit
            </button>
          }
        />
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500">
            <tr>
              <th className="px-6 py-3">Produit</th>
              <th className="px-6 py-3">Catégorie</th>
              {userRole === UserRole.ADMIN && <th className="px-6 py-3">Source</th>}
              <th className="px-6 py-3">Prix</th>
              <th className="px-6 py-3">Stock</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {listings.map((listing) => (
              <tr key={listing.id} className="transition-colors hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 overflow-hidden rounded border border-slate-100">
                      <ListingImage listing={listing} alt="" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-bold text-slate-900">{listing.title}</div>
                        {listing.isPackage && (
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-700">Pack</span>
                        )}
                      </div>
                      <div className="text-[10px] font-bold uppercase text-slate-400">{listing.game}</div>
                      <button
                        type="button"
                        onClick={() => navigateTo('product', listing.slug)}
                        className="mt-1 font-mono text-[10px] text-indigo-600 hover:underline"
                      >
                        /product/{listing.slug}
                      </button>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs text-slate-600">
                  {categories.find((category) => category.id === listing.categoryId)?.name || 'Inconnu'}
                </td>
                {userRole === UserRole.ADMIN && (
                  <td className="px-6 py-4 text-xs text-slate-600">
                    {listing.source ? (
                      <a href={listing.source} target="_blank" rel="noreferrer" className="font-semibold text-indigo-600 hover:underline">
                        Ouvrir
                      </a>
                    ) : (
                      <span className="text-slate-400">Aucune</span>
                    )}
                  </td>
                )}
                <td className="px-6 py-4 text-sm font-bold text-slate-900">
                  {hasListingDiscount(listing) && <div className="text-[10px] font-medium text-slate-400 line-through">{listing.price.toFixed(2)} TND</div>}
                  <div>{getListingFinalPrice(listing).toFixed(2)} TND</div>
                  {hasListingDiscount(listing) && <div className="text-[10px] font-bold text-rose-600">{getListingDiscountLabel(listing)}</div>}
                </td>
                <td className="px-6 py-4">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${getListingStateClasses(listing)}`}>
                    {listing.isArchived ? 'ARCHIVE' : listing.stock > 0 ? 'EN STOCK' : 'RUPTURE'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${listing.isInstant ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                      {listing.isInstant ? 'INSTANT' : 'MANUEL'}
                    </span>
                    {listing.isPackage && (
                      <span className="rounded bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">PACKAGE</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex space-x-2">
                    <button onClick={() => onEditListing(listing)} className="text-slate-400 hover:text-indigo-600">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => onDeleteListing(listing)} className="text-slate-400 hover:text-red-500">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

export default AdminListingsSection;
