import dotenv from 'dotenv';

dotenv.config({ quiet: true });

type NodeEnv = 'development' | 'test' | 'production';

const readEnv = (name: string) => {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
};

const requireString = (name: string, options?: { minLength?: number; message?: string }) => {
  const value = readEnv(name);
  if (!value) {
    throw new Error(options?.message || `Missing required environment variable: ${name}.`);
  }
  if (options?.minLength && value.length < options.minLength) {
    throw new Error(options.message || `Environment variable ${name} must be at least ${options.minLength} characters long.`);
  }
  return value;
};

const optionalString = (name: string) => {
  const value = readEnv(name);
  return value || undefined;
};

const parseLogLevel = () => {
  const raw = optionalString('LOG_LEVEL');
  return raw || 'info';
};

const parseAllowedOrigins = () => {
  const raw = optionalString('ALLOWED_ORIGINS');
  const values = raw
    ? raw.split(',').map((origin) => origin.trim()).filter(Boolean)
    : [];

  if (nodeEnv !== 'production') {
    values.push(
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173'
    );
  }

  return Array.from(new Set(values));
};

const parsePort = () => {
  const raw = readEnv('PORT');
  if (!raw) return 3000;
  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('Environment variable PORT must be a valid TCP port number.');
  }
  return port;
};

const parseNodeEnv = (): NodeEnv => {
  const raw = readEnv('NODE_ENV');
  if (!raw) return 'development';
  if (raw === 'development' || raw === 'test' || raw === 'production') {
    return raw;
  }
  throw new Error('Environment variable NODE_ENV must be one of: development, test, production.');
};

const ensureCredentialPair = (emailName: string, passwordName: string) => {
  const email = optionalString(emailName);
  const password = optionalString(passwordName);

  if ((email && !password) || (!email && password)) {
    throw new Error(`Environment variables ${emailName} and ${passwordName} must either both be set or both be omitted.`);
  }

  return { email, password };
};

const nodeEnv = parseNodeEnv();
const jwtSecret = requireString('JWT_SECRET', {
  minLength: 32,
  message: 'JWT_SECRET is required and must contain at least 32 characters. Refusing to start with a weak signing secret.'
});
const authSecret = optionalString('AUTH_SECRET') || jwtSecret;

if (authSecret.length < 32) {
  throw new Error('AUTH_SECRET must contain at least 32 characters when provided.');
}

const defaultAdmin = ensureCredentialPair('DEFAULT_ADMIN_EMAIL', 'DEFAULT_ADMIN_PASSWORD');
const defaultAgent = ensureCredentialPair('DEFAULT_AGENT_EMAIL', 'DEFAULT_AGENT_PASSWORD');

export const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: parsePort(),
  databaseUrl: requireString('DATABASE_URL', {
    message: 'DATABASE_URL is required to connect Prisma to PostgreSQL.'
  }),
  jwtSecret,
  authSecret,
  authUrl: optionalString('AUTH_URL') || 'http://localhost:3000',
  uploadsDir: optionalString('UPLOADS_DIR') || '/data/uploads',
  sentryDsn: optionalString('SENTRY_DSN'),
  logLevel: parseLogLevel(),
  allowedOrigins: parseAllowedOrigins(),
  apiKey: optionalString('API_KEY'),
  deliveryEncryptionKey: optionalString('DELIVERY_ENCRYPTION_KEY') || jwtSecret,
  defaultAdminEmail: defaultAdmin.email,
  defaultAdminPassword: defaultAdmin.password,
  defaultAgentEmail: defaultAgent.email,
  defaultAgentPassword: defaultAgent.password,
  whatsappBotWebhookUrl: optionalString('WHATSAPP_BOT_WEBHOOK_URL'),
  whatsappBotWebhookToken: optionalString('WHATSAPP_BOT_WEBHOOK_TOKEN'),
  smtpHost: optionalString('SMTP_HOST'),
  smtpPort: optionalString('SMTP_PORT'),
  smtpSecure: (optionalString('SMTP_SECURE') || '').toLowerCase() === 'true',
  smtpUser: optionalString('SMTP_USER'),
  smtpPass: optionalString('SMTP_PASS'),
  smtpFrom: optionalString('SMTP_FROM'),
  googleClientId: optionalString('GOOGLE_CLIENT_ID'),
  googleClientSecret: optionalString('GOOGLE_CLIENT_SECRET'),
  googleRedirectUri: optionalString('GOOGLE_REDIRECT_URI'),
  googleCallbackUrl: optionalString('GOOGLE_CALLBACK_URL'),
  googleScopes: optionalString('GOOGLE_SCOPES'),
  facebookAppId: optionalString('FACEBOOK_APP_ID'),
  facebookAppSecret: optionalString('FACEBOOK_APP_SECRET'),
  facebookRedirectUri: optionalString('FACEBOOK_REDIRECT_URI'),
  facebookCallbackUrl: optionalString('FACEBOOK_CALLBACK_URL'),
  facebookScopes: optionalString('FACEBOOK_SCOPES'),
  appleClientId: optionalString('APPLE_CLIENT_ID'),
  appleTeamId: optionalString('APPLE_TEAM_ID'),
  appleKeyId: optionalString('APPLE_KEY_ID'),
  applePrivateKey: optionalString('APPLE_PRIVATE_KEY'),
  appleRedirectUri: optionalString('APPLE_REDIRECT_URI'),
  appleCallbackUrl: optionalString('APPLE_CALLBACK_URL'),
  appleScopes: optionalString('APPLE_SCOPES'),
  discordClientId: optionalString('DISCORD_CLIENT_ID'),
  discordClientSecret: optionalString('DISCORD_CLIENT_SECRET'),
  discordRedirectUri: optionalString('DISCORD_REDIRECT_URI'),
  discordCallbackUrl: optionalString('DISCORD_CALLBACK_URL'),
  discordScopes: optionalString('DISCORD_SCOPES'),
  githubClientId: optionalString('GITHUB_CLIENT_ID'),
  githubClientSecret: optionalString('GITHUB_CLIENT_SECRET'),
  githubRedirectUri: optionalString('GITHUB_REDIRECT_URI'),
  githubCallbackUrl: optionalString('GITHUB_CALLBACK_URL'),
  githubScopes: optionalString('GITHUB_SCOPES'),
  microsoftClientId: optionalString('MICROSOFT_CLIENT_ID'),
  microsoftClientSecret: optionalString('MICROSOFT_CLIENT_SECRET'),
  microsoftRedirectUri: optionalString('MICROSOFT_REDIRECT_URI'),
  microsoftCallbackUrl: optionalString('MICROSOFT_CALLBACK_URL'),
  microsoftScopes: optionalString('MICROSOFT_SCOPES')
} as const;

export default env;
