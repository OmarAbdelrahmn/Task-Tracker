import React from 'react';
import { Message, Participant } from '@/services/conversation.service';
import { FileText, Download } from 'lucide-react';
import { format } from 'date-fns';
import { API_BASE_URL } from '@/lib/api';

interface MessageBubbleProps {
    message: Message;
    currentUserId: string;
    participants?: Participant[];
}

export function MessageBubble({ message, currentUserId, participants }: MessageBubbleProps) {
    const isMine = message.senderId === currentUserId;

    // Use participant's avatar if available, fallback to message's senderAvatar
    const senderParticipant = participants?.find(p => p.userId === message.senderId);
    const rawAvatarUrl = senderParticipant?.avatarUrl || message.senderAvatar;

    const normalizedApiBaseUrl = API_BASE_URL.replace(/\/$/, '');
    const normalizedAvatarPath = rawAvatarUrl ? (rawAvatarUrl.startsWith('/') ? rawAvatarUrl : `/${rawAvatarUrl}`) : '';
    const finalAvatarUrl = rawAvatarUrl ? (rawAvatarUrl.startsWith('http') ? rawAvatarUrl : `${normalizedApiBaseUrl}${normalizedAvatarPath}`) : null;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: isMine ? 'flex-end' : 'flex-start',
            marginBottom: '1rem',
        }}>
            {/* Sender Name & Avatar (only show if not mine) */}
            {!isMine && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    {finalAvatarUrl ? (
                        <img src={finalAvatarUrl} alt={message.senderName} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{
                            width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)',
                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem'
                        }}>
                            {message.senderName.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{message.senderName}</span>
                </div>
            )}

            {/* Bubble */}
            <div style={{
                maxWidth: '75%',
                padding: '0.75rem 1rem',
                borderRadius: '16px',
                borderTopRightRadius: isMine ? '4px' : '16px',
                borderTopLeftRadius: !isMine ? '4px' : '16px',
                background: isMine ? 'linear-gradient(135deg, var(--primary), var(--secondary))' : 'var(--surface)',
                color: isMine ? 'white' : 'var(--foreground)',
                border: isMine ? 'none' : '1px solid var(--surface-border)',
                boxShadow: 'var(--shadow-sm)'
            }}>
                {/* Reply To Preview (Optional) */}
                {message.replyTo && (
                    <div style={{
                        background: 'rgba(0,0,0,0.1)', borderLeft: '3px solid currentcolor',
                        padding: '0.25rem 0.5rem', marginBottom: '0.5rem', borderRadius: '4px', fontSize: '0.8rem', opacity: 0.9
                    }}>
                        <strong>{message.replyTo.senderName}</strong>
                        <p style={{ margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {message.replyTo.body || 'File'}
                        </p>
                    </div>
                )}

                {/* Deleted State */}
                {message.isDeleted ? (
                    <span style={{ fontStyle: 'italic', opacity: 0.7 }}>This message was deleted</span>
                ) : (
                    <>
                        {/* Text Body */}
                        {message.body && (
                            <div style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                                {message.body}
                                {message.isEdited && <span style={{ fontSize: '0.7rem', opacity: 0.7, marginLeft: '0.5rem' }}>(edited)</span>}
                            </div>
                        )}

                        {/* File Attachments */}
                        {message.files && message.files.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: message.body ? '0.75rem' : 0 }}>
                                {message.files.map(f => (
                                    <a key={f.id} href={f.fileUrl} target="_blank" rel="noopener noreferrer" download={f.fileName}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem',
                                            background: isMine ? 'rgba(255,255,255,0.2)' : 'var(--background)',
                                            borderRadius: '8px', textDecoration: 'none', color: 'inherit',
                                            fontSize: '0.9rem'
                                        }}>
                                        <FileText size={18} />
                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.fileName}</span>
                                        <Download size={16} />
                                    </a>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Timestamp */}
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', opacity: 0.8 }}>
                {format(new Date(message.createdAt), 'p')}
            </div>
        </div>
    );
}
