type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDevelopment = import.meta.env.DEV;

function write(level: LogLevel, message: string, context: Record<string, unknown> = {}): void {
  if (!isDevelopment && level === 'debug') return;

  const entry = {
    timestamp: new Date().toISOString(),
    service: 'deriv-frontend',
    level,
    message,
    ...context,
  };

  const output = console[level] as (...args: unknown[]) => void;
  output(`[deriv-frontend] ${message}`, entry);
}

export const clientLogger = {
  debug: (message: string, context?: Record<string, unknown>) => write('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => write('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => write('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => write('error', message, context),
};

export function createRequestId(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
