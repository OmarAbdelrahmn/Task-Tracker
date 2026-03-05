import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, Loader2 } from 'lucide-react';
import { ConversationService } from '@/services/conversation.service';

interface ChatInputProps {
    conversationId: number;
    onTypingStart: () => void;
    onTypingStop: () => void;
    onSendMessageOptimistic: (body: string | null, type: 0 | 1 | 2, tempId: number) => void;
    onMessageSentDone: (tempId: number) => void;
}

export function ChatInput({ conversationId, onTypingStart, onTypingStop, onSendMessageOptimistic, onMessageSentDone }: ChatInputProps) {
    const [text, setText] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Clean up timeout
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setText(e.target.value);

        // Manage typing indicators
        onTypingStart();
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            onTypingStop();
        }, 1500);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const removeFile = () => {
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() && !file) return;

        // Stop typing indicator immediately
        onTypingStop();
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        const tempId = Date.now(); // fake ID for optimistic UI

        try {
            if (file) {
                // If there's a file, we must upload it first.
                setIsUploading(true);
                const fileRes = await ConversationService.uploadMessageFile(conversationId, file);

                // Then send message of type File, using the fileUrl in body is standard practice or backend handles it linking by conversationId. 
                // Based on API reference: URL in body for type File
                const bodyMsg = text.trim() ? text.trim() + `\n${fileRes.fileUrl}` : fileRes.fileUrl;

                // Fire optimistic (simplified)
                onSendMessageOptimistic('Uploading...', 1, tempId);

                await ConversationService.sendMessage(conversationId, bodyMsg, 1);
                setFile(null);
                setText('');
                if (fileInputRef.current) fileInputRef.current.value = '';
            } else {
                // Just text
                const bodyText = text.trim();
                setText('');
                onSendMessageOptimistic(bodyText, 0, tempId);
                await ConversationService.sendMessage(conversationId, bodyText, 0);
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            alert('Failed to send message');
        } finally {
            setIsUploading(false);
            onMessageSentDone(tempId); // clean up optimistic
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{
            display: 'flex', flexDirection: 'column',
            borderTop: '1px solid var(--surface-border)', padding: '1rem', background: 'var(--surface)',
            borderBottomLeftRadius: 'inherit', borderBottomRightRadius: 'inherit'
        }}>
            {/* Show Selected File */}
            {file && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem',
                    background: 'var(--background)', padding: '0.5rem', borderRadius: '8px', fontSize: '0.85rem'
                }}>
                    <Paperclip size={14} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                    <button type="button" onClick={removeFile} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex' }}>
                        <X size={16} />
                    </button>
                </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />

                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        background: 'var(--background)', border: '1px solid var(--surface-border)', borderRadius: '50%',
                        width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: 'var(--text-muted)'
                    }}
                    title="Attach file"
                    disabled={isUploading}
                >
                    <Paperclip size={20} />
                </button>

                <input
                    className="input-field"
                    type="text"
                    value={text}
                    onChange={handleChange}
                    placeholder="Type a message..."
                    style={{ flex: 1, borderRadius: '20px' }}
                    disabled={isUploading}
                />

                <button
                    type="submit"
                    disabled={(!text.trim() && !file) || isUploading}
                    style={{
                        background: (!text.trim() && !file) ? 'var(--surface-border)' : 'var(--primary)',
                        color: 'white', border: 'none', borderRadius: '50%',
                        width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: (!text.trim() && !file) || isUploading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    {isUploading ? <Loader2 size={18} className="spin" style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} style={{ transform: 'translateX(-1px) translateY(1px)' }} />}
                </button>
            </div>
        </form>
    );
}
