import { useEffect, useState, useCallback, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import TokenManager from './TokenManager';
import { API_BASE_URL } from './api';
import { Message } from '@/services/conversation.service';

interface SignalRCallbacks {
    onUserOnline?: (userId: string) => void;
    onUserOffline?: (userId: string) => void;
    onConversationUpdated?: (conversationId: number, newName: string) => void;
    onParticipantLeft?: (conversationId: number, userId: string) => void;
    onConversationDeleted?: (conversationId: number) => void;
    onReceiveMessage?: (message: Message) => void;
}

export function useSignalR(conversationId: number | null, callbacks?: SignalRCallbacks) {
    const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);
    const connectionRef = useRef<signalR.HubConnection | null>(null);

    const callbacksRef = useRef(callbacks);
    useEffect(() => {
        callbacksRef.current = callbacks;
    }, [callbacks]);

    // Initialize Connection
    useEffect(() => {
        const initSignalR = async () => {
            const newConnection = new signalR.HubConnectionBuilder()
                .withUrl(`${API_BASE_URL}/hubs/chat`, {
                    accessTokenFactory: () => TokenManager.getAccessToken() || ''
                })
                .withAutomaticReconnect()
                .configureLogging(signalR.LogLevel.Information)
                .build();

            connectionRef.current = newConnection;

            // Setup Event Handlers
            newConnection.on('ReceiveMessage', (message: Message) => {
                if (conversationId === null || message.conversationId === conversationId) {
                    setMessages(prev => {
                        // Prevent duplicates
                        if (prev.some(m => m.id === message.id)) return prev;
                        return [...prev, message];
                    });
                }
                callbacksRef.current?.onReceiveMessage?.(message);
            });

            newConnection.on('MessageEdited', (editedMessage: Message) => {
                if (editedMessage.conversationId === conversationId) {
                    setMessages(prev => prev.map(m => m.id === editedMessage.id ? editedMessage : m));
                }
            });

            newConnection.on('MessageDeleted', ({ messageId, conversationId: evtConvId }: { messageId: number, conversationId: number }) => {
                if (evtConvId === conversationId || evtConvId === undefined) { // fallback if server doesn't send config properly
                    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isDeleted: true, body: null } : m));
                }
            });

            newConnection.on('UserTyping', ({ userId, conversationId: evtConvId }: { userId: string, conversationId: number }) => {
                if (evtConvId === conversationId) {
                    setTypingUsers(prev => {
                        const newSet = new Set(prev);
                        newSet.add(userId);
                        return newSet;
                    });
                }
            });

            newConnection.on('UserStoppedTyping', ({ userId, conversationId: evtConvId }: { userId: string, conversationId: number }) => {
                if (evtConvId === conversationId) {
                    setTypingUsers(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(userId);
                        return newSet;
                    });
                }
            });

            newConnection.on('UserOnline', (userId: string) => {
                console.log('User online:', userId);
                callbacksRef.current?.onUserOnline?.(userId);
            });

            newConnection.on('UserOffline', (userId: string) => {
                console.log('User offline:', userId);
                callbacksRef.current?.onUserOffline?.(userId);
            });

            newConnection.on('ConversationUpdated', ({ conversationId: evtConvId, newName }: { conversationId: number, newName: string }) => {
                callbacksRef.current?.onConversationUpdated?.(evtConvId, newName);
            });

            newConnection.on('ParticipantLeft', ({ conversationId: evtConvId, userId }: { conversationId: number, userId: string }) => {
                callbacksRef.current?.onParticipantLeft?.(evtConvId, userId);
            });

            newConnection.on('ConversationDeleted', ({ conversationId: evtConvId }: { conversationId: number }) => {
                callbacksRef.current?.onConversationDeleted?.(evtConvId);
            });

            newConnection.on('Error', (errMessage: string) => {
                console.error('SignalR Error:', errMessage);
                setError(errMessage);
            });

            try {
                await newConnection.start();
                setIsConnected(true);
                setConnection(newConnection);

                // Ensure we join the specific conversation room explicitly even if server auto-joins based on DB
                if (conversationId) {
                    await newConnection.invoke('JoinConversation', conversationId);
                }
            } catch (err) {
                console.error('Error connecting to SignalR', err);
                setIsConnected(false);
            }
        };

        initSignalR();

        return () => {
            if (connectionRef.current) {
                if (connectionRef.current.state === signalR.HubConnectionState.Connected && conversationId) {
                    connectionRef.current.invoke('LeaveConversation', conversationId).catch(console.error);
                }
                connectionRef.current.stop();
            }
        };
    }, [conversationId]);

    const sendTypingStart = useCallback(async () => {
        if (connection?.state === signalR.HubConnectionState.Connected && conversationId) {
            try {
                await connection.invoke('TypingStart', conversationId);
            } catch (err) {
                console.error('Failed to send TypingStart', err);
            }
        }
    }, [connection, conversationId]);

    const sendTypingStop = useCallback(async () => {
        if (connection?.state === signalR.HubConnectionState.Connected && conversationId) {
            try {
                await connection.invoke('TypingStop', conversationId);
            } catch (err) {
                console.error('Failed to send TypingStop', err);
            }
        }
    }, [connection, conversationId]);

    // Expose method to manually prepend/append messages from REST API pagination
    const appendMessages = useCallback((newMessages: Message[], prepend = false) => {
        setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m.id));

            if (prepend) {
                return [...uniqueNewMessages, ...prev].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            } else {
                return [...prev, ...uniqueNewMessages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            }
        });
    }, []);

    return {
        connection,
        isConnected,
        messages,
        typingUsers,
        error,
        sendTypingStart,
        sendTypingStop,
        appendMessages,
        setMessages // direct access if needed for optimistic updates
    };
}
