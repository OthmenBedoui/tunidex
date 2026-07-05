import React from 'react';
import { SiteConfig } from '../types';
import StaticRichContentPage from './store/static/StaticRichContentPage';

const RefundPolicyPage: React.FC<{ siteConfig: SiteConfig }> = ({ siteConfig }) => (
  <StaticRichContentPage
    eyebrow="Remboursement"
    title={siteConfig.refundPageTitle || 'Politique de remboursement'}
    intro="Notre politique explique les cas pouvant donner lieu a un examen de remboursement pour les produits digitaux."
    content={siteConfig.refundPageContent || ''}
    siteConfig={siteConfig}
  />
);

export default RefundPolicyPage;
