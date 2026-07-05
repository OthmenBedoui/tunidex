import React from 'react';
import { BadgeCheck, MessageSquare } from 'lucide-react';
import { Review, ReviewSummary } from '../../../types';
import StarRating from './StarRating';

interface ProductReviewsSectionProps {
  reviews: Review[];
  summary: ReviewSummary;
  isLoading?: boolean;
}

const ProductReviewsSection: React.FC<ProductReviewsSectionProps> = ({ reviews, summary, isLoading = false }) => (
  <section className="mt-8 rounded-[28px] border border-[var(--border-soft)] bg-[var(--surface-card)] p-6 shadow-sm">
    <div className="flex flex-col gap-4 border-b border-[var(--border-soft)] pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-amber-700">
          <MessageSquare size={14} />
          Avis clients
        </div>
        <h2 className="mt-4 text-2xl font-black text-[var(--text-strong)]">Retours vérifiés</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          Seuls les clients ayant reçu le produit peuvent laisser un avis.
        </p>
      </div>
      <div className="rounded-2xl border border-[var(--border-soft)] bg-slate-50 px-5 py-4">
        <div className="text-3xl font-black text-slate-900">{summary.average.toFixed(1)}</div>
        <div className="mt-1">
          <StarRating rating={Math.round(summary.average)} />
        </div>
        <div className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">{summary.count} avis publiés</div>
      </div>
    </div>

    <div className="mt-6 space-y-4">
      {isLoading && <div className="text-sm text-slate-500">Chargement des avis...</div>}
      {!isLoading && reviews.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
          Aucun avis publié pour ce produit pour le moment.
        </div>
      )}
      {reviews.map((review) => (
        <article key={review.id} className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="font-black text-slate-900">{review.user?.username || 'Client vérifié'}</div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-700">
                  <BadgeCheck size={12} />
                  Achat vérifié
                </span>
              </div>
              <div className="mt-2">
                <StarRating rating={review.rating} />
              </div>
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {new Date(review.createdAt).toLocaleDateString('fr-FR')}
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-slate-600">{review.comment}</p>
        </article>
      ))}
    </div>
  </section>
);

export default ProductReviewsSection;
