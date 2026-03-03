"use client";

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { TaskService, AssignableUser, CreateTaskRequest } from '@/services/task.service';
import { AuthService, UserProfile } from '@/services/auth.service';
import { X, Calendar, User as UserIcon, Check } from 'lucide-react';
import Image from 'next/image';
import { API_BASE_URL } from '@/lib/api';

interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    locale: string;
}

export function CreateTaskModal({ isOpen, onClose, onSuccess, locale }: CreateTaskModalProps) {
    const t = useTranslations('Tasks');
    const isRtl = locale === 'ar';

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [users, setUsers] = useState<AssignableUser[]>([]);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Form fields
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<number>(1);
    const [dueDate, setDueDate] = useState(() => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    });
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceType, setRecurrenceType] = useState<number>(0);
    const [recurrenceInterval, setRecurrenceInterval] = useState<number>(1);
    const [recurrenceStartDate, setRecurrenceStartDate] = useState('');
    const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
    const [assigneeMode, setAssigneeMode] = useState<'self' | 'others'>('self');
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            Promise.all([
                TaskService.getAssignableUsers().catch(() => []),
                AuthService.getMe().catch(() => null)
            ]).then(([assignableUsers, userProfile]) => {
                setUsers(assignableUsers);
                setProfile(userProfile);
                setLoading(false);
            });


            // Reset form
            setTitle('');
            setDescription('');
            setPriority(1);
            setDueDate(() => {
                const now = new Date();
                now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                return now.toISOString().slice(0, 16);
            });
            setIsRecurring(false);
            setRecurrenceType(0);
            setRecurrenceInterval(1);
            setRecurrenceStartDate('');
            setRecurrenceEndDate('');
            setAssigneeMode('self');
            setSelectedUserIds([]);
            setError(null);
        }
    }, [isOpen]);

    // Progressive disclosure flags
    const isTitleFilled = title.trim().length > 0;
    const isDueDateFilled = dueDate !== '';

    const showSection2 = isTitleFilled; // Description, Due Date, Priority
    const showSection3 = showSection2 && isDueDateFilled; // Assignment, Recurrence


    if (!isOpen) return null;

    const myUserId = profile && users.find(u => u.userName === profile.userName)?.id;

    const toggleUserSelection = (id: string) => {
        let newIds;
        if (selectedUserIds.includes(id)) {
            newIds = selectedUserIds.filter(x => x !== id);
        } else {
            newIds = [...selectedUserIds, id];
        }
        setSelectedUserIds(newIds);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);

        const assignees = assigneeMode === 'self' && myUserId
            ? [myUserId]
            : selectedUserIds;

        if (assignees.length === 0) {
            setError(t('errorNoAssignees'));
            setSubmitting(false);
            return;
        }

        const payload: CreateTaskRequest = {
            title,
            description,
            priority,
            dueDate: dueDate ? new Date(dueDate).toISOString() : new Date().toISOString(),
            isRecurring,
            recurrenceType,
            recurrenceInterval,
            recurrenceStartDate: isRecurring && recurrenceStartDate ? new Date(recurrenceStartDate).toISOString() : new Date().toISOString(),
            recurrenceEndDate: isRecurring && recurrenceEndDate ? new Date(recurrenceEndDate).toISOString() : new Date().toISOString(),
            assigneeIds: assignees
        };

        try {
            await TaskService.createTask(payload);
            setSubmitting(false);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.detail || t('errorMessage'));
            setSubmitting(false);
        }
    };

    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px',
        background: 'var(--surface, rgba(255,255,255,0.04))',
        border: '1px solid var(--border, rgba(255,255,255,0.12))',
        color: 'var(--foreground)', fontFamily: 'inherit', fontSize: '0.95rem',
        outline: 'none', boxSizing: 'border-box',
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: '1rem',
            direction: isRtl ? 'rtl' : 'ltr'
        }}>
            <div className="glass-card animate-scale-up" style={{
                width: '100%', maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
                background: 'var(--background)', borderRadius: '16px', overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(0,0,0,0.2), 0 0 0 1px var(--border)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>{t('createTask')}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.4rem', borderRadius: '8px', transition: 'background 0.2s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
                    {error && (
                        <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', fontSize: '0.875rem', border: '1px solid rgba(239,68,68,0.2)', marginBottom: '1rem' }}>
                            {error}
                        </div>
                    )}

                    <form id="create-task-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {/* Title */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 500 }}>{t('title')} <span style={{ color: 'var(--danger)' }}>*</span></label>
                            <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} required placeholder={t('titlePlaceholder') || 'Task Title'} autoFocus />
                        </div>

                        {/* Description */}
                        {showSection2 && (
                            <div className="animate-fade-in">
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 500 }}>{t('description')}</label>
                                <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={description} onChange={e => setDescription(e.target.value)} placeholder={t('descriptionPlaceholder') || 'Task details...'} />
                            </div>
                        )}

                        {/* Priority & Due Date */}
                        {showSection2 && (
                            <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 500 }}>{t('dueDate')} <span style={{ color: 'var(--danger)' }}>*</span></label>
                                    <div style={{ position: 'relative' }}>
                                        <input type="datetime-local" style={inputStyle} value={dueDate} onChange={e => setDueDate(e.target.value)} required />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 500 }}>{t('priority')} <span style={{ color: 'var(--danger)' }}>*</span></label>
                                    <select style={inputStyle} value={priority} onChange={e => setPriority(Number(e.target.value))}>
                                        <option value={0}>{t('low')}</option>
                                        <option value={1}>{t('medium')}</option>
                                        <option value={2}>{t('high')}</option>
                                        <option value={3}>{t('urgent')}</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Assignee Selection */}
                        {showSection3 && (
                            <div className="animate-fade-in" style={{ background: 'var(--surface, rgba(255,255,255,0.02))', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: 600 }}>{t('assignedTo')}</label>

                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                    <button type="button" onClick={() => setAssigneeMode('self')}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', border: assigneeMode === 'self' ? '2px solid var(--primary)' : '1px solid var(--border)', background: assigneeMode === 'self' ? 'color-mix(in srgb, var(--primary) 15%, transparent)' : 'transparent', color: assigneeMode === 'self' ? 'var(--primary)' : 'var(--text-muted)', transition: 'all 0.2s', flex: 1, minWidth: '100px' }}
                                    >
                                        {t('self')}
                                    </button>
                                    <button type="button" onClick={() => setAssigneeMode('others')}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', border: assigneeMode === 'others' ? '2px solid var(--primary)' : '1px solid var(--border)', background: assigneeMode === 'others' ? 'color-mix(in srgb, var(--primary) 15%, transparent)' : 'transparent', color: assigneeMode === 'others' ? 'var(--primary)' : 'var(--text-muted)', transition: 'all 0.2s', flex: 1, minWidth: '100px' }}
                                    >
                                        {t('others')}
                                    </button>
                                </div>

                                {assigneeMode === 'others' && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto', paddingRight: '0.5rem', paddingBottom: '0.5rem' }}>
                                        {loading ? (
                                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', padding: '0.5rem' }}>{t('loading')}</p>
                                        ) : users.map(user => {
                                            const isSelected = selectedUserIds.includes(user.id);
                                            // Handle both pascal and camel cases from the backend JSON safely
                                            const rawAvatarUrl = (user as any).AvatarUrl || user.avatarUrl;
                                            const normalizedApiBaseUrl = API_BASE_URL.replace(/\/$/, '');
                                            const normalizedAvatarPath = rawAvatarUrl ? (rawAvatarUrl.startsWith('/') ? rawAvatarUrl : `/${rawAvatarUrl}`) : '';
                                            const finalAvatarUrl = rawAvatarUrl ? (rawAvatarUrl.startsWith('http') ? rawAvatarUrl : `${normalizedApiBaseUrl}${normalizedAvatarPath}`) : null;

                                            return (
                                                <div key={user.id} onClick={() => toggleUserSelection(user.id)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.6rem', borderRadius: '20px', cursor: 'pointer', border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)', background: isSelected ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--surface)', transition: 'all 0.2s', width: 'fit-content' }}
                                                >
                                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                                                        {finalAvatarUrl ? <img src={finalAvatarUrl} alt={user.userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <UserIcon size={12} color="white" />}
                                                    </div>
                                                    <span dir="auto" style={{ fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap' }}>
                                                        {user.fullName || user.userName}
                                                    </span>
                                                    {isSelected && <Check size={14} style={{ color: 'var(--primary)', flexShrink: 0, marginLeft: '0.2rem' }} />}
                                                </div>
                                            );
                                        })}
                                        {!loading && users.length === 0 && (
                                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', padding: '0.5rem' }}>{t('noOtherUsers') || 'No users found.'}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Recurrence Settings */}
                        {showSection3 && (
                            <div className="animate-fade-in" style={{ padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)', background: isRecurring ? 'color-mix(in srgb, var(--primary) 5%, transparent)' : 'transparent', transition: 'all 0.3s' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', userSelect: 'none' }}>
                                    <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} style={{ width: '1.1rem', height: '1.1rem', accentColor: 'var(--primary)' }} />
                                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{t('isRecurring')}</span>
                                </label>

                                {isRecurring && (
                                    <div className="animate-fade-in" style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('recurrenceType')}</label>
                                            <select style={{ ...inputStyle, padding: '0.4rem 0.6rem' }} value={recurrenceType} onChange={e => setRecurrenceType(Number(e.target.value))}>
                                                <option value={0}>{t('daily')}</option>
                                                <option value={1}>{t('weekly')}</option>
                                                <option value={2}>{t('monthly')}</option>
                                                <option value={3}>{t('yearly')}</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('recurrenceInterval')}</label>
                                            <input type="number" min={1} style={{ ...inputStyle, padding: '0.4rem 0.6rem' }} value={recurrenceInterval} onChange={e => setRecurrenceInterval(Number(e.target.value))} />
                                        </div>
                                        <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('recurrenceStart')}</label>
                                                <input type="date" style={{ ...inputStyle, padding: '0.4rem 0.6rem' }} value={recurrenceStartDate} onChange={e => setRecurrenceStartDate(e.target.value)} required={isRecurring} />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('recurrenceEnd')}</label>
                                                <input type="date" style={{ ...inputStyle, padding: '0.4rem 0.6rem' }} value={recurrenceEndDate} onChange={e => setRecurrenceEndDate(e.target.value)} required={isRecurring} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </form>
                </div>

                <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', background: 'var(--surface)' }}>
                    <button type="button" onClick={onClose} disabled={submitting}
                        style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--foreground)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}
                    >
                        {t('cancel')}
                    </button>
                    <button type="submit" form="create-task-form" className="btn btn-primary" disabled={submitting || loading || !showSection3}
                        style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: (!showSection3 || loading) ? 0.5 : 1 }}
                    >
                        {submitting && <span className="spinner" style={{ width: '14px', height: '14px' }}></span>}
                        {submitting ? t('saving') : t('submit')}
                    </button>
                </div>
            </div>
        </div>
    );
}
