import { useEffect, useRef, useState } from 'react';
import api from '../../shared/api/client';

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleAccountsId {
  initialize: (options: { client_id: string; nonce: string; callback: (response: GoogleCredentialResponse) => void }) => void;
  renderButton: (element: HTMLElement, options: Record<string, string | number | boolean>) => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

interface GoogleSignInButtonProps {
  onCredential: (credential: string) => Promise<void>;
  disabled?: boolean;
}

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const enabled = import.meta.env.VITE_GOOGLE_AUTH_ENABLED === 'true' && Boolean(clientId);
let googleScript: Promise<void> | null = null;

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts.id) return Promise.resolve();
  if (googleScript) return googleScript;
  googleScript = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    const timeout = window.setTimeout(() => reject(new Error('Google script timeout')), 15000);
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      window.clearTimeout(timeout);
      if (window.google?.accounts.id) resolve();
      else reject(new Error('Google Identity Services unavailable'));
    };
    script.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error('Google script unavailable'));
    };
    document.head.appendChild(script);
  }).catch((error) => {
    googleScript = null;
    throw error;
  });
  return googleScript;
}

export function GoogleSignInButton({ onCredential, disabled = false }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;
    let active = true;
    loadGoogleScript()
      .then(async () => {
        const response = await api.get<{ data: { nonce: string } }>('/auth/google/challenge');
        const nonce = response.data.data.nonce;
        if (!active || !containerRef.current || !window.google?.accounts.id) return;
        window.google.accounts.id.initialize({ client_id: clientId!, nonce, callback: async ({ credential }) => {
          if (active && !disabled) await onCredential(credential);
        }});
        containerRef.current.replaceChildren();
        window.google.accounts.id.renderButton(containerRef.current, { theme: 'outline', size: 'large', width: 300, text: 'continue_with', shape: 'rectangular' });
      })
      .catch(() => {
        if (active) setError('Google sign-in is unavailable.');
      });
    return () => { active = false; };
  }, [disabled, onCredential]);

  if (!enabled) return null;
  return <div aria-label="Sign in with Google" className="google-sign-in"><div ref={containerRef} />{error && <small>{error}</small>}</div>;
}
