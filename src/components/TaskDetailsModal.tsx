"use client";

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { TaskService, TaskResponse, UpdateTaskRequest, AssignableUser } from '@/services/task.service';
import {
    X, Calendar, User as UserIcon, AlertCircle, FileText,
    CheckCircle2, RotateCw, Clock, History, File, Trash2, Edit3,
    Save, Plus, UserMinus, Loader2, MessageSquare
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import { TaskChatModal } from './chat/TaskChatModal';

interface TaskDetailsModalProps {
    taskId: number | null;
    isOpen: boolean;
    onClose: () => void;
    onDeleted?: () => void;
    onUpdated?: () => void;
    locale: string;
}

export function TaskDetailsModal({ taskId, isOpen, onClose, onDeleted, onUpdated, locale }: TaskDetailsModalProps) {
    const t = useTranslations('Tasks');
    const isRtl = locale === 'ar';

    const [loading, setLoading] = useState(false);
    const [task, setTask] = useState<TaskResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    // Edit mode
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editPriority, setEditPriority] = useState(1);
    const [editDueDate, setEditDueDate] = useState('');
    const [editIsRecurring, setEditIsRecurring] = useState(false);
    const [editRecurrenceType, setEditRecurrenceType] = useState(0);
    const [editRecurrenceInterval, setEditRecurrenceInterval] = useState(1);
    const [editRecurrenceStart, setEditRecurrenceStart] = useState('');
    const [editRecurrenceEnd, setEditRecurrenceEnd] = useState('');
    const [saving, setSaving] = useState(false);

    // Progress
    const [progressValue, setProgressValue] = useState(0);
    const [savingProgress, setSavingProgress] = useState(false);

    // Assignees
    const [allUsers, setAllUsers] = useState<AssignableUser[]>([]);
    const [addingAssignee, setAddingAssignee] = useState(false);
    const [showAddAssignee, setShowAddAssignee] = useState(false);
    const [removingUserId, setRemovingUserId] = useState<string | null>(null);

    // Delete
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Chat
    const [isChatOpen, setIsChatOpen] = useState(false);

    useEffect(() => {
        if (isOpen && taskId) {
            fetchTaskDetails(taskId);
            setIsEditing(false);
            setShowAddAssignee(false);
            setConfirmDelete(false);
            setActionError(null);
        } else {
            setTask(null);
        }
    }, [isOpen, taskId]);

    const fetchTaskDetails = async (id: number) => {
        try {
            setLoading(true);
            setError(null);
            const data = await TaskService.getTaskById(id);
            setTask(data);
            setProgressValue(data.progress);
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Failed to load task details.');
        } finally {
            setLoading(false);
        }
    };

    const startEdit = () => {
        if (!task) return;
        setEditTitle(task.title);
        setEditDescription(task.description || '');
        setEditPriority(task.priority);
        setEditDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : '');
        setEditIsRecurring(task.isRecurring);
        setEditRecurrenceType(task.recurrenceType ?? 0);
        setEditRecurrenceInterval(task.recurrenceInterval ?? 1);
        setEditRecurrenceStart(task.recurrenceStartDate ? new Date(task.recurrenceStartDate).toISOString().slice(0, 16) : '');
        setEditRecurrenceEnd(task.recurrenceEndDate ? new Date(task.recurrenceEndDate).toISOString().slice(0, 16) : '');
        setIsEditing(true);
        setActionError(null);
    };

    const saveEdit = async () => {
        if (!task) return;
        setSaving(true);
        setActionError(null);
        try {
            const payload: UpdateTaskRequest = {
                title: editTitle,
                description: editDescription,
                priority: editPriority,
                dueDate: editDueDate ? new Date(editDueDate).toISOString() : new Date().toISOString(),
                isRecurring: editIsRecurring,
                recurrenceType: editRecurrenceType,
                recurrenceInterval: editRecurrenceInterval,
                recurrenceStartDate: editRecurrenceStart ? new Date(editRecurrenceStart).toISOString() : new Date().toISOString(),
                recurrenceEndDate: editRecurrenceEnd ? new Date(editRecurrenceEnd).toISOString() : new Date().toISOString(),
            };
            await TaskService.updateTask(task.id, payload);
            await fetchTaskDetails(task.id);
            setIsEditing(false);
            if (onUpdated) onUpdated();
        } catch (err: any) {
            setActionError(err?.response?.data?.detail || t('errorMessage'));
        } finally {
            setSaving(false);
        }
    };

    const saveProgress = async () => {
        if (!task) return;
        setSavingProgress(true);
        setActionError(null);
        try {
            await TaskService.updateProgress(task.id, progressValue);
            await fetchTaskDetails(task.id);
            if (onUpdated) onUpdated();
        } catch (err: any) {
            setActionError(err?.response?.data?.detail || t('errorMessage'));
        } finally {
            setSavingProgress(false);
        }
    };

    const handleDelete = async () => {
        if (!task) return;
        setDeleting(true);
        setActionError(null);
        try {
            await TaskService.deleteTask(task.id);
            onClose();
            if (onDeleted) onDeleted();
        } catch (err: any) {
            setActionError(err?.response?.data?.detail || t('errorMessage'));
            setDeleting(false);
        }
    };

    const handleAddAssignee = async (userId: string) => {
        if (!task) return;
        setAddingAssignee(true);
        setActionError(null);
        try {
            await TaskService.addAssignee(task.id, userId);
            await fetchTaskDetails(task.id);
            setShowAddAssignee(false);
        } catch (err: any) {
            setActionError(err?.response?.data?.detail || t('errorMessage'));
        } finally {
            setAddingAssignee(false);
        }
    };

    const handleRemoveAssignee = async (userId: string) => {
        if (!task) return;
        setRemovingUserId(userId);
        setActionError(null);
        try {
            await TaskService.removeAssignee(task.id, userId);
            await fetchTaskDetails(task.id);
        } catch (err: any) {
            setActionError(err?.response?.data?.detail || t('errorMessage'));
        } finally {
            setRemovingUserId(null);
        }
    };

    const loadAllUsers = async () => {
        if (allUsers.length === 0) {
            const users = await TaskService.getAssignableUsers().catch(() => []);
            setAllUsers(users);
        }
        setShowAddAssignee(true);
    };

    if (!isOpen) return null;

    const getPriorityString = (val: number | string) => {
        if (typeof val === 'string') return val;
        return ['Low', 'Medium', 'High', 'Urgent'][val as number] ?? 'Medium';
    };
    const getStatusString = (val: number | string) => {
        if (typeof val === 'string') return val;
        return ['Todo', 'InProgress', 'Done', 'Cancelled'][val as number] ?? 'Todo';
    };
    const getStatusColor = (raw: number | string) => {
        const s = getStatusString(raw);
        return s === 'Done' ? 'var(--success)' : s === 'InProgress' ? 'var(--warning)' : s === 'Cancelled' ? 'var(--danger)' : 'var(--text-muted)';
    };
    const getPriorityColor = (raw: number | string) => {
        const p = getPriorityString(raw);
        return p === 'Urgent' ? 'var(--danger)' : p === 'High' ? 'var(--warning)' : p === 'Medium' ? 'var(--primary)' : 'var(--success)';
    };
    const formatDate = (d: string | null | undefined) =>
        d ? new Date(d).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

    const avatarUrl = (raw: string | null | undefined) => {
        if (!raw) return null;
        const base = API_BASE_URL.replace(/\/$/, '');
        const path = raw.startsWith('/') ? raw : `/${raw}`;
        return raw.startsWith('http') ? raw : `${base}${path}`;
    };

    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '0.55rem 0.8rem', borderRadius: '8px',
        background: 'var(--surface)', border: '1px solid var(--border)',
        color: 'var(--foreground)', fontFamily: 'inherit', fontSize: '0.9rem',
        outline: 'none', boxSizing: 'border-box',
    };

    const assignedIds = task?.assignees.map(a => a.userId) ?? [];
    const unassignedUsers = allUsers.filter(u => !assignedIds.includes(u.id));

    return (
        <div
            style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'stretch', justifyContent: isRtl ? 'flex-start' : 'flex-end', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', direction: isRtl ? 'rtl' : 'ltr' }}
            onClick={onClose}
        >
            <div
                style={{ background: 'var(--background)', width: '100%', maxWidth: '580px', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: isRtl ? '4px 0 24px rgba(0,0,0,0.25)' : '-4px 0 24px rgba(0,0,0,0.25)' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--background)', zIndex: 10, gap: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
                        {task && <>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '20px', backgroundColor: `color-mix(in srgb, ${getStatusColor(task.status)} 15%, transparent)`, color: getStatusColor(task.status) }}>
                                {t(`status${getStatusString(task.status)}`)}
                            </span>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '20px', backgroundColor: `color-mix(in srgb, ${getPriorityColor(task.priority)} 15%, transparent)`, color: getPriorityColor(task.priority) }}>
                                {t(`priority${getPriorityString(task.priority)}`)}
                            </span>
                        </>}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                        {task && !isEditing && (
                            <button onClick={startEdit} title={t('edit') || 'Edit'} style={{ background: 'var(--surface)', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: '0.45rem', borderRadius: '8px', display: 'flex' }}>
                                <Edit3 size={16} />
                            </button>
                        )}
                        {task && task.conversationId && !isEditing && (
                            <button onClick={() => setIsChatOpen(true)} title="Discussion" style={{ background: 'var(--surface)', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: '0.45rem', borderRadius: '8px', display: 'flex' }}>
                                <MessageSquare size={16} />
                            </button>
                        )}
                        {task && !confirmDelete && (
                            <button onClick={() => setConfirmDelete(true)} title={t('deleteTask') || 'Delete'} style={{ background: 'var(--surface)', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '0.45rem', borderRadius: '8px', display: 'flex' }}>
                                <Trash2 size={16} />
                            </button>
                        )}
                        <button onClick={onClose} style={{ background: 'var(--surface)', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.45rem', borderRadius: '8px', display: 'flex' }}>
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Action errors */}
                    {actionError && (
                        <div style={{ padding: '0.75rem 1rem', background: 'color-mix(in srgb, var(--danger) 12%, transparent)', color: 'var(--danger)', borderRadius: '10px', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.875rem' }}>
                            <AlertCircle size={16} /> {actionError}
                        </div>
                    )}

                    {/* Delete confirm */}
                    {confirmDelete && (
                        <div style={{ padding: '1rem', background: 'color-mix(in srgb, var(--danger) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 25%, transparent)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <p style={{ margin: 0, fontWeight: 600, color: 'var(--foreground)' }}>{t('confirmDelete') || 'Are you sure you want to delete this task?'}</p>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={handleDelete} disabled={deleting} style={{ padding: '0.5rem 1rem', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem' }}>
                                    {deleting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
                                    {t('confirmDeleteYes') || 'Delete'}
                                </button>
                                <button onClick={() => setConfirmDelete(false)} style={{ padding: '0.5rem 1rem', background: 'var(--surface)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem' }}>
                                    {t('cancel')}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Loading skeletons */}
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {[240, 80, 120, 100].map((h, i) => (
                                <div key={i} style={{ height: `${h}px`, background: 'var(--surface-hover)', borderRadius: '8px', animation: 'pulse 1.5s infinite ease-in-out' }} />
                            ))}
                        </div>
                    ) : task ? (
                        <>
                            {/* Title & Description — Edit or View */}
                            {isEditing ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>{t('title')}</label>
                                    <input value={editTitle} onChange={e => setEditTitle(e.target.value)} style={inputStyle} />

                                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>{t('description') || 'Description'}</label>
                                    <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical' }} />

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>{t('priority')}</label>
                                            <select value={editPriority} onChange={e => setEditPriority(Number(e.target.value))} style={inputStyle}>
                                                {[['0', t('priorityLow')], ['1', t('priorityMedium')], ['2', t('priorityHigh')], ['3', t('priorityUrgent')]].map(([v, label]) => (
                                                    <option key={v} value={v}>{label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>{t('dueDate')}</label>
                                            <input type="datetime-local" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} style={inputStyle} />
                                        </div>
                                    </div>

                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>
                                        <input type="checkbox" checked={editIsRecurring} onChange={e => setEditIsRecurring(e.target.checked)} />
                                        {t('isRecurring')}
                                    </label>

                                    {editIsRecurring && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', padding: '0.75rem', background: 'var(--surface)', borderRadius: '10px' }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>{t('recurrenceType')}</label>
                                                <select value={editRecurrenceType} onChange={e => setEditRecurrenceType(Number(e.target.value))} style={inputStyle}>
                                                    {[t('daily'), t('weekly'), t('monthly'), t('yearly')].map((l, i) => (
                                                        <option key={i} value={i}>{l}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>{t('interval') || 'Interval'}</label>
                                                <input type="number" min={1} value={editRecurrenceInterval} onChange={e => setEditRecurrenceInterval(Number(e.target.value))} style={inputStyle} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>{t('startDate') || 'Start'}</label>
                                                <input type="datetime-local" value={editRecurrenceStart} onChange={e => setEditRecurrenceStart(e.target.value)} style={inputStyle} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>{t('endDate') || 'End'}</label>
                                                <input type="datetime-local" value={editRecurrenceEnd} onChange={e => setEditRecurrenceEnd(e.target.value)} style={inputStyle} />
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button onClick={saveEdit} disabled={saving} style={{ padding: '0.6rem 1.25rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}>
                                            {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
                                            {t('save') || 'Save'}
                                        </button>
                                        <button onClick={() => setIsEditing(false)} style={{ padding: '0.6rem 1.25rem', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem' }}>
                                            {t('cancel')}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--foreground)' }}>{task.title}</h2>
                                        <div style={{ fontSize: '0.95rem', color: 'var(--foreground)', lineHeight: 1.6, background: 'var(--surface)', padding: '0.9rem', borderRadius: '10px', whiteSpace: 'pre-wrap' }}>
                                            {task.description || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{t('noDescription')}</span>}
                                        </div>
                                    </div>

                                    {/* Meta */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: 'var(--surface)', padding: '1rem', borderRadius: '12px' }}>
                                        {[
                                            [<Calendar size={13} />, t('dueDateLabel'), formatDate(task.dueDate)],
                                            [<Clock size={13} />, t('createdAt'), formatDate(task.createdAt)],
                                            [<History size={13} />, t('updatedAt'), formatDate(task.updatedAt)],
                                        ].map(([icon, label, value], i) => (
                                            <div key={i}>
                                                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>{label as string}</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem', fontWeight: 500 }}>
                                                    {icon as React.ReactNode} {value as string}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* Progress */}
                            {!isEditing && (
                                <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('progress')}</span>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--foreground)' }}>{progressValue}%</span>
                                    </div>
                                    <input
                                        type="range" min={0} max={100} value={progressValue}
                                        onChange={e => setProgressValue(Number(e.target.value))}
                                        style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
                                    />
                                    {progressValue !== task.progress && (
                                        <button onClick={saveProgress} disabled={savingProgress} style={{ alignSelf: 'flex-end', padding: '0.4rem 1rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                            {savingProgress ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={12} />}
                                            {t('save') || 'Save'}
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Assignees */}
                            {!isEditing && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                        <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>{t('assignedTo')}</h3>
                                        <button onClick={loadAllUsers} style={{ fontSize: '0.8rem', fontWeight: 600, padding: '0.3rem 0.7rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <Plus size={12} /> {t('addAssignee') || 'Add'}
                                        </button>
                                    </div>

                                    {showAddAssignee && (
                                        <div style={{ marginBottom: '0.75rem', background: 'var(--surface)', padding: '0.75rem', borderRadius: '10px', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '140px', overflowY: 'auto' }}>
                                            {unassignedUsers.length === 0
                                                ? <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('noOtherUsers')}</span>
                                                : unassignedUsers.map(u => (
                                                    <button key={u.id} onClick={() => handleAddAssignee(u.id)} disabled={addingAssignee} style={{ padding: '0.35rem 0.75rem', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: '20px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--foreground)' }}>
                                                        {addingAssignee ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={12} />}
                                                        {u.fullName || u.userName}
                                                    </button>
                                                ))
                                            }
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {task.assignees.length === 0
                                            ? <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.875rem', margin: 0 }}>{t('noAssignees')}</p>
                                            : task.assignees.map(a => (
                                                <div key={a.userId} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--surface)', padding: '0.5rem 0.75rem', borderRadius: '10px' }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                                                        {avatarUrl(a.avatarUrl) ? <img src={avatarUrl(a.avatarUrl)!} alt={a.userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <UserIcon size={15} color="white" />}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>{a.fullName || a.userName}</p>
                                                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('assigned')} {formatDate(a.assignedAt)}</p>
                                                    </div>
                                                    <button onClick={() => handleRemoveAssignee(a.userId)} disabled={removingUserId === a.userId} title={t('removeAssignee') || 'Remove'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '0.3rem', borderRadius: '6px', display: 'flex', opacity: removingUserId === a.userId ? 0.5 : 1 }}>
                                                        {removingUserId === a.userId ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <UserMinus size={14} />}
                                                    </button>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            )}

                            {/* Recurrence */}
                            {!isEditing && task.isRecurring && (
                                <div style={{ background: 'color-mix(in srgb, var(--primary) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--primary) 18%, transparent)', padding: '1rem', borderRadius: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', color: 'var(--primary)' }}>
                                        <RotateCw size={16} />
                                        <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>{t('recurringParams')}</h3>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.2rem 1rem', fontSize: '0.875rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>{t('recurrenceType')}</span>
                                        <span style={{ fontWeight: 500 }}>{[t('daily'), t('weekly'), t('monthly'), t('yearly')][task.recurrenceType ?? 0]}</span>
                                        <span style={{ color: 'var(--text-muted)' }}>{t('interval')}</span>
                                        <span style={{ fontWeight: 500 }}>{task.recurrenceInterval}</span>
                                        <span style={{ color: 'var(--text-muted)' }}>{t('startDate')}</span>
                                        <span style={{ fontWeight: 500 }}>{formatDate(task.recurrenceStartDate)}</span>
                                        <span style={{ color: 'var(--text-muted)' }}>{t('endDate')}</span>
                                        <span style={{ fontWeight: 500 }}>{formatDate(task.recurrenceEndDate)}</span>
                                    </div>
                                </div>
                            )}

                            {/* Files */}
                            {!isEditing && task.files.length > 0 && (
                                <div>
                                    <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem' }}>{t('files')}</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {task.files.map(f => (
                                            <a key={f.id} href={`${API_BASE_URL}${f.fileUrl.startsWith('/') ? '' : '/'}${f.fileUrl}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--surface)', padding: '0.75rem', borderRadius: '10px', textDecoration: 'none', color: 'inherit', border: '1px solid transparent', transition: 'border 0.2s' }} onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')} onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}>
                                                <div style={{ background: 'color-mix(in srgb, var(--primary) 15%, transparent)', color: 'var(--primary)', padding: '0.4rem', borderRadius: '8px', display: 'flex' }}>
                                                    <FileText size={16} />
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.fileName}</p>
                                                    <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>{(f.fileSize / 1024).toFixed(1)} KB · {formatDate(f.createdAt)}</p>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Occurrences */}
                            {!isEditing && task.occurrences.length > 0 && (
                                <div>
                                    <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem' }}>{t('occurrences')}</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {task.occurrences.map((occ, i) => (
                                            <div key={occ.id} style={{ background: 'var(--surface)', borderLeft: `3px solid ${getStatusColor(occ.status)}`, padding: '0.9rem', borderRadius: '0 8px 8px 0' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: occ.notes ? '0.5rem' : 0 }}>
                                                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>#{i + 1} {formatDate(occ.dueDate)}</span>
                                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '12px', background: `color-mix(in srgb, ${getStatusColor(occ.status)} 15%, transparent)`, color: getStatusColor(occ.status) }}>
                                                        {t(`status${getStatusString(occ.status)}`)} · {occ.progress}%
                                                    </span>
                                                </div>
                                                {occ.notes && <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>&quot;{occ.notes}&quot;</p>}
                                                {occ.files.length > 0 && (
                                                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                                        {occ.files.map(f => (
                                                            <a key={f.id} href={`${API_BASE_URL}${f.fileUrl}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', padding: '0.2rem 0.5rem', background: 'var(--surface-hover)', borderRadius: '6px', textDecoration: 'none', color: 'var(--primary)', fontWeight: 600 }}>
                                                                <File size={11} /> {f.fileName}
                                                            </a>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : null}
                </div>
            </div>
            <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }` }} />

            <TaskChatModal
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                taskId={task?.id ?? null}
                taskTitle={task?.title ?? ''}
                conversationId={task?.conversationId ? Number(task.conversationId) : null}
                locale={locale}
            />
        </div>
    );
}
