'use client';

import { useEffect } from 'react';
import { AuthService } from '@/services/auth.service';
import TokenManager from '@/lib/TokenManager';

/**
 * Silently refreshes the access token once when the app first loads
 * (including hard browser refreshes). Does NOT run on client-side navigation
 * because this component is mounted only at the root layout level and React
 * keeps it mounted while navigating between pages.
 */
export default function TokenRefresher() {
    useEffect(() => {
        const refreshToken = TokenManager.getRefreshToken();

        // Only attempt a refresh when a refresh token exists (i.e. user is logged in).
        if (!refreshToken) return;

        AuthService.refreshToken().catch(() => {
            // Silently swallow errors — the axios interceptor in api.ts already
            // handles 401s and redirects if the refresh token is expired.
        });
    }, []); // Empty deps → runs exactly once on mount (initial load / browser refresh)

    return null;
}
