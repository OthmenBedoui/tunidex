import { Request, Response } from 'express';
import { getAuthProviderDefinition, readEnvValues, writeEnvValues, maskSecret, AUTH_PROVIDER_DEFINITIONS, isSupportedPublicAuthProvider } from '../utils/authProviders.js';
import { readSiteConfig, writeSiteConfig } from '../services/siteConfigService.js';

type AuthProviderMetadata = {
  enabled: boolean;
  lastUpdatedAt?: string;
};

const buildProviderResponse = async () => {
  const [siteConfig, envValues] = await Promise.all([readSiteConfig(), readEnvValues()]);
  const metadata = siteConfig.authProviders || {};

  return AUTH_PROVIDER_DEFINITIONS.map((provider) => {
    const providerMeta = metadata[provider.key] as AuthProviderMetadata | undefined;
    const fields = provider.fields.map((field) => {
      const value = envValues[field.envName] || '';
      const configured = value.trim().length > 0;
      return {
        key: field.key,
        envName: field.envName,
        label: field.label,
        description: field.description,
        value: field.secret ? '' : value,
        displayValue: field.secret ? '' : value,
        maskedValue: field.secret && value ? maskSecret(value) : undefined,
        required: field.required,
        secret: field.secret,
        multiline: field.multiline,
        kind: field.kind,
        configured
      };
    });

    const requiredFields = provider.fields.filter((field) => field.required);
    const configured = requiredFields.length > 0
      ? requiredFields.every((field) => (envValues[field.envName] || '').trim().length > 0)
      : provider.fields.some((field) => (envValues[field.envName] || '').trim().length > 0);

    const enabled = providerMeta?.enabled ?? false;

    return {
      key: provider.key,
      name: provider.name,
      description: provider.description,
      supported: provider.key === 'email-password' || isSupportedPublicAuthProvider(provider.key),
      enabled,
      status: enabled ? 'ACTIVE' : 'INACTIVE',
      configured,
      environmentStatus: configured ? 'CONFIGURED' : 'MISSING_CREDENTIALS',
      lastUpdatedAt: providerMeta?.lastUpdatedAt,
      fields
    };
  });
};

export const getAuthProviders = async (_req: Request, res: Response) => {
  res.json(await buildProviderResponse());
};

export const getPublicAuthProviders = async (_req: Request, res: Response) => {
  const providers = await buildProviderResponse();
  res.json(
    providers
      .filter((provider) => provider.enabled && provider.configured && provider.key !== 'email-password')
      .filter((provider) => provider.supported)
      .map((provider) => ({
        key: provider.key,
        name: provider.name,
        description: provider.description,
        authUrl: `/api/auth/oauth/${provider.key}/start`
      }))
  );
};

export const updateAuthProvider = async (req: Request, res: Response) => {
  const provider = getAuthProviderDefinition(req.params.providerKey);
  if (!provider) {
    return res.status(404).json({ error: 'Provider not found.' });
  }

  const allowedEnvNames = new Set(provider.fields.map((field) => field.envName));
  const updatesInput = typeof req.body?.updates === 'object' && req.body?.updates ? req.body.updates as Record<string, string> : {};
  const clearFields = Array.isArray(req.body?.clearFields)
    ? req.body.clearFields.filter((field: unknown): field is string => typeof field === 'string' && allowedEnvNames.has(field))
    : [];

  const updates = Object.fromEntries(
    Object.entries(updatesInput)
      .filter(([envName]) => allowedEnvNames.has(envName))
      .map(([envName, value]) => [envName, typeof value === 'string' ? value : String(value ?? '')])
  );

  await writeEnvValues(updates, clearFields);
  const nextEnabled = typeof req.body?.enabled === 'boolean'
    ? req.body.enabled
    : Boolean((await readSiteConfig()).authProviders?.[provider.key]?.enabled);

  const envValues = await readEnvValues();
  const mergedEnvValues = { ...envValues, ...updates };
  clearFields.forEach((field) => {
    mergedEnvValues[field] = '';
  });
  const requiredFields = provider.fields.filter((field) => field.required);
  const isConfigured = requiredFields.length > 0
    ? requiredFields.every((field) => (mergedEnvValues[field.envName] || '').trim().length > 0)
    : provider.fields.some((field) => (mergedEnvValues[field.envName] || '').trim().length > 0);

  if (nextEnabled && provider.key !== 'email-password' && !isSupportedPublicAuthProvider(provider.key)) {
    return res.status(400).json({ error: `${provider.name} is not wired to a live OAuth flow yet.` });
  }

  if (nextEnabled && !isConfigured) {
    return res.status(400).json({ error: `Complete all required ${provider.name} credentials before enabling this provider.` });
  }

  const siteConfig = await readSiteConfig();
  const authProviders = {
    ...(siteConfig.authProviders || {}),
    [provider.key]: {
      enabled: nextEnabled,
      lastUpdatedAt: new Date().toISOString()
    }
  };

  await writeSiteConfig({
    ...siteConfig,
    authProviders
  });

  const providers = await buildProviderResponse();
  const updated = providers.find((item) => item.key === provider.key);
  return res.json(updated);
};
