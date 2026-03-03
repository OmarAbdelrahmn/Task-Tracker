"use client";

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { TaskService, TaskSummaryResponse } from '@/services/task.service';
import { Calendar, User as UserIcon, AlertCircle, RotateCw } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import { CreateTaskButton } from '@/components/CreateTaskButton';
import { TaskDetailsModal } from '@/components/TaskDetailsModal';

export default function MyTasksPage() {
    const t = useTranslations('Tasks');
    const locale = useLocale();
    const isRtl = locale === 'ar';
    const [tasks, setTasks] = useState<TaskSummaryResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    useEffect(() => {
        loadTasks();
    }, []);

    const loadTasks = async () => {
        try {
            setLoading(true);
            const data = await TaskService.getMyTasks();
            console.log("Tasks Data:", data);
            setTasks(data);
            setError(null);
        } catch (err: any) {
            console.error('Failed to load tasks', err);
            setError(err.message || 'An error occurred while loading tasks.');
        } finally {
            setLoading(false);
        }
    };

    const getPriorityString = (val: number | string) => {
        if (typeof val === 'string') return val;
        switch (val) {
            case 0: return 'Low';
            case 1: return 'Medium';
            case 2: return 'High';
            case 3: return 'Urgent';
            default: return 'Medium';
        }
    }

    const getStatusString = (val: number | string) => {
        if (typeof val === 'string') return val;
        switch (val) {
            case 0: return 'Todo';
            case 1: return 'InProgress';
            case 2: return 'Done';
            case 3: return 'Cancelled';
            default: return 'Todo';
        }
    }

    const getPriorityColor = (rawPriority: number | string) => {
        const priority = getPriorityString(rawPriority);
        switch (priority) {
            case 'Urgent': return 'var(--danger)';
            case 'High': return 'var(--warning)';
            case 'Medium': return 'var(--primary)';
            case 'Low': return 'var(--success)';
            default: return 'var(--text-muted)';
        }
    };

    const getStatusColor = (rawStatus: number | string) => {
        const status = getStatusString(rawStatus);
        switch (status) {
            case 'Done': return 'var(--success)';
            case 'InProgress': return 'var(--warning)';
            case 'Todo': return 'var(--text-muted)';
            case 'Cancelled': return 'var(--danger)';
            default: return 'var(--border)';
        }
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>{t('myTasks')}</h1>
                <CreateTaskButton locale={locale} onSuccess={loadTasks} />
            </div>

            {error && (
                <div style={{ padding: '1rem', backgroundColor: 'color-mix(in srgb, var(--danger) 15%, transparent)', color: 'var(--danger)', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}

            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} style={{ height: '180px', background: 'var(--surface-hover)', borderRadius: '16px', animation: 'pulse 1.5s infinite ease-in-out' }} />
                    ))}
                </div>
            ) : tasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'var(--surface, rgba(255,255,255,0.02))', borderRadius: '16px', border: '1px dashed var(--border)' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '1rem' }}>{t('noTasksFound') || 'No tasks assigned to you right now.'}</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {tasks.map(task => (
                        <div key={task.id} className="glass-card animate-fade-in" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }} onClick={() => { setSelectedTaskId(task.id); setIsDetailsOpen(true); }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--foreground)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {task.title}
                                </h3>
                                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                                    {task.isRecurring && (
                                        <div style={{ background: 'color-mix(in srgb, var(--primary) 15%, transparent)', color: 'var(--primary)', padding: '0.2rem 0.5rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.25rem' }} title={t('recurring')}>
                                            <RotateCw size={12} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '20px', backgroundColor: 'color-mix(in srgb, ' + getStatusColor(task.status) + ' 15%, transparent)', color: getStatusColor(task.status) }}>
                                    {t(`status${getStatusString(task.status)}`) || getStatusString(task.status)}
                                </span>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '20px', backgroundColor: 'color-mix(in srgb, ' + getPriorityColor(task.priority) + ' 15%, transparent)', color: getPriorityColor(task.priority) }}>
                                    {t(`priority${getPriorityString(task.priority)}`) || getPriorityString(task.priority)}
                                </span>
                            </div>

                            {task.dueDate && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                    <Calendar size={14} />
                                    <span>{t('dueDateLabel')} {new Date(task.dueDate).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            )}

                            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>{t('progress')}</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground)' }}>{task.progress}%</span>
                                </div>
                                <div style={{ width: '100%', height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${task.progress}%`, background: task.progress === 100 ? 'var(--success)' : 'var(--primary)', borderRadius: '3px', transition: 'width 0.5s ease' }} />
                                </div>
                            </div>

                            {task.assignees && task.assignees.length > 0 && (
                                <div style={{ display: 'flex', paddingTop: '0.5rem', gap: '0.25rem' }}>
                                    {task.assignees.slice(0, 5).map((assignee, idx) => {
                                        const rawAvatarUrl = (assignee as any).AvatarUrl || assignee.avatarUrl;
                                        const normalizedApiBaseUrl = API_BASE_URL.replace(/\/$/, '');
                                        const normalizedAvatarPath = rawAvatarUrl ? (rawAvatarUrl.startsWith('/') ? rawAvatarUrl : `/${rawAvatarUrl}`) : '';
                                        const finalAvatarUrl = rawAvatarUrl ? (rawAvatarUrl.startsWith('http') ? rawAvatarUrl : `${normalizedApiBaseUrl}${normalizedAvatarPath}`) : null;

                                        return (
                                            <div key={assignee.userId} style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--surface-hover)', border: '2px solid var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginLeft: isRtl ? (idx > 0 ? '-10px' : '0') : '0', marginRight: !isRtl ? (idx > 0 ? '-10px' : '0') : '0', zIndex: 10 - idx }} title={assignee.fullName || assignee.userName}>
                                                {finalAvatarUrl ? <img src={finalAvatarUrl} alt={assignee.userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <UserIcon size={12} color="var(--text-muted)" />}
                                            </div>
                                        );
                                    })}
                                    {task.assignees.length > 5 && (
                                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--surface-hover)', border: '2px solid var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', marginLeft: isRtl ? '-10px' : '0', marginRight: !isRtl ? '-10px' : '0', zIndex: 0 }}>
                                            +{task.assignees.length - 5}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <TaskDetailsModal
                taskId={selectedTaskId}
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
                onDeleted={loadTasks}
                onUpdated={loadTasks}
                locale={locale}
            />
        </div>
    );
}
