export type RuntimeConfig = {
  sentryDsn: string;
};

const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  sentryDsn: ''
};

export const loadRuntimeConfig = async (): Promise<RuntimeConfig> => {
  try {
    const response = await fetch('/api/runtime-config', {
      credentials: 'same-origin'
    });

    if (!response.ok) {
      return DEFAULT_RUNTIME_CONFIG;
    }

    const data = await response.json() as Partial<RuntimeConfig>;
    return {
      sentryDsn: data.sentryDsn || ''
    };
  } catch {
    return DEFAULT_RUNTIME_CONFIG;
  }
};
