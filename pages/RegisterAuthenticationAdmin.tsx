import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Apple,
  CheckCircle2,
  Chrome,
  Facebook,
  Gamepad2,
  Github,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { api } from '../services/api';
import { AuthProviderConfig, AuthProviderField, AuthProviderKey } from '../types';
import { AdminErrorState, AdminPremiumLoader } from '../components/admin/AdminSurfaceState';
import { AdminPanelCard, AdminStickyActionBar } from '../components/admin/AdminWorkspace';
import { handleApiError } from '../utils/apiError';

interface RegisterAuthenticationAdminProps {
  navigateTo: (page: string, slug?: string) => void;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

type DraftState = Record<AuthProviderKey, Record<string, string>>;

const providerIcons: Record<AuthProviderKey, React.ComponentType<{ size?: string | number; className?: string }>> = {
  'email-password': Mail,
  google: Chrome,
  facebook: Facebook,
  apple: Apple,
  discord: Gamepad2,
  github: Github,
  microsoft: Settings2
};

const buildDrafts = (providers: AuthProviderConfig[]): DraftState => (
  providers.reduce((acc, provider) => {
    acc[provider.key] = provider.fields.reduce<Record<string, string>>((fieldAcc, field) => {
      fieldAcc[field.envName] = field.secret ? '' : field.displayValue;
      return fieldAcc;
    }, {});
    return acc;
  }, {} as DraftState)
);

const formatDateTime = (value?: string) => {
  if (!value) return 'Never updated';
  return new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getProviderHealthLabel = (provider: AuthProviderConfig) => {
  if (provider.enabled && provider.configured) return 'Ready for production';
  if (!provider.configured) return 'Credentials missing';
  if (!provider.enabled) return 'Configured but inactive';
  return 'Needs review';
};

const FieldEditor: React.FC<{
  field: AuthProviderField;
  providerKey: AuthProviderKey;
  draftValue: string;
  saving: boolean;
  onChange: (providerKey: AuthProviderKey, field: AuthProviderField, value: string) => void;
  onClear: () => void;
}> = ({ field, providerKey, draftValue, saving, onChange, onClear }) => {
  const isSecret = field.secret;
  const commonClassName =
    'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-950 focus:bg-white';

  return (
    <div className={`rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-5 ${field.multiline ? 'md:col-span-2' : ''}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <label className="text-sm font-black text-slate-800">{field.label}</label>
          <div className="mt-1 break-all text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{field.envName}</div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
          {field.required && <span className="rounded-full bg-red-50 px-2 py-1 text-red-600">Required</span>}
          {field.configured ? (
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">Configured</span>
          ) : (
            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-500">Empty</span>
          )}
        </div>
      </div>

      {field.kind === 'textarea' ? (
        <textarea
          value={draftValue}
          onChange={(event) => onChange(providerKey, field, event.target.value)}
          placeholder={isSecret ? field.maskedValue || 'Paste a new secret value' : field.displayValue || `Enter ${field.label.toLowerCase()}`}
          className={`${commonClassName} min-h-[160px]`}
        />
      ) : (
        <input
          type={isSecret ? 'password' : field.kind === 'url' ? 'url' : 'text'}
          value={draftValue}
          onChange={(event) => onChange(providerKey, field, event.target.value)}
          placeholder={isSecret ? field.maskedValue || 'Enter a new secret value' : `Enter ${field.label.toLowerCase()}`}
          className={commonClassName}
        />
      )}

      {field.description && <p className="mt-3 text-xs leading-6 text-slate-500">{field.description}</p>}
      {isSecret && field.maskedValue && <p className="mt-2 text-xs leading-6 text-slate-500">Stored secret: {field.maskedValue}</p>}
      {field.displayValue && !isSecret && <p className="mt-2 break-all text-xs leading-6 text-slate-500">Current value: {field.displayValue}</p>}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onClear}
          disabled={saving || !field.configured}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear stored value
        </button>
      </div>
    </div>
  );
};

const RegisterAuthenticationAdmin: React.FC<RegisterAuthenticationAdminProps> = ({ navigateTo, onNotify }) => {
  const [providers, setProviders] = useState<AuthProviderConfig[]>([]);
  const [drafts, setDrafts] = useState<DraftState>({} as DraftState);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingProvider, setSavingProvider] = useState<AuthProviderKey | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<AuthProviderKey>('email-password');

  const loadProviders = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const data = await api.getAuthProviders();
      setProviders(data);
      setDrafts(buildDrafts(data));
      if (!data.some((provider) => provider.key === selectedProvider) && data[0]) {
        setSelectedProvider(data[0].key);
      }
    } catch (error) {
      const message = handleApiError({
        error,
        fallbackMessage: 'Impossible de charger les fournisseurs d authentification.',
        notify: onNotify,
        logContext: 'Unable to load auth providers'
      });
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProviders();
  }, []);

  const selected = useMemo(
    () => providers.find((provider) => provider.key === selectedProvider) || providers[0],
    [providers, selectedProvider]
  );

  const summary = useMemo(() => {
    const active = providers.filter((provider) => provider.enabled).length;
    const configured = providers.filter((provider) => provider.configured).length;
    return { active, configured, total: providers.length };
  }, [providers]);

  const updateFieldDraft = (providerKey: AuthProviderKey, field: AuthProviderField, value: string) => {
    setDrafts((current) => ({
      ...current,
      [providerKey]: {
        ...(current[providerKey] || {}),
        [field.envName]: value
      }
    }));
  };

  const saveProvider = async (provider: AuthProviderConfig, enabled?: boolean) => {
    try {
      setSavingProvider(provider.key);
      const providerDraft = drafts[provider.key] || {};
      const updates = provider.fields.reduce<Record<string, string>>((acc, field) => {
        const nextValue = providerDraft[field.envName] ?? '';
        if (field.secret) {
          if (nextValue.trim().length > 0) acc[field.envName] = nextValue;
        } else {
          acc[field.envName] = nextValue;
        }
        return acc;
      }, {});

      const updated = await api.updateAuthProvider(provider.key, {
        enabled: typeof enabled === 'boolean' ? enabled : provider.enabled,
        updates
      });

      const nextProviders = providers.map((item) => (item.key === updated.key ? updated : item));
      setProviders(nextProviders);
      setDrafts(buildDrafts(nextProviders));
      onNotify(`${updated.name} saved successfully.`);
    } catch (error) {
      handleApiError({
        error,
        fallbackMessage: 'Impossible de sauvegarder ce provider.',
        notify: onNotify,
        logContext: `Unable to save provider ${provider.key}`
      });
    } finally {
      setSavingProvider(null);
    }
  };

  const clearField = async (provider: AuthProviderConfig, field: AuthProviderField) => {
    try {
      setSavingProvider(provider.key);
      const updated = await api.updateAuthProvider(provider.key, {
        enabled: provider.enabled,
        clearFields: [field.envName]
      });
      const nextProviders = providers.map((item) => (item.key === updated.key ? updated : item));
      setProviders(nextProviders);
      setDrafts(buildDrafts(nextProviders));
      onNotify(`${field.label} cleared for ${provider.name}.`);
    } catch (error) {
      handleApiError({
        error,
        fallbackMessage: 'Impossible d effacer cet identifiant.',
        notify: onNotify,
        logContext: `Unable to clear provider field ${field.envName}`
      });
    } finally {
      setSavingProvider(null);
    }
  };

  if (loading) {
    return (
      <AdminPremiumLoader
        siteName="Tunibots"
        title="Authentication control center"
        showSkeleton
      />
    );
  }

  if (loadError && providers.length === 0) {
    return (
      <AdminErrorState
        title="Impossible de charger les méthodes d’authentification"
        message={loadError}
        onRetry={() => void loadProviders()}
        onBack={() => navigateTo('admin-dashboard')}
      />
    );
  }

  if (!selected) {
    return (
      <AdminErrorState
        title="Aucun provider disponible"
        message="Le dashboard n’a reçu aucune méthode d’authentification à afficher. Recharge la page ou retourne au dashboard."
        onRetry={() => void loadProviders()}
        onBack={() => navigateTo('admin-dashboard')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="bg-[radial-gradient(circle_at_top_left,rgba(15,23,42,0.96),rgba(15,23,42,0.88)_34%,rgba(30,41,59,0.9)_60%,rgba(203,213,225,0.3)_100%),linear-gradient(135deg,rgba(249,250,251,0.85),rgba(241,245,249,0.72))] p-6 text-white sm:p-8 lg:p-10">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.28em] text-white/85">
                <ShieldCheck size={14} />
                Register & Authentication
              </div>
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                <button type="button" onClick={() => navigateTo('admin-dashboard')} className="text-left text-slate-200 transition hover:text-white">
                  Dashboard
                </button>
                <span className="text-slate-500">/</span>
                <span className="text-white">Register & Authentication</span>
              </div>
              <h1 className="text-3xl font-black leading-tight sm:text-4xl">Authentication providers console</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
                Configure email login and social providers in a layout that stays readable, functional, and fully compatible with the admin dashboard shell.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigateTo('admin-dashboard')}
                className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/15"
              >
                Retour au dashboard
              </button>
              <button
                type="button"
                onClick={() => void loadProviders()}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 hover:bg-slate-100"
              >
                <RefreshCw size={16} />
                Synchroniser l'environnement
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        {[
          { label: 'Active providers', value: summary.active, icon: CheckCircle2 },
          { label: 'Configured environments', value: summary.configured, icon: KeyRound },
          { label: 'Available methods', value: summary.total, icon: Sparkles }
        ].map((item) => (
          <article key={item.label} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">{item.label}</div>
                <div className="mt-3 text-3xl font-black text-slate-950">{item.value}</div>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl theme-bg-soft theme-text-accent">
                <item.icon size={26} />
              </div>
            </div>
          </article>
        ))}
      </section>

      <div className="grid gap-6 2xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-6 2xl:sticky 2xl:top-28 2xl:self-start">
          <AdminPanelCard title="Méthodes d'authentification" description="Choisis un provider pour éditer ses réglages.">
            <div className="space-y-3">
              {providers.map((provider) => {
                const Icon = providerIcons[provider.key];
                const isSelected = selected?.key === provider.key;

                return (
                  <button
                    key={provider.key}
                    type="button"
                    onClick={() => setSelectedProvider(provider.key)}
                    className={`w-full rounded-3xl border p-4 text-left transition ${
                      isSelected ? 'border-slate-950 bg-slate-950 text-white shadow-xl' : 'border-slate-200 bg-slate-50 text-slate-900 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${isSelected ? 'bg-white/10 text-white' : 'bg-white text-slate-950 shadow-sm'}`}>
                        <Icon size={24} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className={`text-base font-black ${isSelected ? 'text-white' : 'text-slate-950'}`}>{provider.name}</div>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${provider.enabled ? (isSelected ? 'bg-emerald-400/20 text-emerald-200' : 'bg-emerald-50 text-emerald-700') : (isSelected ? 'bg-white/10 text-slate-200' : 'bg-slate-200 text-slate-600')}`}>
                            {provider.enabled ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className={`mt-2 text-sm leading-6 ${isSelected ? 'text-slate-300' : 'text-slate-600'}`}>{provider.description}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${provider.configured ? (isSelected ? 'bg-cyan-400/20 text-cyan-200' : 'bg-cyan-50 text-cyan-700') : (isSelected ? 'bg-amber-400/20 text-amber-100' : 'bg-amber-50 text-amber-700')}`}>
                            {provider.configured ? 'Configured' : 'Missing credentials'}
                          </span>
                          <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${provider.supported ? (isSelected ? 'bg-violet-400/20 text-violet-100' : 'bg-violet-50 text-violet-700') : (isSelected ? 'bg-white/10 text-slate-200' : 'bg-slate-200 text-slate-600')}`}>
                            {provider.supported ? 'Live flow' : 'Config only'}
                          </span>
                        </div>
                        <div className={`mt-3 text-[11px] font-bold uppercase tracking-[0.18em] ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>
                          Last updated: {formatDateTime(provider.lastUpdatedAt)}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </AdminPanelCard>
        </div>

        {selected && (
          <div className="space-y-6">
            <AdminPanelCard
              title={selected.name}
              description="Vue d’ensemble du provider sélectionné avec son état réel et ses indicateurs de configuration."
              action={
                <button
                  type="button"
                  onClick={() => void saveProvider(selected, !selected.enabled)}
                  disabled={savingProvider === selected.key}
                  className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black ${
                    selected.enabled ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-950 text-white hover:bg-slate-800'
                  } disabled:cursor-not-allowed disabled:opacity-70`}
                >
                  {selected.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  {selected.enabled ? 'Disable provider' : 'Enable provider'}
                </button>
              }
            >
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-sm">
                      {(() => {
                        const ProviderIcon = providerIcons[selected.key];
                        return <ProviderIcon size={26} />;
                      })()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Provider health</div>
                      <div className="mt-2 text-2xl font-black text-slate-950">{getProviderHealthLabel(selected)}</div>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        Cette zone résume l’état réel du provider avant que tu commences l’édition des champs.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-950 p-5 text-white">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Quick summary</div>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-400">Fields</span>
                      <span className="font-black">{selected.fields.length}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-400">Required</span>
                      <span className="font-black">{selected.fields.filter((field) => field.required).length}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-400">Configured</span>
                      <span className="font-black">{selected.fields.filter((field) => field.configured).length}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-400">Secrets</span>
                      <span className="font-black">{selected.fields.filter((field) => field.secret).length}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Status</div>
                  <div className="mt-2 text-lg font-black text-slate-950">{selected.enabled ? 'Active' : 'Inactive'}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Environment</div>
                  <div className={`mt-2 text-lg font-black ${selected.configured ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {selected.configured ? 'Configured' : 'Missing credentials'}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Last updated</div>
                  <div className="mt-2 text-lg font-black text-slate-950">{formatDateTime(selected.lastUpdatedAt)}</div>
                </div>
              </div>
            </AdminPanelCard>

            {!selected.supported && selected.key !== 'email-password' && (
              <AdminPanelCard className="border-slate-200 bg-slate-50">
                <div className="flex items-start gap-3 text-sm text-slate-700">
                  <AlertTriangle size={20} className="mt-0.5 shrink-0" />
                  <div>
                    This provider can be stored in the admin environment now, but only Google and Apple are wired to a live OAuth customer flow at the moment.
                  </div>
                </div>
              </AdminPanelCard>
            )}

            {!selected.configured && (
              <AdminPanelCard className="border-amber-200 bg-amber-50">
                <div className="flex items-start gap-3 text-sm text-amber-900">
                  <AlertTriangle size={20} className="mt-0.5 shrink-0" />
                  <div>
                    Required credentials are still missing for this provider. Save the missing values below to move the environment to a configured state.
                  </div>
                </div>
              </AdminPanelCard>
            )}

            <AdminPanelCard
              title="Environment-backed settings"
              description="Tous les champs restent présents, mais sont reconstruits dans une structure plus claire, plus large et plus fonctionnelle."
              action={
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Synced with `.env`
                </div>
              }
            >
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
                <div className="grid gap-5 md:grid-cols-2">
                  {selected.fields.map((field) => (
                    <FieldEditor
                      key={field.envName}
                      field={field}
                      providerKey={selected.key}
                      draftValue={drafts[selected.key]?.[field.envName] ?? ''}
                      saving={savingProvider === selected.key}
                      onChange={updateFieldDraft}
                      onClear={() => void clearField(selected, field)}
                    />
                  ))}
                </div>

                <div className="space-y-4 xl:sticky xl:top-28 xl:self-start">
                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-950 p-5 text-white">
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Checklist</div>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        Fill the <span className="font-black">required fields</span> first.
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        Save the provider before switching to another one.
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        Enable the provider only when the environment is configured.
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Current provider</div>
                    <div className="mt-3 text-lg font-black text-slate-950">{selected.name}</div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{selected.description}</p>
                  </div>
                </div>
              </div>

              <AdminStickyActionBar
                note="Les actions restent visibles même si le provider contient beaucoup de champs."
                actions={
                  <>
                    <button
                      type="button"
                      onClick={() => navigateTo('admin-dashboard')}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Retour
                    </button>
                    <button
                      type="button"
                      onClick={() => setDrafts(buildDrafts(providers))}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Reset form
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveProvider(selected)}
                      disabled={savingProvider === selected.key}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {savingProvider === selected.key ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                      Save provider
                    </button>
                  </>
                }
              />
            </AdminPanelCard>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegisterAuthenticationAdmin;
