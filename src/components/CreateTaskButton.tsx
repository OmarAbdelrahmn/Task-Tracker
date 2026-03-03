"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { CreateTaskModal } from './CreateTaskModal';

interface CreateTaskButtonProps {
    locale: string;
    onSuccess?: () => void;
}

export function CreateTaskButton({ locale, onSuccess }: CreateTaskButtonProps) {
    const t = useTranslations('Tasks');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleSuccess = () => {
        if (onSuccess) onSuccess();
    };

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="btn btn-primary animate-fade-in"
                style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.6rem 1.25rem', borderRadius: '10px',
                    fontSize: '0.9rem', fontWeight: 600,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.1)'
                }}
            >
                <Plus size={18} />
                {t('createTask')}
            </button>

            <CreateTaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleSuccess}
                locale={locale}
            />
        </>
    );
}
