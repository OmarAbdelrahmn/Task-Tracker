"use client";

import { X, Info, Loader2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ChatWindow } from './ChatWindow';
import { ConversationService, ConversationSummary } from '@/services/conversation.service';
import TokenManager from '@/lib/TokenManager';

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

    const [showInfo, setShowInfo] = useState(false);
    const [infoDetails, setInfoDetails] = useState<ConversationSummary | null>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    if (!isOpen || !conversationId) return null;

    const handleInfoClick = async () => {
        if (showInfo) {
            setShowInfo(false);
            return;
        }

        setShowInfo(true);
        setIsLoadingDetails(true);
        try {
            const details = await ConversationService.getConversationById(conversationId);
            setInfoDetails(details);
        } catch (e) {
            console.error('Failed to load conversation details', e);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const handleDeleteConversation = async () => {
        if (!confirm('Are you sure you want to delete this conversation?')) return;
        try {
            await ConversationService.deleteConversation(conversationId);
            // After deletion, close the modal and potentially notify parent to refresh
            onClose();
            window.location.reload(); // Refresh to update task state (conversationId might be linked)
        } catch (e: any) {
            console.error('Failed to delete conversation', e);
            alert(e?.response?.data || 'Failed to delete conversation (Access denied)');
        }
    };

    const currentUserIdStr = TokenManager.getUserIdFromToken();
    const isMe = (userId: string) => userId.toLowerCase() === currentUserIdStr.toLowerCase();

    const getAvatarUrl = (rawUrl: string | null) => {
        if (!rawUrl) return null;
        // This is a bit of a duplicate of MessagesPage logic, but kept simple here
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'; // Fallback
        const normalizedAvatarPath = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
        return rawUrl.startsWith('http') ? rawUrl : `${API_BASE_URL.replace(/\/$/, '')}${normalizedAvatarPath}`;
    };

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
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--foreground)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t('discussion')}
                        </h2>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                            {taskTitle}
                        </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                            onClick={handleInfoClick}
                            title="Info"
                            style={{
                                background: showInfo ? 'var(--primary-light)' : 'var(--surface)',
                                border: 'none',
                                cursor: 'pointer',
                                color: showInfo ? 'var(--primary)' : 'var(--text-muted)',
                                padding: '0.45rem',
                                borderRadius: '8px',
                                display: 'flex'
                            }}
                        >
                            <Info size={18} />
                        </button>
                        <button onClick={onClose} title="Close" style={{ background: 'var(--surface)', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.45rem', borderRadius: '8px', display: 'flex' }}>
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Chat Window Container */}
                <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                    <ChatWindow conversationId={conversationId} />

                    {/* Info Overlay */}
                    {showInfo && (
                        <div style={{
                            position: 'absolute', inset: 0, background: 'var(--background)', zIndex: 10,
                            display: 'flex', flexDirection: 'column', padding: '1.5rem', overflowY: 'auto'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0 }}>Conversation Info</h3>
                                <button onClick={() => setShowInfo(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                    <X size={20} />
                                </button>
                            </div>

                            {isLoadingDetails ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                                    <Loader2 className="spin" />
                                </div>
                            ) : infoDetails ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                        {infoDetails.participants.length} Participants
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {infoDetails.participants.map(p => (
                                            <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', color: 'white', fontWeight: 600, fontSize: '0.8rem' }}>
                                                    {p.avatarUrl ? <img src={getAvatarUrl(p.avatarUrl)!} alt={p.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p.fullName.charAt(0).toUpperCase()}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {p.fullName} {isMe(p.userId) && '(You)'}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{p.userName}</div>
                                                </div>
                                                {p.isOnline && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#25D366' }} />}
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
                                        <button
                                            onClick={handleDeleteConversation}
                                            style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}
                                        >
                                            <Trash2 size={18} />
                                            Delete Conversation
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Could not load details.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
