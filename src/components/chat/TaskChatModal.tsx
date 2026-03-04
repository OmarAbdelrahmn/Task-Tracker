"use client";

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ChatWindow } from './ChatWindow';

interface TaskChatModalProps {
    conversationId: number | null;
    taskId: number | null;
    taskTitle: string;
    isOpen: boolean;
    onClose: () => void;
    locale: string;
}

export function TaskChatModal({ conversationId, taskId, taskTitle, isOpen, onClose, locale }: TaskChatModalProps) {
    const t = useTranslations('Messages');
    const isRtl = locale === 'ar';

    if (!isOpen || !conversationId) return null;

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'stretch',
                justifyContent: isRtl ? 'flex-start' : 'flex-end', background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(2px)', direction: isRtl ? 'rtl' : 'ltr'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'var(--background)', width: '100%', maxWidth: '450px',
                    display: 'flex', flexDirection: 'column',
                    boxShadow: isRtl ? '4px 0 24px rgba(0,0,0,0.25)' : '-4px 0 24px rgba(0,0,0,0.25)'
                }}
                onClick={e => e.stopPropagation()}
                className="animate-fade-in"
            >
                {/* Header */}
                <div style={{
                    padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'var(--background)'
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--foreground)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                            {t('discussion')}
                        </h2>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {taskTitle}
                        </span>
                    </div>

                    <button onClick={onClose} title="Close" style={{ background: 'var(--surface)', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.45rem', borderRadius: '8px', display: 'flex' }}>
                        <X size={18} />
                    </button>
                </div>

                {/* Chat Window Container */}
                <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                    <ChatWindow conversationId={conversationId} />
                </div>
            </div>
        </div>
    );
}
