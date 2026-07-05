import React from 'react';
import { SiteConfig } from '../types';
import StaticRichContentPage from './store/static/StaticRichContentPage';

const CgvPage: React.FC<{ siteConfig: SiteConfig }> = ({ siteConfig }) => (
  <StaticRichContentPage
    eyebrow="CGV"
    title={siteConfig.cgvPageTitle || 'Conditions generales de vente'}
    intro="Toutes les informations utiles sur les commandes, la verification de paiement, la livraison digitale et le support."
    content={siteConfig.cgvPageContent || ''}
    siteConfig={siteConfig}
  />
);

export default CgvPage;
