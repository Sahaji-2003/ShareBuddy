import { useState, useEffect } from 'react';
import { X, Download, AlertTriangle, Loader2, FileText, Image as ImageIcon, Code } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { type FileRecord } from '../lib/db';

interface FilePreviewModalProps {
    file: FileRecord;
    onClose: () => void;
    onDownload: () => void;
}

const MAX_PREVIEW_SIZE = 20 * 1024 * 1024; // 20MB

export function FilePreviewModal({ file, onClose, onDownload }: FilePreviewModalProps) {
    const [content, setContent] = useState<string | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isLargeFile = file.size > MAX_PREVIEW_SIZE || file.is_chunked;
    const isTextFile = file.type?.startsWith('text/') ||
        ['.txt', '.md', '.json', '.js', '.ts', '.tsx', '.jsx', '.py', '.html', '.css', '.sql', '.csv', '.xml', '.yaml', '.yml', '.sh', '.bat', '.log']
            .some(ext => file.name.toLowerCase().endsWith(ext));
    const isImageFile = file.type?.startsWith('image/');
    const isJsonFile = file.name.toLowerCase().endsWith('.json') || file.type === 'application/json';

    useEffect(() => {
        if (isLargeFile) {
            setIsLoading(false);
            return;
        }

        loadFileContent();
    }, [file]);

    const loadFileContent = async () => {
        if (!file.storage_path) {
            setError('No storage path found');
            setIsLoading(false);
            return;
        }

        try {
            if (isImageFile) {
                const { data } = supabase.storage.from('files').getPublicUrl(file.storage_path);
                setImageUrl(data.publicUrl);
            } else if (isTextFile) {
                const { data, error: downloadError } = await supabase.storage
                    .from('files')
                    .download(file.storage_path);

                if (downloadError) throw downloadError;

                const text = await data.text();
                setContent(text);
            } else {
                setError('Preview not available for this file type');
            }
        } catch (err) {
            console.error('Failed to load file:', err);
            setError('Failed to load file content');
        } finally {
            setIsLoading(false);
        }
    };

    const formatJson = (text: string): string => {
        try {
            return JSON.stringify(JSON.parse(text), null, 2);
        } catch {
            return text;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-white/10 bg-gray-900 shadow-2xl overflow-hidden animate-scaleIn">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-blue-500/20">
                            {isImageFile ? (
                                <ImageIcon className="h-5 w-5 text-blue-400" />
                            ) : isTextFile ? (
                                <Code className="h-5 w-5 text-green-400" />
                            ) : (
                                <FileText className="h-5 w-5 text-orange-400" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-semibold text-white truncate">{file.name}</h3>
                            <p className="text-xs text-gray-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type || 'Unknown type'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onDownload}
                            className="p-2 rounded-lg hover:bg-white/10 text-blue-400 transition-colors"
                            title="Download"
                        >
                            <Download className="h-5 w-5" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-400 mb-4" />
                            <p className="text-gray-500">Loading preview...</p>
                        </div>
                    ) : isLargeFile ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="p-4 rounded-full bg-yellow-500/20 mb-4">
                                <AlertTriangle className="h-10 w-10 text-yellow-400" />
                            </div>
                            <h4 className="text-lg font-semibold text-white mb-2">File Too Large for Preview</h4>
                            <p className="text-gray-500 mb-6 max-w-md">
                                This file is {(file.size / 1024 / 1024).toFixed(1)} MB which exceeds the 20MB preview limit.
                                {file.is_chunked && ` It's also split into ${file.chunk_count} chunks.`}
                            </p>
                            <button
                                onClick={onDownload}
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-500 transition-colors"
                            >
                                <Download className="h-5 w-5" />
                                Download File
                            </button>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="p-4 rounded-full bg-red-500/20 mb-4">
                                <AlertTriangle className="h-10 w-10 text-red-400" />
                            </div>
                            <h4 className="text-lg font-semibold text-white mb-2">Preview Not Available</h4>
                            <p className="text-gray-500 mb-6">{error}</p>
                            <button
                                onClick={onDownload}
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-500 transition-colors"
                            >
                                <Download className="h-5 w-5" />
                                Download Instead
                            </button>
                        </div>
                    ) : imageUrl ? (
                        <div className="flex items-center justify-center">
                            <img
                                src={imageUrl}
                                alt={file.name}
                                className="max-w-full max-h-[60vh] object-contain rounded-lg"
                            />
                        </div>
                    ) : content !== null ? (
                        <pre className="p-4 bg-black/30 rounded-xl text-sm text-gray-300 font-mono overflow-auto whitespace-pre-wrap break-words max-h-[60vh]">
                            {isJsonFile ? formatJson(content) : content}
                        </pre>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <p className="text-gray-500">No preview available</p>
                            <button
                                onClick={onDownload}
                                className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-500 transition-colors"
                            >
                                <Download className="h-5 w-5" />
                                Download File
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes scaleIn {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .animate-scaleIn {
                    animation: scaleIn 0.2s ease-out;
                }
            `}</style>
        </div>
    );
}
