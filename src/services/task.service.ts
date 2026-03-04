import { api } from '@/lib/api';
import TokenManager from '@/lib/TokenManager';

const getHeaders = (extraHeaders: Record<string, string> = {}) => {
    const token = TokenManager.getAccessToken();
    return {
        ...extraHeaders,
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
};

export interface AssignableUser {
    id: string;
    userName: string;
    fullName: string;
    avatarUrl: string | null;
    isOnline: boolean;
}

export interface AssigneeSummary {
    userId: string;
    userName: string;
    fullName: string;
    avatarUrl: string | null;
    assignedById: string;
    assignedAt: string;
}

export interface TaskSummaryResponse {
    id: number;
    title: string;
    status: 'Todo' | 'InProgress' | 'Done' | 'Cancelled';
    priority: 'Low' | 'Medium' | 'High' | 'Urgent';
    progress: number;
    dueDate: string | null;
    isRecurring: boolean;
    createdAt: string;
    createdById: string | null;
    isDeleted: boolean;
    assignees: AssigneeSummary[];
}

export interface TaskFileResponse {
    id: string;
    fileName: string;
    fileUrl: string;
    mimeType: string;
    fileSize: number;
    occurrenceId: number | null;
    createdAt: string;
    createdById: string;
}

export interface TaskOccurrenceResponse {
    id: number;
    dueDate: string;
    status: number;
    progress: number;
    notes: string | null;
    completedAt: string | null;
    files: TaskFileResponse[];
}

export interface TaskResponse {
    id: number;
    title: string;
    description: string | null;
    status: number;
    priority: number;
    progress: number;
    dueDate: string | null;
    isRecurring: boolean;
    recurrenceType: number | null;
    recurrenceInterval: number | null;
    recurrenceStartDate: string | null;
    recurrenceEndDate: string | null;
    createdAt: string;
    updatedAt: string | null;
    createdById: string | null;
    updatedById: string | null;
    isDeleted: boolean;
    deletedAt: string | null;
    assignees: AssigneeSummary[];
    files: TaskFileResponse[];
    occurrences: TaskOccurrenceResponse[];
    conversationId: string | null;
}

export interface UpdateTaskRequest {
    title: string;
    description: string;
    priority: number;
    dueDate: string;
    isRecurring: boolean;
    recurrenceType: number;
    recurrenceInterval: number;
    recurrenceStartDate: string;
    recurrenceEndDate: string;
}

export interface CreateTaskRequest {
    title: string;
    description: string;
    priority: number;
    dueDate: string;
    isRecurring: boolean;
    recurrenceType: number;
    recurrenceInterval: number;
    recurrenceStartDate: string;
    recurrenceEndDate: string;
    assigneeIds: string[];
}

export class TaskService {
    static async getAssignableUsers(): Promise<AssignableUser[]> {
        const response = await api.get<AssignableUser[]>('/api/me/assignable', { headers: getHeaders() });
        return response.data;
    }

    static async getMyTasks(): Promise<TaskSummaryResponse[]> {
        const response = await api.get<TaskSummaryResponse[]>('/api/tasks/my', { headers: getHeaders() });
        return response.data;
    }

    static async getTaskById(id: number): Promise<TaskResponse> {
        const response = await api.get<TaskResponse>(`/api/tasks/${id}`, { headers: getHeaders() });
        return response.data;
    }

    static async createTask(data: CreateTaskRequest): Promise<any> {
        const response = await api.post('/api/tasks', data, { headers: getHeaders() });
        return response.data;
    }

    // PUT /api/tasks/{id}
    static async updateTask(id: number, data: UpdateTaskRequest): Promise<any> {
        const response = await api.put(`/api/tasks/${id}`, data, { headers: getHeaders() });
        return response.data;
    }

    // DELETE /api/tasks/{id}
    static async deleteTask(id: number): Promise<void> {
        await api.delete(`/api/tasks/${id}`, { headers: getHeaders() });
    }

    // PATCH /api/tasks/{id}/progress
    static async updateProgress(id: number, progress: number): Promise<void> {
        await api.patch(`/api/tasks/${id}/progress`, { progress }, { headers: getHeaders() });
    }

    // POST /api/tasks/{id}/assignees
    static async addAssignee(id: number, userId: string): Promise<void> {
        await api.post(`/api/tasks/${id}/assignees`, { userId }, { headers: getHeaders() });
    }

    // DELETE /api/tasks/{id}/assignees/{userId}
    static async removeAssignee(id: number, userId: string): Promise<void> {
        await api.delete(`/api/tasks/${id}/assignees/${userId}`, { headers: getHeaders() });
    }
}
