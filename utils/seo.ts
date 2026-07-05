export const upsertMetaTag = (selector: string, attrs: Record<string, string>) => {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }
  Object.entries(attrs).forEach(([key, value]) => element?.setAttribute(key, value));
};

export const ensureCanonicalLink = (href: string) => {
  let link: HTMLLinkElement | null = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = href;
};

export const upsertJsonLdScript = (id: string, payload: Record<string, unknown>) => {
  const existing = document.getElementById(id);
  if (existing) existing.remove();

  const script = document.createElement('script');
  script.id = id;
  script.type = 'application/ld+json';
  script.text = JSON.stringify(payload);
  document.head.appendChild(script);

  return () => {
    script.remove();
  };
};
