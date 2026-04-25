
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

declare global {
    interface Window {
        ClassicEditor: any;
    }
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
    const editorRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const loadCKEditor = async () => {
            if (typeof window !== 'undefined' && !window.ClassicEditor) {
                const script = document.createElement('script');
                script.src = 'https://cdn.ckeditor.com/ckeditor5/41.0.0/classic/ckeditor.js';
                script.async = true;
                script.onload = () => setIsLoaded(true);
                document.body.appendChild(script);
            } else if (window.ClassicEditor) {
                setIsLoaded(true);
            }
        };
        loadCKEditor();
    }, []);

    useEffect(() => {
        if (isLoaded && window.ClassicEditor && containerRef.current && !editorRef.current) {
            window.ClassicEditor
                .create(containerRef.current, {
                    placeholder: placeholder || 'Nhập nội dung...',
                    toolbar: {
                        items: [
                            'heading', '|',
                            'bold', 'italic', 'link', 'bulletedList', 'numberedList', '|',
                            'outdent', 'indent', '|',
                            'blockQuote', 'insertTable', '|',
                            'undo', 'redo'
                        ]
                    }
                })
                .then((editor: any) => {
                    editorRef.current = editor;
                    editor.setData(value || '');
                    editor.model.document.on('change:data', () => {
                        const data = editor.getData();
                        onChange(data);
                    });
                })
                .catch((error: any) => {
                    console.error('CKEditor Error:', error);
                });
        }

        return () => {
            if (editorRef.current) {
                editorRef.current.destroy()
                    .then(() => {
                        editorRef.current = null;
                    })
                    .catch((err: any) => console.error('Destroy Error:', err));
            }
        };
    }, [isLoaded]);

    useEffect(() => {
        if (editorRef.current && value !== editorRef.current.getData()) {
            if (!editorRef.current.editing.view.document.isFocused) {
                editorRef.current.setData(value || '');
            }
        }
    }, [value]);

    return (
        <div className={cn("ckeditor-wrapper min-h-[200px]", className)}>
            <style jsx global>{`
                .ck-editor__editable {
                    min-height: 200px;
                    max-height: 400px;
                }
                .ck.ck-editor__main>.ck-editor__editable {
                    background: white;
                }
                .ck.ck-editor__top .ck-sticky-panel .ck-toolbar {
                    border-top-left-radius: 12px;
                    border-top-right-radius: 12px;
                    border: 1px solid #e2e8f0;
                    background: #f8fafc;
                }
                .ck.ck-editor__main>.ck-editor__editable:not(.ck-focused) {
                    border: 1px solid #e2e8f0;
                    border-bottom-left-radius: 12px;
                    border-bottom-right-radius: 12px;
                }
                .ck.ck-editor__main>.ck-editor__editable.ck-focused {
                    border: 1px solid hsl(var(--primary));
                    border-bottom-left-radius: 12px;
                    border-bottom-right-radius: 12px;
                    box-shadow: 0 0 0 4px hsla(var(--primary), 0.1);
                }
            `}</style>
            <div ref={containerRef} />
        </div>
    );
}
