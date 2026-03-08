"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ReportService, UserTaskSummary, UserTaskItem, TaskDetail, DailyTaskItem } from '@/services/report.service';
import { TaskService, AssignableUser } from '@/services/task.service';
import { AuthService, UserProfile } from '@/services/auth.service';
import TokenManager from '@/lib/TokenManager';
import { TaskDetailsModal } from '@/components/TaskDetailsModal';
import { API_BASE_URL } from '@/lib/api';
import {
    Filter, X, CheckCircle2, Circle, Clock, CheckSquare, Archive, AlertCircle,
    BarChart, Repeat, User as UserIcon, Check, MapPin, Search, Calendar, FileText, ChevronRight
} from 'lucide-react';

type ReportType = 'summary' | 'dailyTasks';

export default function ReportsPage() {
    const t = useTranslations('Reports');
    const locale = useLocale();
    const isRtl = locale === 'ar';

    // ── Global Context ──
    const [myTokenId, setMyTokenId] = useState<string | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [users, setUsers] = useState<AssignableUser[]>([]);
    const [loadingUtils, setLoadingUtils] = useState(true);

    // ── Nav/Modal State ──
    const [activeReport, setActiveReport] = useState<ReportType | 'none'>('none');
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // ── Form State (Temp parameters inside the Menu) ──
    const [selectedType, setSelectedType] = useState<ReportType>('summary');

    // User Selection (Summary)
    const [assigneeMode, setAssigneeMode] = useState<'self' | 'others'>('self');
    const [selectedUserId, setSelectedUserId] = useState<string>('');

    // Filters (Summary Tasks)
    const [taskFilters, setTaskFilters] = useState({
        isCompleted: undefined as boolean | undefined,
        status: undefined as number | undefined,
        priority: undefined as number | undefined,
        search: '',
        dueBefore: '',
        dueAfter: ''
    });

    // Daily
    const [dailyDate, setDailyDate] = useState(() => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 10);
    });
    const [dailyStatus, setDailyStatus] = useState<number | undefined>(undefined);

    // ── Data Results ──
    const [loadingData, setLoadingData] = useState(false);
    const [errorData, setErrorData] = useState<string | null>(null);

    // Shared List states
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const [totalPages, setTotalPages] = useState(1);

    // Summary
    const [summary, setSummary] = useState<UserTaskSummary | null>(null);
    const [userTasksList, setUserTasksList] = useState<UserTaskItem[]>([]);

    // Daily Tasks
    const [dailyTasksList, setDailyTasksList] = useState<DailyTaskItem[]>([]);

    // Detail Modal (Popup)
    const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

    // ── Initialization ──
    useEffect(() => {
        const currentId = TokenManager.getUserIdFromToken();
        if (currentId) setMyTokenId(currentId);

        Promise.all([
            TaskService.getAssignableUsers().catch(() => []),
            AuthService.getMe().catch(() => null)
        ]).then(([assignableUsers, userProfile]) => {
            setUsers(assignableUsers);
            setProfile(userProfile);
            setLoadingUtils(false);

            // Auto-select self once loaded
            if (currentId) setSelectedUserId(currentId);
        });
    }, []);

    // ── Data Fetching ──
    const fetchReport = useCallback(async (isPageChange = false, overrideType?: ReportType, overridePage?: number) => {
        setLoadingData(true);
        setErrorData(null);

        const currentType = overrideType || activeReport;
        const currentPage = overridePage || page;

        try {
            if (currentType === 'summary') {
                const targetUid = assigneeMode === 'self' && myTokenId ? myTokenId : selectedUserId;
                if (!targetUid) throw new Error(t('error'));

                // Fetch both summary and tasks in parallel
                const [summaryData, tasksData] = await Promise.all([
                    ReportService.getUserTaskSummary(targetUid),
                    ReportService.getUserTasks(targetUid, {
                        page: currentPage, pageSize,
                        isCompleted: taskFilters.isCompleted,
                        priority: taskFilters.priority,
                        statuses: taskFilters.status !== undefined ? [taskFilters.status] : undefined,
                        search: taskFilters.search || undefined,
                        dueBefore: taskFilters.dueBefore ? new Date(taskFilters.dueBefore).toISOString() : undefined,
                        dueAfter: taskFilters.dueAfter ? new Date(taskFilters.dueAfter).toISOString() : undefined,
                    })
                ]);

                setSummary(summaryData);
                setUserTasksList(tasksData.items);
                setTotalPages(tasksData.totalPages);
            }
            else if (currentType === 'dailyTasks') {
                const data = await ReportService.getDailyTasks({
                    page: currentPage, pageSize,
                    date: dailyDate ? new Date(dailyDate).toISOString() : undefined,
                    status: dailyStatus
                });
                setDailyTasksList(data.items);
                setTotalPages(data.totalPages);
            }
        } catch (err: any) {
            console.error(err);
            setErrorData(err?.message || t('error'));
        } finally {
            setLoadingData(false);
        }
    }, [activeReport, assigneeMode, myTokenId, selectedUserId, taskFilters, page, dailyDate, dailyStatus, t]);

    // Re-fetch on pagination change if maintaining same report
    useEffect(() => {
        if (activeReport === 'summary' || activeReport === 'dailyTasks') {
            fetchReport(true);
        }
    }, [page]); // only depend on page for explicit pagination trigger

    // ── Handlers ──
    const handleRunReport = () => {
        if (selectedType === 'summary') {
            const targetUid = assigneeMode === 'self' && myTokenId ? myTokenId : selectedUserId;
            if (!targetUid) {
                alert(t('errorNoAssignees'));
                return;
            }
        }

        setIsMenuOpen(false);
        setPage(1); // Reset pagination for new report
        setActiveReport(selectedType);

        fetchReport(false, selectedType, 1);
    };

    const handleClearMenuFilters = () => {
        setTaskFilters({
            isCompleted: undefined,
            status: undefined,
            priority: undefined,
            search: '',
            dueBefore: '',
            dueAfter: ''
        });
        setDailyDate(() => {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            return now.toISOString().slice(0, 10);
        });
        setDailyStatus(undefined);
    };

    const getStatusLabel = (status: number) => {
        switch (status) {
            case 0: return t('statusTodo');
            case 1: return t('statusInProgress');
            case 2: return t('statusDone');
            case 3: return t('statusArchived');
            default: return status.toString();
        }
    };

    const getPriorityBadge = (priority: number) => {
        switch (priority) {
            case 0: return <span className="badge badge-low">{t('priorityLow')}</span>;
            case 1: return <span className="badge badge-medium">{t('priorityMedium')}</span>;
            case 2: return <span className="badge badge-high">{t('priorityHigh')}</span>;
            case 3: return <span className="badge badge-urgent">{t('priorityUrgent')}</span>;
            default: return null;
        }
    };

    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px',
        background: 'var(--surface, rgba(255,255,255,0.04))',
        border: '1px solid var(--border, rgba(255,255,255,0.12))',
        color: 'var(--foreground)', fontFamily: 'inherit', fontSize: '0.95rem',
        outline: 'none', boxSizing: 'border-box',
    };

    // ── Render Helpers ──
    const renderPagination = () => {
        if (totalPages <= 1) return null;
        return (
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--surface-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {t('page')} {page} {t('of')} {totalPages}
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} style={{ padding: '0.35rem 0.75rem' }}>
                        {t('prev')}
                    </button>
                    <button className="btn btn-secondary" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} style={{ padding: '0.35rem 0.75rem' }}>
                        {t('next')}
                    </button>
                </div>
            </div>
        );
    };

    const renderTaskRow = (task: any, taskIdToUse: number) => (
        <tr
            key={taskIdToUse}
            onClick={() => { setSelectedRowId(taskIdToUse); setIsTaskModalOpen(true); }}
            style={{ borderBottom: '1px solid var(--surface-border)', cursor: 'pointer', transition: 'background 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
            <td data-label={t('colTitle')} style={{ padding: '1rem 1.5rem' }}>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{task.title}</div>
                {task.description && (
                    <div className="task-description" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>
                        {task.description}
                    </div>
                )}
            </td>
            <td data-label={t('colStatus')} style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>
                {getStatusLabel(task.status)}
            </td>
            <td data-label={t('colPriority')} style={{ padding: '1rem 1.5rem' }}>
                {getPriorityBadge(task.priority)}
            </td>
            <td data-label={t('colDue')} style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                {task.isOverdue && (
                    <span style={{ display: 'inline-block', marginLeft: '0.5rem', fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: 'color-mix(in srgb, var(--danger) 15%, transparent)', color: 'var(--danger)' }}>
                        {t('isOverdue')}
                    </span>
                )}
            </td>
            <td data-label={t('colProgress')} style={{ padding: '1rem 1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                    <div style={{ flex: 1, height: '6px', background: 'var(--surface-border)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${task.progress}%`, background: 'var(--primary)', borderRadius: '3px' }} />
                    </div>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', minWidth: '35px' }}>{task.progress}%</span>
                </div>
            </td>
        </tr>
    );

    return (
        <div className="reports-page-container animate-fade-in" style={{ paddingBottom: '3rem' }}>
            <header className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="page-title">{t('title')}</h1>
                    <p className="page-subtitle">{t('subtitle')}</p>
                </div>
                <button
                    onClick={() => setIsMenuOpen(true)}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <BarChart size={18} />
                    {t('openReportMenu')}
                </button>
            </header>

            {/* ERROR STATE */}
            {errorData && (
                <div style={{ color: 'var(--danger)', padding: '1.25rem', background: 'color-mix(in srgb, var(--danger) 10%, transparent)', borderRadius: '12px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <AlertCircle size={20} />
                    {errorData}
                </div>
            )}

            {/* EMPTY STATE */}
            {activeReport === 'none' && !loadingData && (
                <div style={{ textAlign: 'center', padding: '5rem 2rem', background: 'var(--surface)', borderRadius: '16px', border: '1px dashed var(--surface-border)' }}>
                    <BarChart size={64} style={{ margin: '0 auto 1.5rem', color: 'var(--primary)', opacity: 0.5 }} />
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>{t('emptyStateTitle')}</h3>
                    <p style={{ color: 'var(--text-muted)' }}>{t('emptyStateSubtitle')}</p>
                    <button onClick={() => setIsMenuOpen(true)} className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
                        {t('openReportMenu')}
                    </button>
                </div>
            )}

            {/* LOADING STATE */}
            {loadingData && (
                <div style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem', width: 40, height: 40, borderWidth: 3 }} />
                    {t('loading')}
                </div>
            )}

            {/* RESULTS: SUMMARY (+ TASKS LIST) */}
            {activeReport === 'summary' && !loadingData && summary && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <section className="animate-fade-in">
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
                            {t('typeSummary')} — {summary.fullName || summary.userName}
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
                            <SummaryCard icon={<CheckSquare />} label={t('totalTasks')} value={summary.totalTasks} />
                            <SummaryCard icon={<Circle />} label={t('todo')} value={summary.todoCount} />
                            <SummaryCard icon={<Clock />} label={t('inProgress')} value={summary.inProgressCount} />
                            <SummaryCard icon={<CheckCircle2 />} label={t('done')} value={summary.doneCount} color="var(--success)" />
                            <SummaryCard icon={<AlertCircle />} label={t('overdue')} value={summary.overdueTasks} color="var(--danger)" />
                            <SummaryCard icon={<BarChart />} label={t('avgProgress')} value={`${summary.averageProgress.toFixed(1)}%`} />
                            <SummaryCard icon={<Repeat />} label={t('recurring')} value={summary.recurringTaskCount} />
                            <SummaryCard icon={<Archive />} label={t('archived')} value={summary.archivedCount} />
                        </div>
                    </section>

                    <section className="animate-fade-in" style={{ background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--surface-border)', overflow: 'hidden' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--surface-border)' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
                                {t('typeUserTasks')}
                            </h2>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            {userTasksList.length === 0 ? (
                                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>{t('noTasks')}</div>
                            ) : (
                                <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRtl ? 'right' : 'left' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--surface-hover)', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{t('colTitle')}</th>
                                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{t('colStatus')}</th>
                                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{t('colPriority')}</th>
                                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{t('colDue')}</th>
                                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{t('colProgress')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {userTasksList.map(task => renderTaskRow(task, task.id))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        {renderPagination()}
                    </section>
                </div>
            )}

            {/* RESULTS: DAILY TASKS */}
            {activeReport === 'dailyTasks' && !loadingData && (
                <section className="animate-fade-in" style={{ background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--surface-border)', overflow: 'hidden' }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--surface-border)' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
                            {t('typeDaily')} ({dailyDate ? new Date(dailyDate).toLocaleDateString() : t('date')})
                        </h2>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        {dailyTasksList.length === 0 ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>{t('noTasks')}</div>
                        ) : (
                            <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRtl ? 'right' : 'left' }}>
                                <thead>
                                    <tr style={{ background: 'var(--surface-hover)', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{t('colTitle')}</th>
                                        <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{t('colStatus')}</th>
                                        <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{t('colPriority')}</th>
                                        <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{t('colDue')}</th>
                                        <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{t('colProgress')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dailyTasksList.map(task => renderTaskRow(task, task.taskId))}
                                </tbody>
                            </table>
                        )}
                    </div>
                    {renderPagination()}
                </section>
            )}


            {/* --- REPORT SELECTION POPUP MENU --- */}
            {isMenuOpen && (
                <>
                    <style>{`
                    @keyframes slideInFromLeft {
                        from { transform: translateX(${isRtl ? '100%' : '-100%'}); }
                        to { transform: translateX(0); }
                    }
                `}</style>
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 40, display: 'flex',
                        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                        direction: isRtl ? 'rtl' : 'ltr'
                    }}>
                        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }} onClick={() => setIsMenuOpen(false)} />
                        <div className="glass-card" style={{
                            position: 'absolute', left: isRtl ? 'auto' : 0, right: isRtl ? 0 : 'auto', top: 0, bottom: 0, zIndex: 1,
                            width: '95%', maxWidth: '380px', display: 'flex', flexDirection: 'column',
                            height: '100vh', margin: '0',
                            background: 'var(--background)',
                            border: '1px solid var(--surface-border)',
                            borderTopRightRadius: isRtl ? '0' : '20px',
                            borderBottomRightRadius: isRtl ? '0' : '20px',
                            borderTopLeftRadius: isRtl ? '20px' : '0',
                            borderBottomLeftRadius: isRtl ? '20px' : '0',
                            animation: 'slideInFromLeft 0.3s ease-out forwards',
                            boxShadow: '4px 0 24px rgba(0,0,0,0.3)'
                        }}>
                            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h2 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <FileText size={20} className="text-primary" /> {t('reportType')}
                                </h2>
                                <button onClick={() => setIsMenuOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem' }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="drawer-content" style={{ padding: '1.25rem', overflowY: 'auto', overflowX: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>

                                {/* Type Selection */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                    {[
                                        { id: 'summary', icon: <BarChart size={16} />, label: t('typeSummary') },
                                        { id: 'dailyTasks', icon: <Calendar size={16} />, label: t('typeDaily') }
                                    ].map(type => (
                                        <button
                                            key={type.id}
                                            onClick={() => setSelectedType(type.id as ReportType)}
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                                padding: '0.5rem', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                border: selectedType === type.id ? '2px solid var(--primary)' : '1px solid var(--surface-border)',
                                                background: selectedType === type.id ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--surface)',
                                                color: selectedType === type.id ? 'var(--primary)' : 'var(--text-muted)'
                                            }}
                                        >
                                            {/* @ts-ignore */}
                                            {type.icon} {type.label}
                                        </button>
                                    ))}
                                </div>

                                <hr style={{ border: 'none', borderTop: '1px solid var(--surface-border)', margin: 0 }} />

                                {/* USER CONFIGURATION (Summary) */}
                                {selectedType === 'summary' && (
                                    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                                        {/* User Selection */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>{t('selectUser')}</label>
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                <button type="button" onClick={() => { setAssigneeMode('self'); if (myTokenId) setSelectedUserId(myTokenId); }}
                                                    style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', border: assigneeMode === 'self' ? '2px solid var(--primary)' : '1px solid var(--surface-border)', background: assigneeMode === 'self' ? 'color-mix(in srgb, var(--primary) 15%, transparent)' : 'var(--surface)', color: assigneeMode === 'self' ? 'var(--primary)' : 'var(--text-muted)', transition: 'all 0.2s' }}
                                                >
                                                    {t('self')}
                                                </button>
                                                <button type="button" onClick={() => setAssigneeMode('others')}
                                                    style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', border: assigneeMode === 'others' ? '2px solid var(--primary)' : '1px solid var(--surface-border)', background: assigneeMode === 'others' ? 'color-mix(in srgb, var(--primary) 15%, transparent)' : 'var(--surface)', color: assigneeMode === 'others' ? 'var(--primary)' : 'var(--text-muted)', transition: 'all 0.2s' }}
                                                >
                                                    {t('others')}
                                                </button>
                                            </div>

                                            {assigneeMode === 'others' && (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                    {loadingUtils ? <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{t('loading')}</p> : users.map(user => {
                                                        const isSelected = selectedUserId === user.id;
                                                        // Handle Avatar securely
                                                        const rawAvatarUrl = (user as any).AvatarUrl || user.avatarUrl;
                                                        const normalizedApiBaseUrl = API_BASE_URL.replace(/\/$/, '');
                                                        const normalizedAvatarPath = rawAvatarUrl ? (rawAvatarUrl.startsWith('/') ? rawAvatarUrl : `/${rawAvatarUrl}`) : '';
                                                        const finalAvatarUrl = rawAvatarUrl ? (rawAvatarUrl.startsWith('http') ? rawAvatarUrl : `${normalizedApiBaseUrl}${normalizedAvatarPath}`) : null;

                                                        return (
                                                            <div key={user.id} onClick={() => setSelectedUserId(user.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', borderRadius: '20px', cursor: 'pointer', border: isSelected ? '1px solid var(--primary)' : '1px solid var(--surface-border)', background: isSelected ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--surface)', transition: 'all 0.2s' }}>
                                                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                                                    {finalAvatarUrl ? <img src={finalAvatarUrl} alt={user.userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <UserIcon size={12} color="white" />}
                                                                </div>
                                                                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{user.fullName || user.userName}</span>
                                                            </div>
                                                        );
                                                    })}
                                                    {!loadingUtils && users.length === 0 && <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{t('noOtherUsers')}</p>}
                                                </div>
                                            )}
                                        </div>

                                        {/* Task Filters embedded inside Summary */}
                                        <div style={{ padding: '1rem', background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: '12px', width: '100%', boxSizing: 'border-box' }}>
                                            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>{t('typeUserTasks')} Optional Filters</h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.4rem', fontWeight: 500, color: 'var(--text-muted)' }}>{t('filterSearch')}</label>
                                                    <input type="text" style={inputStyle} placeholder={t('filterSearchPlaceholder')} value={taskFilters.search} onChange={e => setTaskFilters({ ...taskFilters, search: e.target.value })} />
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '1rem' }}>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.4rem', fontWeight: 500, color: 'var(--text-muted)' }}>{t('filterCompleted')}</label>
                                                        <select style={inputStyle} value={taskFilters.isCompleted === undefined ? '' : taskFilters.isCompleted.toString()} onChange={e => setTaskFilters({ ...taskFilters, isCompleted: e.target.value === '' ? undefined : e.target.value === 'true', status: undefined })}>
                                                            <option value="">{t('filterAll')}</option>
                                                            <option value="true">{t('filterCompleted')}</option>
                                                            <option value="false">{t('filterIncomplete')}</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.4rem', fontWeight: 500, color: 'var(--text-muted)' }}>{t('filterStatus')}</label>
                                                        <select style={inputStyle} value={taskFilters.status === undefined ? '' : taskFilters.status.toString()} onChange={e => setTaskFilters({ ...taskFilters, status: e.target.value === '' ? undefined : Number(e.target.value), isCompleted: undefined })}>
                                                            <option value="">{t('filterAll')}</option>
                                                            <option value="0">{t('statusTodo')}</option>
                                                            <option value="1">{t('statusInProgress')}</option>
                                                            <option value="2">{t('statusDone')}</option>
                                                            <option value="3">{t('statusArchived')}</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.4rem', fontWeight: 500, color: 'var(--text-muted)' }}>{t('filterPriority')}</label>
                                                        <select style={inputStyle} value={taskFilters.priority === undefined ? '' : taskFilters.priority.toString()} onChange={e => setTaskFilters({ ...taskFilters, priority: e.target.value === '' ? undefined : Number(e.target.value) })}>
                                                            <option value="">{t('filterAll')}</option>
                                                            <option value="0">{t('priorityLow')}</option>
                                                            <option value="1">{t('priorityMedium')}</option>
                                                            <option value="2">{t('priorityHigh')}</option>
                                                            <option value="3">{t('priorityUrgent')}</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '1rem' }}>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.4rem', fontWeight: 500, color: 'var(--text-muted)' }}>{t('filterDueAfter')}</label>
                                                        <input type="date" style={inputStyle} value={taskFilters.dueAfter} onChange={e => setTaskFilters({ ...taskFilters, dueAfter: e.target.value })} />
                                                    </div>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.4rem', fontWeight: 500, color: 'var(--text-muted)' }}>{t('filterDueBefore')}</label>
                                                        <input type="date" style={inputStyle} value={taskFilters.dueBefore} onChange={e => setTaskFilters({ ...taskFilters, dueBefore: e.target.value })} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                )}

                                {/* DAILY TASKS FILTERS */}
                                {selectedType === 'dailyTasks' && (
                                    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.4rem', fontWeight: 500, color: 'var(--text-muted)' }}>{t('date')}</label>
                                            <input type="date" style={inputStyle} value={dailyDate} onChange={e => setDailyDate(e.target.value)} required />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.4rem', fontWeight: 500, color: 'var(--text-muted)' }}>{t('filterStatus')}</label>
                                            <select style={inputStyle} value={dailyStatus === undefined ? '' : dailyStatus.toString()} onChange={e => setDailyStatus(e.target.value === '' ? undefined : Number(e.target.value))}>
                                                <option value="">{t('filterAll')}</option>
                                                <option value="0">{t('statusTodo')}</option>
                                                <option value="1">{t('statusInProgress')}</option>
                                                <option value="2">{t('statusDone')}</option>
                                                <option value="3">{t('statusArchived')}</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                            </div>

                            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--surface-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--surface)' }}>
                                <button onClick={handleRunReport} className="btn btn-primary" style={{ padding: '0.65rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', borderRadius: '10px' }}>
                                    {t('runReport')} <ChevronRight size={16} />
                                </button>
                                <button onClick={handleClearMenuFilters} className="btn btn-secondary" style={{ padding: '0.65rem', fontSize: '0.95rem', background: 'transparent', border: '1px solid var(--surface-border)', color: 'var(--foreground)', width: '100%', borderRadius: '10px' }}>
                                    {t('clearFilters')}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* --- Modals --- */}
            {isTaskModalOpen && selectedRowId && (
                <TaskDetailsModal
                    taskId={selectedRowId}
                    isOpen={isTaskModalOpen}
                    locale={locale}
                    onClose={() => {
                        setIsTaskModalOpen(false);
                        setSelectedRowId(null);
                        // Refresh
                        fetchReport(true);
                    }}
                />
            )}
        </div>
    );
}

function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string | number, color?: string }) {
    return (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: '16px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', transition: 'transform 0.2s', cursor: 'default' }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `color-mix(in srgb, ${color || 'var(--primary)'} 15%, transparent)`, color: color || 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {icon}
            </div>
            <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{label}</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
            </div>
        </div>
    );
}
