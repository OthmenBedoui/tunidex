import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Search, Star, X } from 'lucide-react';
import AdminTablePagination from '../../../components/admin/AdminTablePagination';
import { AdminEmptyState } from '../../../components/admin/AdminWorkspace';
import { api } from '../../../services/api';
import { Review } from '../../../types';
import { queryKeys } from '../../../src/queryKeys';
import { handleApiError } from '../../../utils/apiError';

const renderStars = (rating: number) => (
  <div className="flex items-center gap-1 text-amber-400">
    {Array.from({ length: 5 }).map((_, index) => (
      <Star key={index} size={14} fill={index < rating ? 'currentColor' : 'none'} />
    ))}
  </div>
);

const AdminReviewsSection: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [localSearch, setLocalSearch] = useState('');

  const reviewsQuery = useQuery({
    queryKey: queryKeys.reviews.pending({ page, limit }),
    queryFn: () => api.getPendingReviews({ page, limit })
  });

  useEffect(() => {
    if (reviewsQuery.error) {
      handleApiError({
        error: reviewsQuery.error,
        fallbackMessage: 'Impossible de charger les avis en attente.',
        logContext: 'Unable to load pending reviews'
      });
    }
  }, [reviewsQuery.error]);

  const moderateMutation = useMutation({
    mutationFn: ({ reviewId, status }: { reviewId: string; status: 'APPROVED' | 'REJECTED' }) => api.moderateReview(reviewId, status),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.reviews.pending({ page, limit }) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.productsCatalog }),
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.my })
      ]);
    }
  });

  const reviews = (reviewsQuery.data?.items || []).filter((review) => {
    const haystack = `${review.listing?.title || ''} ${review.user?.username || ''} ${review.order?.orderNumber || ''} ${review.comment}`.toLowerCase();
    return haystack.includes(localSearch.trim().toLowerCase());
  });

  const total = reviewsQuery.data?.total || 0;

  const handleModeration = async (review: Review, status: 'APPROVED' | 'REJECTED') => {
    try {
      await moderateMutation.mutateAsync({ reviewId: review.id, status });
    } catch (error) {
      handleApiError({
        error,
        fallbackMessage: `Impossible de ${status === 'APPROVED' ? 'valider' : 'rejeter'} cet avis.`,
        logContext: 'Unable to moderate review'
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-amber-700">
              <Star size={14} />
              Modération
            </div>
            <h2 className="mt-4 text-3xl font-black text-slate-950">Avis en attente</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Vérifiez les avis clients avant publication. Seuls les achats livrés peuvent soumettre un avis.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">À modérer</div>
            <div className="mt-2 text-3xl font-black text-slate-900">{total}</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
          <input
            value={localSearch}
            onChange={(event) => setLocalSearch(event.target.value)}
            placeholder="Rechercher par produit, client, numéro de commande ou commentaire..."
            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-medium outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-indigo-700">
                    {review.order?.orderNumber || 'Commande'}
                  </span>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
                    En attente
                  </span>
                  {renderStars(review.rating)}
                </div>
                <div className="mt-3 text-lg font-black text-slate-900">{review.listing?.title || 'Produit'}</div>
                <div className="mt-1 text-sm text-slate-500">
                  {review.user?.username || 'Client'} · {new Date(review.createdAt).toLocaleString('fr-FR')}
                </div>
                <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                  {review.comment}
                </div>
              </div>
              <div className="grid gap-2 lg:w-[180px]">
                <button
                  type="button"
                  onClick={() => void handleModeration(review, 'APPROVED')}
                  disabled={moderateMutation.isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black uppercase tracking-wider text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  <Check size={14} />
                  Approuver
                </button>
                <button
                  type="button"
                  onClick={() => void handleModeration(review, 'REJECTED')}
                  disabled={moderateMutation.isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-xs font-black uppercase tracking-wider text-red-700 hover:bg-red-100 disabled:opacity-60"
                >
                  <X size={14} />
                  Rejeter
                </button>
              </div>
            </div>
          </div>
        ))}

        {!reviewsQuery.isLoading && reviews.length === 0 && (
          <AdminEmptyState
            title="Aucun avis à modérer"
            description="Les nouveaux avis clients apparaîtront ici avant publication."
          />
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <AdminTablePagination
            page={page}
            limit={limit}
            total={total}
            onPageChange={setPage}
            onLimitChange={(nextLimit) => {
              setLimit(nextLimit);
              setPage(1);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminReviewsSection;
