export const getPriorityString = (val: number | string) => {
    if (typeof val === 'string') return val;
    switch (val) {
        case 0: return 'Low';
        case 1: return 'Medium';
        case 2: return 'High';
        case 3: return 'Urgent';
        default: return 'Medium';
    }
};

export const getStatusString = (val: number | string) => {
    if (typeof val === 'string') return val;
    switch (val) {
        case 0: return 'Todo';
        case 1: return 'InProgress';
        case 2: return 'Done';
        case 3: return 'Cancelled';
        default: return 'Todo';
    }
};

export const getPriorityColor = (rawPriority: number | string) => {
    const priority = getPriorityString(rawPriority);
    switch (priority) {
        case 'Urgent': return 'var(--danger)';
        case 'High': return 'var(--warning)';
        case 'Medium': return 'var(--primary)';
        case 'Low': return 'var(--success)';
        default: return 'var(--text-muted)';
    }
};

export const getStatusColor = (rawStatus: number | string) => {
    const status = getStatusString(rawStatus);
    switch (status) {
        case 'Done': return 'var(--success)';
        case 'InProgress': return 'var(--warning)';
        case 'Todo': return 'var(--text-muted)';
        case 'Cancelled': return 'var(--danger)';
        default: return 'var(--border)';
    }
};

export const resolveAvatar = (url: string | null | undefined, apiBaseUrl: string): string | null => {
    if (!url) return null;
    const base = apiBaseUrl.replace(/\/$/, '');
    const path = url.startsWith('/') ? url : `/${url}`;
    return url.startsWith('http') ? url : `${base}${path}`;
};

export const formatDate = (d: string | null | undefined, locale: string = 'en') =>
    d ? new Date(d).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
