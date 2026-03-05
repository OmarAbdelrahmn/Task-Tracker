import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSignalR } from '@/lib/useSignalR';
import { ConversationService, Message, Participant } from '@/services/conversation.service';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import TokenManager from '@/lib/TokenManager';
import { Loader2 } from 'lucide-react';

interface ChatWindowProps {
    conversationId: number;
    participants?: Participant[];
}

export function ChatWindow({ conversationId, participants }: ChatWindowProps) {
    const {
        isConnected, messages, typingUsers, error,
        sendTypingStart, sendTypingStop, appendMessages, setMessages
    } = useSignalR(conversationId);

    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // Optimistic messages that haven't been confirmed via SignalR ReceiveMessage yet
    const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Extract current user ID from token
    const token = TokenManager.getAccessToken();
    const currentUserId = token ? parseJwt(token).nameid || '' : '';

    // Load initial messages
    useEffect(() => {
        const loadInitial = async () => {
            setIsLoading(true);
            try {
                // Mark as read upon entering
                await ConversationService.markAsRead(conversationId);

                const res = await ConversationService.getMessages(conversationId, 1, 50);
                // API returns oldest first dynamically or newest first? The api spec says "oldest-first within the page. Load page 1 first, then page 2 for older history (infinite scroll upward)".
                // Wait, if page 1 is oldest first, but infinite scroll *upward* loads older?
                // Let's assume the API returns page 1 = newest 50. But they are sorted oldest to newest. Page 2 is older 50.
                appendMessages(res.items);
                setPage(1);
                setHasMore(res.page < res.totalPages);

                // Auto scroll to bottom initially
                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
                }, 100);
            } catch (err) {
                console.error('Failed to load messages', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadInitial();
    }, [conversationId, appendMessages]);

    // Infinite scroll loading older messages
    const handleScroll = async () => {
        if (!scrollContainerRef.current) return;

        const { scrollTop } = scrollContainerRef.current;
        if (scrollTop === 0 && hasMore && !isLoadingMore) {
            setIsLoadingMore(true);
            try {
                const nextPage = page + 1;
                const res = await ConversationService.getMessages(conversationId, nextPage, 50);

                // Save current scroll height to restore scroll position after prepending
                const previousHeight = scrollContainerRef.current.scrollHeight;

                appendMessages(res.items, true); // prepend
                setPage(nextPage);
                setHasMore(res.page < res.totalPages);

                // Restore scroll position
                setTimeout(() => {
                    if (scrollContainerRef.current) {
                        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight - previousHeight;
                    }
                }, 0);
            } catch (e) {
                console.error("Failed to load older messages", e);
            } finally {
                setIsLoadingMore(false);
            }
        }
    };

    // Auto scroll when new REAL message arrives AND we are already near bottom
    useEffect(() => {
        if (scrollContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
            // If user is scrolled near bottom
            if (scrollHeight - scrollTop - clientHeight < 150) {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, [messages]);

    const handleSendMessageOptimistic = (body: string | null, type: 0 | 1 | 2, tempId: number) => {
        const dummy: Message = {
            id: tempId,
            conversationId,
            senderId: currentUserId,
            senderName: 'Me',
            senderAvatar: null,
            body,
            type,
            replyToId: null,
            isEdited: false,
            isDeleted: false,
            files: [],
            createdAt: new Date().toISOString()
        };
        setOptimisticMessages(prev => [...prev, dummy]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    };

    const handleMessageSentDone = (tempId: number) => {
        setOptimisticMessages(prev => prev.filter(m => m.id !== tempId));
    };

    if (isLoading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '300px' }}>
            <Loader2 className="spin" style={{ animation: 'spin 1s linear infinite' }} />
        </div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--background)', borderRadius: 'inherit' }}>
            {/* Messages Area */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column' }}
            >
                {isLoadingMore && (
                    <div style={{ textAlign: 'center', padding: '0.5rem', opacity: 0.5 }}>
                        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    </div>
                )}

                {messages.length === 0 && optimisticMessages.length === 0 && !isLoadingMore && (
                    <div style={{ margin: 'auto', color: 'var(--text-muted)', textAlign: 'center' }}>
                        No messages yet. Start the conversation!
                    </div>
                )}

                {/* Display real messages */}
                {messages.map(msg => (
                    <MessageBubble key={`msg-${msg.id}`} message={msg} currentUserId={currentUserId} participants={participants} />
                ))}

                {/* Display optimistic messages with opacity */}
                {optimisticMessages.map(msg => (
                    <div key={`opt-${msg.id}`} style={{ opacity: 0.6 }}>
                        <MessageBubble message={msg} currentUserId={currentUserId} participants={participants} />
                    </div>
                ))}

                {/* Typing Indicator */}
                {typingUsers.size > 0 && (
                    <div style={{ alignSelf: 'flex-start', color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', marginBottom: '1rem' }}>
                        {typingUsers.size === 1 ? 'Someone is typing...' : 'Several people are typing...'}
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <ChatInput
                conversationId={conversationId}
                onTypingStart={sendTypingStart}
                onTypingStop={sendTypingStop}
                onSendMessageOptimistic={handleSendMessageOptimistic}
                onMessageSentDone={handleMessageSentDone}
            />
        </div>
    );
}

// Helper to decode JWT to get current user ID
function parseJwt(token: string) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return {};
    }
}
