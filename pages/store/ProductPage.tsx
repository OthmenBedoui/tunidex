import React, { useEffect, useState } from 'react';
import { ChevronRight, ExternalLink, MessageCircle } from 'lucide-react';
import ProductDescriptionCard from '../../components/store-client/ProductDescriptionCard';
import ProductInfoModal from '../../components/store-client/ProductInfoModal';
import ProductPriceCard from '../../components/store-client/ProductPriceCard';
import ProductSystemRequirements from '../../components/store-client/ProductSystemRequirements';
import ProductVariations from '../../components/store-client/ProductVariations';
import ProductBreadcrumb from '../../components/store-client/product/ProductBreadcrumb';
import ProductHero from '../../components/store-client/product/ProductHero';
import ProductInfoHighlights from '../../components/store-client/product/ProductInfoHighlights';
import ProductStickyMobileBar from '../../components/store-client/product/ProductStickyMobileBar';
import ProductReviewsSection from '../../components/store-client/reviews/ProductReviewsSection';
import { ProductInfoAction, StoreProductPageProps } from '../../components/store-client/product/types';
import { ProductVariant, Review, ReviewSummary } from '../../types';
import { api } from '../../services/api';
import { getListingFinalPrice } from '../../utils/pricing';
import { buildStoreWhatsappUrl } from '../../utils/whatsapp';

type ModalState = { title: string; content: string } | null;

const ProductPage: React.FC<StoreProductPageProps> = ({
  product,
  categories,
  selectedVariantId,
  onSelectVariant,
  onAddToCart,
  onBuyNow,
  navigateTo,
  siteConfig
}) => {
  const [modal, setModal] = useState<ModalState>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary>({
    average: product.ratingAverage || 0,
    count: product.ratingCount || 0
  });
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const variants = product.variants || [];
  const selectedVariant: ProductVariant | undefined = variants.find((variant) => variant.id === selectedVariantId);
  const mobilePrice = selectedVariant?.price ?? getListingFinalPrice(product);
  const category = product.category || categories.find((item) => item.id === product.categoryId);
  const platform = product.platform || product.game || 'Digital';
  const region = product.region || 'Global';
  const activationCountry = product.activationCountry || 'Tunisia';
  const systemLabel = product.systemRequirementsPlatform || product.platform || 'Windows';
  const isGlobalRegion = ['global', 'globale', 'worldwide'].includes(region.trim().toLowerCase());
  const descriptionTags = [category?.name, product.game, platform]
    .filter((tag, index, items): tag is string => Boolean(tag) && items.indexOf(tag) === index)
    .slice(0, 3);
  const productWhatsappLink = buildStoreWhatsappUrl(
    siteConfig,
    `Bonjour TuniBots, j'ai une question sur le produit ${product.title}.`
  );
  const restrictionsContent =
    product.restrictionsContent ||
    (isGlobalRegion
      ? `<p><strong>${activationCountry}</strong> est compatible avec cette offre. Ce produit est disponible en région globale.</p>`
      : `<p>Cette offre est limitée à la région <strong>${region}</strong>.</p>`);
  const infoButtons: ProductInfoAction[] = [
    {
      label: product.restrictionsTitle || 'Check Restrictions',
      title: product.restrictionsTitle || 'Check Restrictions',
      content: restrictionsContent
    },
    {
      label: product.activationGuideTitle || 'Activation Guide',
      title: product.activationGuideTitle || 'Activation Guide',
      content: product.activationGuideContent || '<p>No activation guide has been added for this product.</p>'
    },
    {
      label: product.regionTitle || 'Region',
      title: product.regionTitle || 'Region',
      content: product.regionContent || `<p>Region: ${region}</p>`
    }
  ];

  useEffect(() => {
    let cancelled = false;
    setReviewsLoading(true);

    void api.getListingReviews(product.id, { limit: 10 }).then((response) => {
      if (cancelled) return;
      setReviews(response.items);
      setReviewSummary(response.summary);
    }).catch(() => {
      if (cancelled) return;
      setReviews([]);
      setReviewSummary({
        average: product.ratingAverage || 0,
        count: product.ratingCount || 0
      });
    }).finally(() => {
      if (!cancelled) setReviewsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [product.id, product.ratingAverage, product.ratingCount]);

  useEffect(() => {
    const scriptId = `aggregate-rating-${product.id}`;
    const existing = document.getElementById(scriptId);
    if (existing) existing.remove();

    if ((reviewSummary.count || 0) <= 0) return;

    const script = document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      image: product.imageUrl ? [product.imageUrl] : [],
      description: product.description,
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: reviewSummary.average.toFixed(1),
        reviewCount: reviewSummary.count
      }
    });
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [product.id, product.title, product.imageUrl, product.description, reviewSummary.average, reviewSummary.count]);

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 bg-[var(--surface-page)] px-4 py-6 pb-28 text-[var(--text-strong)] md:px-6 lg:pb-8">
      {modal && <ProductInfoModal title={modal.title} content={modal.content} onClose={() => setModal(null)} />}
      <div className="mx-auto max-w-[1520px]">
        <ProductBreadcrumb product={product} category={category} navigateTo={navigateTo} />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_345px]">
          <div className="min-w-0">
            <ProductHero product={product} category={category} />

            <ProductInfoHighlights
              activationCountry={activationCountry}
              region={region}
              platform={platform}
              systemLabel={systemLabel}
              infoButtons={infoButtons}
              onOpenInfo={setModal}
            />

            <div className="mt-8 flex flex-col gap-4 border-t border-[var(--border-soft)] pt-6 sm:flex-row sm:items-center">
              <label className="text-base font-black text-[var(--text-strong)]">Region</label>
              <div className="flex h-11 w-full items-center justify-between rounded-lg border border-[var(--border-soft)] bg-[var(--surface-card)] px-4 text-sm font-black text-[var(--text-strong)] sm:w-[235px]">
                {region}
                <ChevronRight size={16} className="rotate-90 text-[var(--text-muted)]" />
              </div>
            </div>

            {productWhatsappLink && (
              <div className="mt-5">
                <a
                  href={productWhatsappLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-black text-emerald-800 transition hover:bg-emerald-100"
                >
                  <MessageCircle size={16} />
                  Question sur ce produit ?
                  <ExternalLink size={15} />
                </a>
              </div>
            )}

            <div className="mt-6 flex items-center justify-between border-t border-[var(--border-soft)] pt-5">
              <div />
              {variants.length > 0 && (
                <a href="#product-variations" className="text-sm font-bold text-blue-500 hover:text-blue-400">
                  All Variations
                </a>
              )}
            </div>

            <ProductVariations variants={variants} selectedVariantId={selectedVariantId} onSelect={onSelectVariant} />
            <ProductDescriptionCard title={product.title} description={product.description} tags={descriptionTags} />
            <ProductSystemRequirements product={product} />
            <ProductReviewsSection reviews={reviews} summary={reviewSummary} isLoading={reviewsLoading} />
          </div>

          <ProductPriceCard
            product={product}
            selectedVariant={selectedVariant}
            offerCount={variants.length}
            onAddToCart={onAddToCart}
            onBuyNow={onBuyNow}
          />
        </div>
      </div>

      <ProductStickyMobileBar price={mobilePrice} onAddToCart={onAddToCart} onBuyNow={onBuyNow} />
    </div>
  );
};

export default ProductPage;
