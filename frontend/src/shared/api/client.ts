import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { clientLogger, createRequestId } from '../logger';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

type LoggedRequestConfig = InternalAxiosRequestConfig & {
  _requestStartedAt?: number;
  _requestId?: string;
};

api.interceptors.request.use((config) => {
  const loggedConfig = config as LoggedRequestConfig;
  loggedConfig._requestStartedAt = performance.now();
  loggedConfig._requestId = createRequestId();
  loggedConfig.headers.set('X-Request-Id', loggedConfig._requestId);
  clientLogger.debug('API request started', {
    request_id: loggedConfig._requestId,
    method: loggedConfig.method?.toUpperCase(),
    url: loggedConfig.url,
  });
  return loggedConfig;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    const config = response.config as LoggedRequestConfig;
    clientLogger.info('API request completed', {
      request_id: config._requestId,
      method: config.method?.toUpperCase(),
      url: config.url,
      status: response.status,
      duration_ms: config._requestStartedAt === undefined ? undefined : Math.round((performance.now() - config._requestStartedAt) * 100) / 100,
    });
    return response;
  },
  (error) => {
    const config = error.config as LoggedRequestConfig | undefined;
    clientLogger.error('API request failed', {
      request_id: config?._requestId,
      method: config?.method?.toUpperCase(),
      url: config?.url,
      status: error.response?.status,
      duration_ms: config?._requestStartedAt === undefined ? undefined : Math.round((performance.now() - config._requestStartedAt) * 100) / 100,
      error: error.message,
    });
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      // Clear auth state and redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
