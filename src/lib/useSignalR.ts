import { useEffect, useState, useCallback, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import TokenManager from './TokenManager';
import { API_BASE_URL } from './api';
import { Message } from '@/services/conversation.service';

export function useSignalR(conversationId: number | null) {
    const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);
    const connectionRef = useRef<signalR.HubConnection | null>(null);

    // Initialize Connection
    useEffect(() => {
        if (!conversationId) return;

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
                if (message.conversationId === conversationId) {
                    setMessages(prev => {
                        // Prevent duplicates
                        if (prev.some(m => m.id === message.id)) return prev;
                        return [...prev, message];
                    });
                }
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
            });

            newConnection.on('UserOffline', (userId: string) => {
                console.log('User offline:', userId);
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
                await newConnection.invoke('JoinConversation', conversationId);
            } catch (err) {
                console.error('Error connecting to SignalR', err);
                setIsConnected(false);
            }
        };

        initSignalR();

        return () => {
            if (connectionRef.current) {
                if (connectionRef.current.state === signalR.HubConnectionState.Connected) {
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
