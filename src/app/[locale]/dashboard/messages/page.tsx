"use client";

import React, { useEffect, useState, use, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ConversationService, ConversationSummary, Message } from '@/services/conversation.service';
import { TaskService, AssignableUser } from '@/services/task.service';
import { AuthService } from '@/services/auth.service';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { useSignalR } from '@/lib/useSignalR';
import { Users, User, MessageSquarePlus, Loader2, ArrowLeft, Check, X, Search, Edit2, LogOut, Trash2 } from 'lucide-react';
import TokenManager from '@/lib/TokenManager';
import { API_BASE_URL } from '@/lib/api';

export default function MessagesPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = use(params);
    const t = useTranslations('Tasks');
    const tm = useTranslations('Messages');
    const isRtl = locale === 'ar';

    const [conversations, setConversations] = useState<ConversationSummary[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<ConversationSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);


    const [showNewChatOverlay, setShowNewChatOverlay] = useState(false);
    const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
    const [isCreatingChat, setIsCreatingChat] = useState(false);

    // Group chat state
    const [isGroupChatMode, setIsGroupChatMode] = useState(false);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [groupName, setGroupName] = useState('');

    const [showInfoPopup, setShowInfoPopup] = useState(false);
    const [infoDetails, setInfoDetails] = useState<ConversationSummary | null>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    // Group rename state
    const [isRenamingGroup, setIsRenamingGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [isSavingGroupInfo, setIsSavingGroupInfo] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

    // Search messages state
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Message[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchSearched, setSearchSearched] = useState(false);

    // Current user identity — resolved from /api/me (most reliable)
    // Falls back to decoding multiple possible JWT claim names
    const [currentUserName, setCurrentUserName] = useState<string>('');
    const [currentUserIdStr, setCurrentUserIdStr] = useState<string>(() => {
        try {
            const token = TokenManager.getAccessToken();
            if (!token) return '';
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c =>
                '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
            ).join(''));
            const payload = JSON.parse(jsonPayload);
            // Try every common claim name for the user id
            return (
                payload.nameid ||
                payload.sub ||
                payload.uid ||
                payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
                ''
            );
        } catch {
            return '';
        }
    });

    const loadConversations = async () => {
        setIsLoading(true);
        try {
            const data = await ConversationService.getConversations();
            // Sort by last message time descending, fallback to createdAt
            setConversations(data.sort((a, b) => {
                const aTime = a.lastMessage?.createdAt ?? a.createdAt;
                const bTime = b.lastMessage?.createdAt ?? b.createdAt;
                return new Date(bTime).getTime() - new Date(aTime).getTime();
            }));
        } catch (error) {
            console.error('Failed to load conversations', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadConversations();
        // Fetch the actual API identity so participant comparisons are reliable
        AuthService.getMe()
            .then(me => {
                setCurrentUserName(me.userName.toLowerCase());
            })
            .catch(() => { /* ignore — JWT fallback is still used */ });
    }, []);

    const fetchUsersForNewChat = async () => {
        try {
            const users = await TaskService.getAssignableUsers();
            setAssignableUsers(users.filter(u => u.id !== currentUserIdStr));
            setIsGroupChatMode(false);
            setSelectedUserIds([]);
            setGroupName('');
            setShowNewChatOverlay(true);
        } catch (error) {
            console.error('Failed to load users for new chat', error);
        }
    };

    const handleCreateDirectChat = async (userId: string) => {
        setIsCreatingChat(true);
        try {
            const newConv = await ConversationService.createDirectConversation(userId);
            await loadConversations();
            setSelectedConversation(newConv);
            setShowNewChatOverlay(false);
        } catch (error) {
            console.error('Failed to create direct chat', error);
        } finally {
            setIsCreatingChat(false);
        }
    };

    const handleCreateGroupChat = async () => {
        if (selectedUserIds.length < 2) return;
        setIsCreatingChat(true);
        try {
            const finalName = groupName.trim() || 'Group Chat';
            const newConv = await ConversationService.createGroupConversation(finalName, selectedUserIds);
            await loadConversations();
            setSelectedConversation(newConv);
            setShowNewChatOverlay(false);
        } catch (error) {
            console.error('Failed to create group chat', error);
        } finally {
            setIsCreatingChat(false);
        }
    };

    const getAvatarUrl = (rawUrl: string | null) => {
        if (!rawUrl) return null;
        const normalizedApiBaseUrl = API_BASE_URL.replace(/\/$/, '');
        const normalizedAvatarPath = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
        return rawUrl.startsWith('http') ? rawUrl : `${normalizedApiBaseUrl}${normalizedAvatarPath}`;
    };

    // WhatsApp-style relative timestamp
    const formatTimestamp = (isoString: string | null | undefined): string => {
        if (!isoString) return '';
        const date = new Date(isoString);
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterdayStart = new Date(todayStart.getTime() - 86400000);

        if (date >= todayStart) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (date >= yesterdayStart) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
    };

    // Avatar element for a participant/user
    const renderCircleAvatar = (
        avatarUrl: string | null,
        name: string,
        size: number = 46,
        isOnline?: boolean
    ) => {
        const url = getAvatarUrl(avatarUrl);
        return (
            <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, flexShrink: 0 }}>
                <div style={{
                    width: `${size}px`, height: `${size}px`, borderRadius: '50%',
                    background: 'var(--surface-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', flexShrink: 0,
                    fontSize: `${size * 0.4}px`, fontWeight: 600, color: 'var(--text-muted)'
                }}>
                    {url
                        ? <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : name.charAt(0).toUpperCase()
                    }
                </div>
                {isOnline !== undefined && (
                    <div style={{
                        position: 'absolute', bottom: 1, right: 1,
                        width: `${Math.max(size * 0.22, 8)}px`, height: `${Math.max(size * 0.22, 8)}px`,
                        borderRadius: '50%',
                        background: isOnline ? '#25D366' : 'var(--text-muted)',
                        border: '2px solid var(--surface)'
                    }} />
                )}
            </div>
        );
    };

    const renderGroupIcon = (size: number = 46) => (
        <div style={{
            width: `${size}px`, height: `${size}px`, borderRadius: '50%',
            background: 'var(--surface-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
            <Users size={size * 0.45} color="var(--text-muted)" />
        </div>
    );

    const renderPersonIcon = (size: number = 46) => (
        <div style={{
            width: `${size}px`, height: `${size}px`, borderRadius: '50%',
            background: 'var(--surface-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
            <User size={size * 0.45} color="var(--text-muted)" />
        </div>
    );

    // Add this once at the top of the component (outside the return)
    const resolveType = (type: any): 'direct' | 'group' | 'taskthread' => {
        const s = String(type ?? '').toLowerCase();
        if (s === 'group' || s === '1') return 'group';
        if (s === 'taskthread' || s === '2') return 'taskthread';
        return 'direct';
    };

    // Determine if a participant is the current (logged-in) user.
    // Prefer userName match (from /api/me) because it's always consistent;
    // fall back to userId (from JWT) in case /api/me hasn't loaded yet.
    const isMe = (p: { userId: string; userName: string }) => {
        if (currentUserName) return p.userName.toLowerCase() === currentUserName;
        return p.userId.toLowerCase() === currentUserIdStr.toLowerCase();
    };

    // Get per-conversation info used in sidebar & header
    const getConversationInfo = (conv: ConversationSummary) => {
        const type = resolveType(conv.type);
        if (type === 'group') {
            const memberCount = conv.participants.length;
            const lastMsg = conv.lastMessage;
            let preview = '';
            if (lastMsg) {
                const isMe = lastMsg.senderId === currentUserIdStr;
                const senderPrefix = isMe ? 'You' : lastMsg.senderName?.split(' ')[0] ?? '';
                const body = lastMsg.isDeleted ? 'This message was deleted' : (lastMsg.body ?? (lastMsg.files?.length ? '📎 File' : ''));
                preview = senderPrefix ? `${senderPrefix}: ${body}` : body;
            }
            return {
                name: conv.name || 'Group Chat',
                subtitle: `${memberCount} members`,
                preview,
                timestamp: formatTimestamp(lastMsg?.createdAt ?? conv.createdAt),
                avatarEl: conv.avatarUrl ? renderCircleAvatar(conv.avatarUrl, conv.name || 'Group Chat') : renderGroupIcon(),
                headerAvatarEl: conv.avatarUrl ? renderCircleAvatar(conv.avatarUrl, conv.name || 'Group Chat', 42) : renderGroupIcon(42),
                isOnline: null as boolean | null,
            };
        } else if (type === 'taskthread') {
            const lastMsg = conv.lastMessage;
            const preview = lastMsg?.body ?? '';
            return {
                name: conv.name || `Task #${conv.taskId} Discussion`,
                subtitle: 'Task thread',
                preview,
                timestamp: formatTimestamp(lastMsg?.createdAt ?? conv.createdAt),
                avatarEl: conv.avatarUrl ? renderCircleAvatar(conv.avatarUrl, conv.name || 'Task') : renderGroupIcon(),
                headerAvatarEl: conv.avatarUrl ? renderCircleAvatar(conv.avatarUrl, conv.name || 'Task', 42) : renderGroupIcon(42),
                isOnline: null as boolean | null,
            };
        } else {
            // Direct chat
            const other = conv.participants.find(p => !isMe(p)) ?? conv.participants[conv.participants.length - 1];
            const avatarUrl = other?.avatarUrl ?? null;
            const name = other?.fullName ?? conv.name ?? 'Direct Chat';
            const lastMsg = conv.lastMessage;
            let preview = '';
            if (lastMsg) {
                const isMyMsg = currentUserName
                    ? lastMsg.senderId.toLowerCase() === currentUserIdStr.toLowerCase() || lastMsg.senderName?.toLowerCase().includes(currentUserName)
                    : lastMsg.senderId.toLowerCase() === currentUserIdStr.toLowerCase();
                const body = lastMsg.isDeleted ? 'This message was deleted' : (lastMsg.body ?? (lastMsg.files?.length ? '📎 File' : ''));
                preview = isMyMsg ? `You: ${body}` : body;
            }
            const isOnline = other?.isOnline ?? false;
            const headerSubtitle = isOnline ? 'Online' : 'Offline';

            const sidebarAvatar = avatarUrl
                ? renderCircleAvatar(avatarUrl, name)
                : renderPersonIcon();

            const headerAvatar = avatarUrl
                ? renderCircleAvatar(avatarUrl, name, 42, isOnline)
                : renderPersonIcon(42);

            return {
                name,
                subtitle: headerSubtitle,
                preview,
                timestamp: formatTimestamp(lastMsg?.createdAt ?? conv.createdAt),
                avatarEl: sidebarAvatar,
                headerAvatarEl: headerAvatar,
                isOnline,
            };
        }
    };

    const handleHeaderClick = async () => {
        if (!selectedConversation) return;
        setShowInfoPopup(true);
        setIsLoadingDetails(true);
        try {
            const details = await ConversationService.getConversationById(selectedConversation.id);
            setInfoDetails(details);
            setNewGroupName(details.name || '');

            // Sync up states in case the backend details have more accurate presence mapping than the initial list fetch
            setSelectedConversation(prev => prev?.id === details.id ? details : prev);
            setConversations(prev => prev.map(c => c.id === details.id ? details : c));
        } catch (e) {
            console.error('Failed to load conversation details', e);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const handleUpdateGroup = async () => {
        if (!infoDetails || infoDetails.type !== 'Group') return;
        if (!newGroupName.trim() || newGroupName === infoDetails.name) {
            setIsRenamingGroup(false);
            return;
        }
        setIsSavingGroupInfo(true);
        try {
            const updated = await ConversationService.updateGroup(infoDetails.id, newGroupName.trim());
            // SignalR 'ConversationUpdated' will broadcast to others, but we can update locally instantly
            setInfoDetails(updated);
            setSelectedConversation(updated);
            setConversations(prev => prev.map(c => c.id === updated.id ? updated : c));
            setIsRenamingGroup(false);
        } catch (e) {
            console.error('Failed to update group name', e);
            alert('Failed to update group');
        } finally {
            setIsSavingGroupInfo(false);
        }
    };

    const handleGroupAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !infoDetails) return;
        setIsUploadingAvatar(true);
        try {
            const result = await ConversationService.updateGroupAvatar(infoDetails.id, file);
            const newAvatarUrl = result.avatarUrl;
            setInfoDetails(prev => prev ? { ...prev, avatarUrl: newAvatarUrl } : prev);
            setSelectedConversation(prev => prev?.id === infoDetails.id ? { ...prev, avatarUrl: newAvatarUrl } : prev);
            setConversations(prev => prev.map(c => c.id === infoDetails.id ? { ...c, avatarUrl: newAvatarUrl } : c));
        } catch (err) {
            console.error('Failed to update group avatar', err);
            alert('Failed to upload group avatar.');
        } finally {
            setIsUploadingAvatar(false);
            e.target.value = '';
        }
    };

    const handleLeaveConversation = async () => {
        if (!infoDetails) return;
        if (!confirm('Are you sure you want to leave this conversation?')) return;
        try {
            await ConversationService.leaveConversation(infoDetails.id);
            // On success, we can clear out the selected conversation
            setConversations(prev => prev.filter(c => c.id !== infoDetails.id));
            setSelectedConversation(null);
            setShowInfoPopup(false);
        } catch (e: any) {
            console.error('Failed to leave conversation', e);
            alert(e?.response?.data || 'Failed to leave conversation. (Are you the last participant? Try delete instead).');
        }
    };

    const handleDeleteConversation = async () => {
        if (!infoDetails) return;
        if (!confirm('Are you sure you want to delete this conversation? This might only work if you are the creator or the last participant.')) return;
        try {
            await ConversationService.deleteConversation(infoDetails.id);
            setConversations(prev => prev.filter(c => c.id !== infoDetails.id));
            setSelectedConversation(null);
            setShowInfoPopup(false);
        } catch (e: any) {
            console.error('Failed to delete conversation', e);
            alert(e?.response?.data || 'Failed to delete conversation (Access denied)');
        }
    };

    const handleSearchMessages = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!selectedConversation) return;

        if (!searchQuery.trim()) {
            setSearchResults([]);
            setSearchSearched(false);
            return;
        }

        setIsSearching(true);
        setSearchSearched(true);
        try {
            const res = await ConversationService.searchMessages(selectedConversation.id, searchQuery);
            setSearchResults(res.items);
        } catch (e) {
            console.error("Failed to search messages", e);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    // Close search when selected conversation changes
    useEffect(() => {
        setShowSearch(false);
        setSearchQuery('');
        setSearchResults([]);
        setSearchSearched(false);
    }, [selectedConversation?.id]);

    const handleNewMessage = (newMessage: Message) => {
        setConversations(prev => {
            const index = prev.findIndex(c => c.id === newMessage.conversationId);
            if (index === -1) return prev;

            const conv = prev[index];
            const updatedConv = {
                ...conv,
                lastMessage: newMessage,
                // Increment unread count if we received a new message, it's not from us, and this isn't the active chat.
                unreadCount: (newMessage.senderId !== currentUserIdStr && selectedConversation?.id !== conv.id)
                    ? conv.unreadCount + 1
                    : conv.unreadCount
            };

            const newList = [...prev];
            newList[index] = updatedConv;

            return newList.sort((a, b) => {
                const aTime = a.lastMessage?.createdAt ?? a.createdAt;
                const bTime = b.lastMessage?.createdAt ?? b.createdAt;
                return new Date(bTime).getTime() - new Date(aTime).getTime();
            });
        });
    };

    const handleUserStatusChange = useCallback((userId: string, isOnline: boolean) => {
        setConversations(prev => prev.map(conv => {
            const hasUser = conv.participants.some(p => p.userId === userId);
            if (!hasUser) return conv;
            return {
                ...conv,
                participants: conv.participants.map(p =>
                    p.userId === userId ? { ...p, isOnline } : p
                )
            };
        }));

        setSelectedConversation(prev => {
            if (!prev) return prev;
            const hasUser = prev.participants.some(p => p.userId === userId);
            if (!hasUser) return prev;
            return {
                ...prev,
                participants: prev.participants.map(p =>
                    p.userId === userId ? { ...p, isOnline } : p
                )
            };
        });

        setInfoDetails(prev => {
            if (!prev) return prev;
            const hasUser = prev.participants.some(p => p.userId === userId);
            if (!hasUser) return prev;
            return {
                ...prev,
                participants: prev.participants.map(p =>
                    p.userId === userId ? { ...p, isOnline } : p
                )
            };
        });
    }, []);

    // Global SignalR connection for real-time list updates
    useSignalR(null, {
        onReceiveMessage: handleNewMessage,
        onUserOnline: (userId) => handleUserStatusChange(userId, true),
        onUserOffline: (userId) => handleUserStatusChange(userId, false),
        onConversationUpdated: (id, newName) => {
            setConversations(prev => prev.map(c => c.id === id ? { ...c, name: newName } : c));
            setSelectedConversation(prev => prev?.id === id ? { ...prev, name: newName } : prev);
            setInfoDetails(prev => prev?.id === id ? { ...prev, name: newName } : prev);
        },
        onParticipantLeft: (id, userId) => {
            setConversations(prev => prev.map(c => c.id === id ? { ...c, participants: c.participants.filter(p => p.userId !== userId) } : c));
            setSelectedConversation(prev => prev?.id === id ? { ...prev, participants: prev.participants.filter(p => p.userId !== userId) } : prev);
            setInfoDetails(prev => prev?.id === id ? { ...prev, participants: prev.participants.filter(p => p.userId !== userId) } : prev);
        },
        onConversationDeleted: (id) => {
            setConversations(prev => prev.filter(c => c.id !== id));
            if (selectedConversation?.id === id) setSelectedConversation(null);
            if (infoDetails?.id === id) setShowInfoPopup(false);
        }
    });

    return (
        <div style={{ display: 'flex', height: '100%', minHeight: 0, gap: '1rem' }}>
            {/* ─── Sidebar ─── */}
            <div className="glass" style={{ width: '320px', display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100%', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>{tm('discussion')}</h2>
                    <button
                        onClick={fetchUsersForNewChat}
                        className="btn-primary"
                        style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                    >
                        <MessageSquarePlus size={16} />
                        <span style={{ fontSize: '0.85rem' }}>New</span>
                    </button>
                </div>

                {/* Conversation list */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
                    {isLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                            <Loader2 className="spin" />
                        </div>
                    ) : conversations.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            No conversations found.
                        </div>
                    ) : (
                        conversations.map(conv => {
                            const info = getConversationInfo(conv);
                            const isSelected = selectedConversation?.id === conv.id;

                            return (
                                <button
                                    key={conv.id}
                                    onClick={() => {
                                        setSelectedConversation(conv);
                                        if (conv.unreadCount > 0) {
                                            setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c));
                                        }
                                    }}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.75rem 0.875rem',
                                        marginBottom: '2px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        background: isSelected ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : 'transparent',
                                        cursor: 'pointer',
                                        transition: 'background 0.15s',
                                        textAlign: isRtl ? 'right' : 'left',
                                        direction: isRtl ? 'rtl' : 'ltr',
                                    }}
                                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--surface)'; }}
                                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                                >
                                    {/* Avatar */}
                                    {info.avatarEl}

                                    {/* Center: name + preview */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.93rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isSelected ? 'var(--primary)' : 'var(--foreground)' }}>
                                            {info.name}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                                            {info.preview || <span style={{ fontStyle: 'italic' }}>No messages yet</span>}
                                        </div>
                                    </div>

                                    {/* Right: timestamp + unread badge */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                                        {info.timestamp && (
                                            <span style={{ fontSize: '0.72rem', color: conv.unreadCount > 0 ? '#25D366' : 'var(--text-muted)', whiteSpace: 'nowrap', fontWeight: conv.unreadCount > 0 ? 600 : 400 }}>
                                                {info.timestamp}
                                            </span>
                                        )}
                                        {conv.unreadCount > 0 ? (
                                            <div style={{
                                                background: '#25D366',
                                                color: '#fff',
                                                fontSize: '0.68rem',
                                                fontWeight: 700,
                                                minWidth: '20px',
                                                height: '20px',
                                                borderRadius: '10px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: '0 5px',
                                            }}>
                                                {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                                            </div>
                                        ) : (
                                            /* Placeholder to keep column height consistent */
                                            <div style={{ height: '20px' }} />
                                        )}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ─── Main Chat Area ─── */}
            <div className="glass" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, height: '100%', overflow: 'hidden' }}>
                {selectedConversation ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        {/* Chat Header — always clickable */}
                        {(() => {
                            const info = getConversationInfo(selectedConversation);
                            return (
                                <div
                                    style={{
                                        padding: '0.875rem 1.5rem',
                                        borderBottom: '1px solid var(--border)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        direction: isRtl ? 'rtl' : 'ltr',
                                    }}
                                >
                                    {/* Clickable Info Area */}
                                    <div
                                        onClick={handleHeaderClick}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.875rem',
                                            cursor: 'pointer',
                                            flex: 1,
                                            padding: '0.5rem',
                                            borderRadius: '8px',
                                            transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        {info.headerAvatarEl}
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, lineHeight: 1.2 }}>
                                                {info.name}
                                            </h3>
                                            <span style={{
                                                fontSize: '0.78rem',
                                                color: info.isOnline === true ? '#25D366' : 'var(--text-muted)',
                                                fontWeight: info.isOnline === true ? 600 : 400,
                                                marginTop: '1px',
                                            }}>
                                                {info.subtitle}
                                            </span>
                                        </div>
                                    </div>
                                    {/* Header Actions */}
                                    <button
                                        onClick={() => setShowSearch(!showSearch)}
                                        style={{ background: showSearch ? 'var(--surface)' : 'transparent', border: '1px solid var(--surface-border)', borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}
                                    >
                                        <Search size={18} />
                                    </button>
                                </div>
                            );
                        })()}

                        {/* Search Bar */}
                        {showSearch && (
                            <div style={{ padding: '0.8rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search in this conversation..."
                                    className="input-field"
                                    style={{ flex: 1, borderRadius: '8px', padding: '0.5rem 0.75rem' }}
                                    onKeyDown={e => e.key === 'Enter' && handleSearchMessages()}
                                />
                                <button
                                    onClick={handleSearchMessages}
                                    disabled={isSearching || !searchQuery.trim()}
                                    className="btn-primary"
                                    style={{ padding: '0.5rem 1rem', borderRadius: '8px' }}
                                >
                                    {isSearching ? <Loader2 size={16} className="spin" /> : 'Search'}
                                </button>
                            </div>
                        )}

                        {/* Chat Messages or Search Results */}
                        <div style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                            {showSearch && searchSearched ? (
                                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', background: 'var(--background)' }}>
                                    <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)' }}>Search Results ({searchResults.length})</h4>
                                    {searchResults.length === 0 ? (
                                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>No messages found.</p>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {searchResults.map(msg => (
                                                <div key={msg.id} style={{ background: 'var(--surface)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                        <span style={{ fontWeight: 600 }}>{msg.senderName}</span>
                                                        <span>{new Date(msg.createdAt).toLocaleString()}</span>
                                                    </div>
                                                    <div style={{ fontSize: '0.9rem' }}>{msg.body}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <ChatWindow
                                    key={selectedConversation.id}
                                    conversationId={selectedConversation.id}
                                    participants={selectedConversation.participants}
                                />
                            )}
                        </div>
                    </div>
                ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '1rem' }}>
                        <MessageSquarePlus size={64} opacity={0.2} />
                        <p style={{ fontSize: '1.1rem' }}>Select a conversation or start a new one.</p>
                    </div>
                )}
            </div>

            {/* ─── New Chat Modal ─── */}
            {showNewChatOverlay && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }} onClick={() => setShowNewChatOverlay(false)}>
                    <div
                        className="glass"
                        style={{ width: '90%', maxWidth: '400px', padding: '1.5rem', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {isGroupChatMode ? 'Create Group Chat' : 'Start New Conversation'}
                            <button onClick={() => setShowNewChatOverlay(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={20} />
                            </button>
                        </h3>

                        {!isGroupChatMode && (
                            <button
                                onClick={() => setIsGroupChatMode(true)}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', gap: '1rem',
                                    padding: '0.75rem', marginBottom: '1rem', borderRadius: '10px',
                                    border: '1px solid var(--primary)', background: 'color-mix(in srgb, var(--primary) 10%, transparent)',
                                    cursor: 'pointer', textAlign: 'left', color: 'var(--primary)'
                                }}
                            >
                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Users size={18} />
                                </div>
                                <div style={{ flex: 1, fontWeight: 600 }}>Create New Group</div>
                            </button>
                        )}

                        {isGroupChatMode && (
                            <div style={{ marginBottom: '1rem' }}>
                                <input
                                    type="text"
                                    placeholder="Group Name (Optional)"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    className="input-field"
                                    style={{ width: '100%', marginBottom: '1rem' }}
                                />
                                <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                                    Select Members ({selectedUserIds.length})
                                </div>
                            </div>
                        )}

                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {assignableUsers.length === 0 ? (
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No users available.</p>
                            ) : (
                                assignableUsers.map(user => {
                                    const avatarUrl = getAvatarUrl((user as any).avatarUrl || (user as any).AvatarUrl);
                                    const isSelected = selectedUserIds.includes(user.id);

                                    return (
                                        <button
                                            key={user.id}
                                            onClick={() => {
                                                if (isGroupChatMode) {
                                                    setSelectedUserIds(prev =>
                                                        prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id]
                                                    );
                                                } else {
                                                    handleCreateDirectChat(user.id);
                                                }
                                            }}
                                            disabled={!isGroupChatMode && isCreatingChat}
                                            style={{
                                                width: '100%', display: 'flex', alignItems: 'center', gap: '1rem',
                                                padding: '0.75rem', marginBottom: '0.5rem', borderRadius: '10px',
                                                border: isSelected ? '1px solid var(--primary)' : '1px solid var(--surface-border)',
                                                background: isSelected ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--surface)',
                                                cursor: (!isGroupChatMode && isCreatingChat) ? 'not-allowed' : 'pointer', textAlign: 'left',
                                                opacity: (!isGroupChatMode && isCreatingChat) ? 0.7 : 1
                                            }}
                                        >
                                            <div style={{ position: 'relative', width: '36px', height: '36px', borderRadius: '50%', background: 'var(--surface-border)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', overflow: 'hidden' }}>
                                                {avatarUrl ? (
                                                    <img src={avatarUrl} alt={user.fullName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                                ) : (
                                                    user.fullName.charAt(0).toUpperCase()
                                                )}
                                                {isGroupChatMode && isSelected && (
                                                    <div style={{ position: 'absolute', bottom: -2, right: -2, background: 'var(--primary)', color: 'white', borderRadius: '50%', padding: '2px' }}>
                                                        <Check size={12} strokeWidth={3} />
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{user.fullName}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>@{user.userName}</div>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {isGroupChatMode && (
                            <button
                                onClick={handleCreateGroupChat}
                                disabled={selectedUserIds.length < 2 || isCreatingChat}
                                className="btn-primary"
                                style={{
                                    marginTop: '1rem', width: '100%', padding: '0.75rem', borderRadius: '10px',
                                    opacity: (selectedUserIds.length < 2 || isCreatingChat) ? 0.5 : 1
                                }}
                            >
                                {isCreatingChat ? 'Creating...' : 'Create Group'}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ─── Conversation Info Popup (Direct & Group) ─── */}
            {showInfoPopup && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }} onClick={() => setShowInfoPopup(false)}>
                    <div
                        className="glass"
                        style={{ width: '90%', maxWidth: '420px', padding: '1.5rem', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Popup header row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0 }}>
                                {(() => {
                                    const type = resolveType(selectedConversation?.type);
                                    if (type === 'group') return 'Group Info';
                                    if (type === 'taskthread') return 'Task Info';
                                    return 'Contact Info';
                                })()}
                            </h3>
                            <button
                                onClick={() => setShowInfoPopup(false)}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {isLoadingDetails ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                                    <Loader2 className="spin" />
                                </div>
                            ) : !infoDetails ? (
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Could not load details.</p>
                            ) : (() => {
                                const type = resolveType(infoDetails.type);
                                return type === 'group' || type === 'taskthread';
                            })() ? (
                                /* ── Group / Task details ── */
                                <div>
                                    {/* Group header card */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1rem', marginBottom: '1.5rem', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--surface-border)', position: 'relative' }}>
                                        {/* Clickable avatar with camera overlay — group & task threads */}
                                        {(resolveType(infoDetails.type) === 'group' || resolveType(infoDetails.type) === 'taskthread') ? (
                                            <label style={{ cursor: isUploadingAvatar ? 'not-allowed' : 'pointer', position: 'relative', display: 'inline-block' }}>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    style={{ display: 'none' }}
                                                    onChange={handleGroupAvatarUpload}
                                                    disabled={isUploadingAvatar}
                                                />
                                                {/* Avatar circle */}
                                                <div style={{ width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', background: 'var(--surface-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {isUploadingAvatar ? (
                                                        <Loader2 size={28} className="spin" color="var(--text-muted)" />
                                                    ) : infoDetails.avatarUrl ? (
                                                        <img src={getAvatarUrl(infoDetails.avatarUrl) ?? ''} alt={infoDetails.name ?? 'Group'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <Users size={28} color="var(--text-muted)" />
                                                    )}
                                                </div>
                                                {/* Camera badge */}
                                                {!isUploadingAvatar && (
                                                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: '22px', height: '22px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--surface)' }}>
                                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                                                    </div>
                                                )}
                                            </label>
                                        ) : (
                                            renderGroupIcon(64)
                                        )}
                                        {isRenamingGroup ? (
                                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', width: '100%' }}>
                                                <input
                                                    type="text"
                                                    value={newGroupName}
                                                    onChange={e => setNewGroupName(e.target.value)}
                                                    className="input-field"
                                                    style={{ flex: 1 }}
                                                    autoFocus
                                                    onKeyDown={e => e.key === 'Enter' && handleUpdateGroup()}
                                                />
                                                <button onClick={handleUpdateGroup} disabled={isSavingGroupInfo} className="btn-primary" style={{ padding: '0 0.75rem', borderRadius: '8px' }}>
                                                    {isSavingGroupInfo ? <Loader2 size={16} className="spin" /> : 'Save'}
                                                </button>
                                                <button onClick={() => { setIsRenamingGroup(false); setNewGroupName(infoDetails.name || ''); }} style={{ background: 'var(--surface-border)', border: 'none', borderRadius: '8px', padding: '0 0.5rem', cursor: 'pointer' }}>
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                <div style={{ fontWeight: 700, fontSize: '1.2rem', textAlign: 'center' }}>
                                                    {infoDetails.name ?? (resolveType(infoDetails.type) === 'taskthread' ? `Task #${infoDetails.taskId} Discussion` : 'Group Chat')}
                                                </div>
                                                {resolveType(infoDetails.type) === 'group' && (
                                                    <button onClick={() => setIsRenamingGroup(true)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                                        <Edit2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                            Created {new Date(infoDetails.createdAt).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </div>
                                    </div>

                                    {/* Participants */}
                                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {infoDetails.participants.length} Participants
                                    </div>
                                    {infoDetails.participants.map(p => (
                                        <div
                                            key={p.userId}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.875rem',
                                                padding: '0.625rem 0.5rem', borderBottom: '1px solid var(--surface-border)',
                                            }}
                                        >
                                            {renderCircleAvatar(p.avatarUrl, p.fullName, 40, p.isOnline)}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                    <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                                                        {p.fullName}
                                                        {isMe(p) && (
                                                            <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '4px' }}>(You)</span>
                                                        )}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                                                    @{p.userName}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {resolveType(infoDetails.type) === 'group' && (
                                        <button
                                            onClick={handleLeaveConversation}
                                            style={{ width: '100%', marginTop: '1.5rem', padding: '0.8rem', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}
                                        >
                                            <LogOut size={18} />
                                            Leave Group
                                        </button>
                                    )}
                                </div>
                            ) : (
                                /* ── Direct chat details ── */
                                (() => {
                                    const other = infoDetails.participants.find(p => !isMe(p)) ?? infoDetails.participants[infoDetails.participants.length - 1];
                                    if (!other) return null;
                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '1rem' }}>
                                            {renderCircleAvatar(other.avatarUrl, other.fullName, 80, other.isOnline)}
                                            <div style={{ fontWeight: 700, fontSize: '1.3rem', textAlign: 'center' }}>
                                                {other.fullName}
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>@{other.userName}</div>
                                            <div style={{ fontSize: '0.85rem', color: other.isOnline ? '#25D366' : 'var(--text-muted)', fontWeight: other.isOnline ? 600 : 400 }}>
                                                {other.isOnline ? 'Online' : 'Offline'}
                                            </div>

                                            <button
                                                onClick={handleDeleteConversation}
                                                style={{ width: '100%', marginTop: '1.5rem', padding: '0.8rem', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}
                                            >
                                                <Trash2 size={18} />
                                                Delete Conversation
                                            </button>
                                        </div>
                                    );
                                })()
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
