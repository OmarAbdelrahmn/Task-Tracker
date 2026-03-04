import { api } from '@/lib/api';
import TokenManager from '@/lib/TokenManager';

const getHeaders = (extraHeaders: Record<string, string> = {}) => {
    const token = TokenManager.getAccessToken();
    return {
        ...extraHeaders,
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
};

export interface Participant {
    userId: string;
    userName: string;
    fullName: string;
    avatarUrl: string | null;
    isOnline: boolean;
    joinedAt: string;
    lastReadAt: string | null;
}

export interface MessageFile {
    id: number;
    fileName: string;
    fileUrl: string;
    mimeType: string;
    fileSize: number;
}

export interface Message {
    id: number;
    conversationId: number;
    senderId: string;
    senderName: string;
    senderAvatar: string | null;
    body: string | null;
    type: 0 | 1 | 2; // 0 = Text, 1 = File, 2 = System
    replyToId: number | null;
    replyTo?: Message | null;
    isEdited: boolean;
    isDeleted: boolean;
    files: MessageFile[];
    createdAt: string;
}

export interface ConversationSummary {
    id: number;
    type: 'Direct' | 'Group' | 'TaskThread';
    name: string | null;
    taskId: number | null;
    participants: Participant[];
    lastMessage: Message | null;
    unreadCount: number;
    createdAt: string;
}

export interface PaginatedMessages {
    items: Message[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export class ConversationService {
    static async getConversations(): Promise<ConversationSummary[]> {
        const response = await api.get<ConversationSummary[]>('/api/conversations', { headers: getHeaders() });
        return response.data;
    }

    static async getConversationById(id: number): Promise<ConversationSummary> {
        const response = await api.get<ConversationSummary>(`/api/conversations/${id}`, { headers: getHeaders() });
        return response.data;
    }

    static async createDirectConversation(targetUserId: string): Promise<ConversationSummary> {
        const response = await api.post<ConversationSummary>('/api/conversations/direct', { targetUserId }, { headers: getHeaders() });
        return response.data;
    }

    static async createGroupConversation(name: string, memberIds: string[]): Promise<ConversationSummary> {
        const response = await api.post<ConversationSummary>('/api/conversations/group', { name, memberIds }, { headers: getHeaders() });
        return response.data;
    }

    static async addParticipant(conversationId: number, userId: string): Promise<void> {
        await api.post(`/api/conversations/${conversationId}/participants`, userId, {
            headers: getHeaders({ 'Content-Type': 'application/json' })
        });
    }

    static async removeParticipant(conversationId: number, userId: string): Promise<void> {
        await api.delete(`/api/conversations/${conversationId}/participants/${userId}`, { headers: getHeaders() });
    }

    static async markAsRead(conversationId: number): Promise<void> {
        await api.post(`/api/conversations/${conversationId}/read`, {}, { headers: getHeaders() });
    }

    static async getMessages(conversationId: number, page: number = 1, pageSize: number = 50): Promise<PaginatedMessages> {
        const response = await api.get<PaginatedMessages>(`/api/conversations/${conversationId}/messages?page=${page}&pageSize=${pageSize}`, { headers: getHeaders() });
        return response.data;
    }

    static async sendMessage(conversationId: number, body: string | null, type: 0 | 1 | 2 = 0, replyToId: number | null = null): Promise<Message> {
        const payload = {
            conversationId,
            body,
            type,
            replyToId
        };

        const response = await api.post<Message>('/api/conversations/messages', payload, { headers: getHeaders() });
        return response.data;
    }

    static async editMessage(messageId: number, newBody: string): Promise<Message> {
        const response = await api.put<Message>(`/api/conversations/messages/${messageId}`, { newBody }, { headers: getHeaders() });
        return response.data;
    }

    static async deleteMessage(messageId: number): Promise<void> {
        await api.delete(`/api/conversations/messages/${messageId}`, { headers: getHeaders() });
    }

    static async uploadMessageFile(conversationId: number, file: File): Promise<Omit<MessageFile, 'id'>> {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post<Omit<MessageFile, 'id'>>(`/api/conversations/${conversationId}/files`, formData, {
            headers: getHeaders({ 'Content-Type': 'multipart/form-data' })
        });
        return response.data;
    }
}
