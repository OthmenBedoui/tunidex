import React from 'react';
import { SiteConfig } from '../types';
import StaticRichContentPage from './store/static/StaticRichContentPage';

const HowItWorksPage: React.FC<{ siteConfig: SiteConfig }> = ({ siteConfig }) => (
  <StaticRichContentPage
    eyebrow="Guide"
    title={siteConfig.howItWorksPageTitle || 'Comment ca marche'}
    intro="Un parcours simple pour commander, payer, envoyer votre preuve et recevoir votre livraison digitale."
    content={siteConfig.howItWorksPageContent || ''}
    siteConfig={siteConfig}
  />
);

export default HowItWorksPage;
