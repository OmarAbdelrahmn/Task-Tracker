"use client";
// Restores the saved accent color from localStorage on every page load
import { useEffect } from 'react';

export function AccentColorProvider() {
    useEffect(() => {
        const saved = localStorage.getItem('accentColor');
        if (saved) {
            document.documentElement.setAttribute('data-accent', saved);
        }
    }, []);
    return null;
}
