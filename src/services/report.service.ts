import { api } from '@/lib/api';
import TokenManager from '@/lib/TokenManager';

const getHeaders = (extraHeaders: Record<string, string> = {}) => {
    const token = TokenManager.getAccessToken();
    return {
        ...extraHeaders,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

// ─── Shared / Embedded Types ──────────────────────────────────────────────────

export interface ReportAssignee {
    userId: string;
    userName: string;
    fullName: string;
    avatarUrl: string | null;
    assignedById: string;
    assignedByUserName: string;
    assignedByFullName: string;
    assignedAt: string;
}

export interface ReportOccurrence {
    id: number;
    dueDate: string;
    status: number;
    progress: number;
    notes: string | null;
    completedAt: string | null;
}

// ─── Endpoint 1 — User Task Summary ──────────────────────────────────────────

export interface UserTaskSummary {
    userId: string;
    userName: string;
    fullName: string;
    avatarUrl: string | null;
    totalTasks: number;
    todoCount: number;
    inProgressCount: number;
    doneCount: number;
    archivedCount: number;
    overdueTasks: number;
    averageProgress: number;
    recurringTaskCount: number;
}

// ─── Endpoint 2 — User Tasks (paginated) ─────────────────────────────────────

export interface UserTasksFilters {
    isCompleted?: boolean;
    statuses?: number[];
    priority?: number;
    dueBefore?: string;
    dueAfter?: string;
    search?: string;
    page?: number;
    pageSize?: number;
}

export interface UserTaskItem {
    id: number;
    title: string;
    description: string | null;
    status: number;
    priority: number;
    progress: number;
    dueDate: string | null;
    isOverdue: boolean;
    isRecurring: boolean;
    recurrenceType: number | null;
    recurrenceInterval: number | null;
    recurrenceStartDate: string | null;
    recurrenceEndDate: string | null;
    createdAt: string;
    updatedAt: string | null;
    createdById: string;
    assignees: ReportAssignee[];
    occurrences: ReportOccurrence[];
    conversationId: number | null;
}

export interface PaginatedUserTasks {
    items: UserTaskItem[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

// ─── Endpoint 3 — Task Detail ─────────────────────────────────────────────────

export interface TaskDetail {
    id: number;
    title: string;
    description: string | null;
    status: number;
    priority: number;
    progress: number;
    dueDate: string | null;
    isOverdue: boolean;
    isRecurring: boolean;
    recurrenceType: number | null;
    recurrenceInterval: number | null;
    recurrenceStartDate: string | null;
    recurrenceEndDate: string | null;
    createdAt: string;
    updatedAt: string | null;
    createdById: string;
    assignees: ReportAssignee[];
    occurrences: ReportOccurrence[];
    conversationId: number | null;
}

// ─── Endpoint 4 — Daily Tasks ─────────────────────────────────────────────────

export interface DailyTasksFilters {
    date?: string;
    status?: number;
    page?: number;
    pageSize?: number;
}

export interface DailyTaskItem {
    taskId: number;
    title: string;
    description: string | null;
    status: number;
    priority: number;
    progress: number;
    dueDate: string | null;
    isOverdue: boolean;
    isRecurring: boolean;
    assignees: ReportAssignee[];
}

export interface PaginatedDailyTasks {
    items: DailyTaskItem[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class ReportService {
    /** GET /api/UserTaskReport/users/{userId}/summary */
    static async getUserTaskSummary(userId: string): Promise<UserTaskSummary> {
        const response = await api.get<UserTaskSummary>(
            `/api/UserTaskReport/users/${userId}/summary`,
            { headers: getHeaders() }
        );
        return response.data;
    }

    /** GET /api/UserTaskReport/users/{userId}/tasks */
    static async getUserTasks(
        userId: string,
        filters: UserTasksFilters = {}
    ): Promise<PaginatedUserTasks> {
        // Build query string – only include defined values
        const params = new URLSearchParams();
        if (filters.isCompleted !== undefined)
            params.set('isCompleted', String(filters.isCompleted));
        if (filters.statuses?.length)
            filters.statuses.forEach((s) => params.append('statuses', String(s)));
        if (filters.priority !== undefined)
            params.set('priority', String(filters.priority));
        if (filters.dueBefore) params.set('dueBefore', filters.dueBefore);
        if (filters.dueAfter) params.set('dueAfter', filters.dueAfter);
        if (filters.search) params.set('search', filters.search);
        if (filters.page) params.set('page', String(filters.page));
        if (filters.pageSize) params.set('pageSize', String(filters.pageSize));

        const query = params.toString();
        const url = `/api/UserTaskReport/users/${userId}/tasks${query ? `?${query}` : ''}`;

        const response = await api.get<PaginatedUserTasks>(url, {
            headers: getHeaders(),
        });
        return response.data;
    }

    /** GET /api/UserTaskReport/tasks/{taskId} */
    static async getTaskDetail(taskId: number): Promise<TaskDetail> {
        const response = await api.get<TaskDetail>(
            `/api/UserTaskReport/tasks/${taskId}`,
            { headers: getHeaders() }
        );
        return response.data;
    }

    /** GET /api/UserTaskReport/daily */
    static async getDailyTasks(
        filters: DailyTasksFilters = {}
    ): Promise<PaginatedDailyTasks> {
        const params = new URLSearchParams();
        if (filters.date) params.set('date', filters.date);
        if (filters.status !== undefined)
            params.set('status', String(filters.status));
        if (filters.page) params.set('page', String(filters.page));
        if (filters.pageSize) params.set('pageSize', String(filters.pageSize));

        const query = params.toString();
        const url = `/api/UserTaskReport/daily${query ? `?${query}` : ''}`;

        const response = await api.get<PaginatedDailyTasks>(url, {
            headers: getHeaders(),
        });
        return response.data;
    }
}
