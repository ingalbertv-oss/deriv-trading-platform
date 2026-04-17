import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.APP_ENV || 'development',
  appUrl: process.env.APP_URL || 'http://localhost:3001',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  port: parseInt(process.env.BACKEND_PORT || '3001', 10),

  database: {
    url: process.env.DATABASE_URL || '',
  },

  session: {
    secret: process.env.SESSION_SECRET || 'change-me',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },

  encryption: {
    key: process.env.ENCRYPTION_KEY || '',
  },

  deriv: {
    appId: process.env.DERIV_APP_ID || '',
    clientId: process.env.DERIV_CLIENT_ID || '',
    clientSecret: process.env.DERIV_CLIENT_SECRET || '',
    authBaseUrl: process.env.DERIV_AUTH_BASE_URL || 'https://oauth.deriv.com',
    apiBaseUrl: process.env.DERIV_API_BASE_URL || 'https://api.derivws.com',
    wsPublicUrl: process.env.DERIV_WS_PUBLIC_URL || 'wss://ws.derivws.com/websockets/v3',
    oauthRedirectUri: process.env.OAUTH_REDIRECT_URI || 'http://localhost:3001/api/auth/deriv/callback',
  },

  isProduction: process.env.APP_ENV === 'production',
  isDevelopment: process.env.APP_ENV !== 'production',
} as const;
