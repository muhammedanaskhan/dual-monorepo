'use client';

import { useEffect, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useIdentityToken } from '@privy-io/react-auth';

export function LoginTracker() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const { identityToken } = useIdentityToken();
  const firedRef = useRef(false);
  const identityTokenRef = useRef(identityToken);

  useEffect(() => {
    if (!ready || !authenticated || firedRef.current) return;

    const callBackend = async () => {
      try {
        // Prefer access token; fallback to ID token (backend supports both)
        const token = (await getAccessToken?.()) || (await identityTokenRef.current);
        if (!token) return;

        const base = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '');
        const url = `${base}/v1/auth/anonymous`;

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // Prevent duplicate calls on re-renders
        firedRef.current = true;

        if (!res.ok) {
          // Optional: surface error for debugging
          // console.error('Auth bootstrap failed', await res.text());
        }
      } catch {
        // Optional: handle error (network, token, etc.)
      }
    };

    void callBackend();
    }, [ready, authenticated, getAccessToken, identityToken]);

  return null;
}