import { useState, useRef, useCallback } from 'react';
import { Save, Clipboard, ChevronDown, AlertTriangle, Loader2 } from 'lucide-react';
import { uploadFile } from '../lib/db';
import { useToast } from './ui/Toast';

interface LargeTextCreatorProps {
    repoId: string;
    projectCode: string;
    onComplete: () => void;
    onCancel: () => void;
}

interface FileFormat {
    id: string;
    name: string;
    extension: string;
    mimeType: string;
}

const FILE_FORMATS: FileFormat[] = [
    { id: 'txt', name: 'Plain Text', extension: '.txt', mimeType: 'text/plain' },
    { id: 'md', name: 'Markdown', extension: '.md', mimeType: 'text/markdown' },
    { id: 'json', name: 'JSON', extension: '.json', mimeType: 'application/json' },
    { id: 'js', name: 'JavaScript', extension: '.js', mimeType: 'text/javascript' },
    { id: 'ts', name: 'TypeScript', extension: '.ts', mimeType: 'text/typescript' },
    { id: 'py', name: 'Python', extension: '.py', mimeType: 'text/x-python' },
    { id: 'html', name: 'HTML', extension: '.html', mimeType: 'text/html' },
    { id: 'css', name: 'CSS', extension: '.css', mimeType: 'text/css' },
    { id: 'sql', name: 'SQL', extension: '.sql', mimeType: 'text/sql' },
    { id: 'csv', name: 'CSV', extension: '.csv', mimeType: 'text/csv' },
];

const LARGE_CONTENT_THRESHOLD = 100 * 1024;

export function LargeTextCreator({ repoId, projectCode, onComplete, onCancel }: LargeTextCreatorProps) {
    const [filename, setFilename] = useState('');
    const [selectedFormat, setSelectedFormat] = useState<FileFormat>(FILE_FORMATS[0]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [status, setStatus] = useState<'idle' | 'reading' | 'saving'>('idle');
    const [textContent, setTextContent] = useState('');
    const [contentBlob, setContentBlob] = useState<Blob | null>(null);
    const [isLargeContent, setIsLargeContent] = useState(false);
    const [lineCount, setLineCount] = useState<number>(0);
    const [preview, setPreview] = useState<string>('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { showToast } = useToast();

    const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const pastedText = e.clipboardData.getData('text');
        if (pastedText.length > LARGE_CONTENT_THRESHOLD) {
            e.preventDefault();
            handleLargeContent(pastedText);
        }
    }, [selectedFormat.mimeType]);

    const handleLargeContent = (text: string) => {
        // Use setTimeout to prevent blocking UI on massive content
        const blob = new Blob([text], { type: selectedFormat.mimeType });
        setContentBlob(blob);
        setIsLargeContent(true);

        // Estimate line count for huge files (count newlines efficiently)
        // For files > 10MB, sample to estimate instead of counting all
        let estimatedLines: number;
        if (text.length > 10 * 1024 * 1024) {
            // Sample first 100KB to estimate line density
            const sample = text.slice(0, 100 * 1024);
            const sampleLines = (sample.match(/\n/g) || []).length;
            const ratio = text.length / sample.length;
            estimatedLines = Math.round(sampleLines * ratio);
        } else {
            estimatedLines = (text.match(/\n/g) || []).length + 1;
        }

        setLineCount(estimatedLines);
        setPreview(text.slice(0, 500) + (text.length > 500 ? '\n...' : ''));
        setTextContent('');
        showToast(`Large content loaded (${(blob.size / 1024 / 1024).toFixed(2)} MB)`, 'success');
    };

    const handleSmartPaste = async () => {
        try {
            setStatus('reading');
            const text = await navigator.clipboard.readText();
            handleLargeContent(text);
            setStatus('idle');
        } catch (err) {
            console.error(err);
            showToast('Failed to read clipboard', 'error');
            setStatus('idle');
        }
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        if (newValue.length > LARGE_CONTENT_THRESHOLD) {
            handleLargeContent(newValue);
        } else {
            setTextContent(newValue);
            setIsLargeContent(false);
            setContentBlob(null);
        }
    };

    const handleFormatChange = (format: FileFormat) => {
        setSelectedFormat(format);
        setIsDropdownOpen(false);
        if (contentBlob) {
            contentBlob.text().then(text => {
                const newBlob = new Blob([text], { type: format.mimeType });
                setContentBlob(newBlob);
            });
        }
    };

    const getFullFilename = () => {
        if (!filename) return '';
        const baseName = filename.replace(/\.[^/.]+$/, '');
        return `${baseName}${selectedFormat.extension}`;
    };

    const clearContent = () => {
        setTextContent('');
        setContentBlob(null);
        setIsLargeContent(false);
        setPreview('');
        setLineCount(0);
    };

    const handleSave = async () => {
        const hasContent = isLargeContent ? contentBlob : textContent.trim();
        if (!filename || !hasContent) return;

        setStatus('saving');
        try {
            const fullFilename = getFullFilename();
            let fileToSave: Blob;

            if (isLargeContent && contentBlob) {
                fileToSave = contentBlob;
            } else {
                fileToSave = new Blob([textContent], { type: selectedFormat.mimeType });
            }

            await uploadFile(projectCode, repoId, fileToSave, fullFilename);
            onComplete();
        } catch (err) {
            console.error(err);
            showToast('Failed to save file', 'error');
            setStatus('idle');
        }
    };

    const hasContent = isLargeContent ? !!contentBlob : !!textContent.trim();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onCancel}>
            <div
                className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-gray-900 p-4 sm:p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="mb-4 sm:mb-6 text-xl sm:text-2xl font-bold text-white">Create Text File</h2>

                <div className="space-y-4">
                    {/* Filename and Format Row */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                            <label className="mb-2 block text-sm font-medium text-gray-400">Filename</label>
                            <input
                                value={filename}
                                onChange={(e) => setFilename(e.target.value)}
                                className="w-full h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                placeholder="my-file"
                            />
                        </div>

                        <div className="sm:w-40">
                            <label className="mb-2 block text-sm font-medium text-gray-400">Format</label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className="w-full h-11 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white hover:bg-white/10 transition-all"
                                >
                                    <span>{selectedFormat.extension}</span>
                                    <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isDropdownOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-gray-800 shadow-xl z-10">
                                        {FILE_FORMATS.map((format) => (
                                            <button
                                                key={format.id}
                                                onClick={() => handleFormatChange(format)}
                                                className={`w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition-colors ${selectedFormat.id === format.id ? 'bg-blue-500/20 text-blue-400' : 'text-gray-300'}`}
                                            >
                                                <span className="font-medium">{format.extension}</span>
                                                <span className="ml-2 text-gray-500">{format.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-400">Content</label>
                            <button
                                onClick={handleSmartPaste}
                                disabled={status === 'reading'}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                            >
                                <Clipboard className="h-3.5 w-3.5" />
                                {status === 'reading' ? 'Reading...' : 'Super Paste'}
                            </button>
                        </div>

                        {isLargeContent ? (
                            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                        <span className="text-sm font-medium text-yellow-500">Large Content Mode</span>
                                    </div>
                                    <span className="text-xs text-gray-500">{lineCount.toLocaleString()} lines</span>
                                </div>
                                <pre className="max-h-40 overflow-auto font-mono text-xs text-gray-400 whitespace-pre-wrap break-all">
                                    {preview}
                                </pre>
                                <div className="mt-3 flex items-center justify-between text-xs">
                                    <span className="text-gray-500">
                                        Size: {contentBlob ? (contentBlob.size / 1024 / 1024).toFixed(2) : 0} MB
                                    </span>
                                    <button onClick={clearContent} className="text-red-400 hover:text-red-300 transition-colors">
                                        Clear
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <textarea
                                ref={textareaRef}
                                value={textContent}
                                onChange={handleTextChange}
                                onPaste={handlePaste}
                                className="w-full h-48 sm:h-64 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder-gray-500 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                placeholder="Type or paste content here. For 10M+ lines, use Super Paste →"
                            />
                        )}

                        {!isLargeContent && textContent && (
                            <p className="mt-2 text-xs text-gray-500">
                                {textContent.split('\n').length.toLocaleString()} lines • {(new Blob([textContent]).size / 1024).toFixed(1)} KB
                            </p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-2">
                        <button
                            onClick={onCancel}
                            className="w-full sm:w-auto rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-gray-300 transition-all hover:bg-white/10"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!hasContent || !filename || status === 'saving'}
                            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:bg-blue-500 disabled:opacity-50 disabled:shadow-none"
                        >
                            {status === 'saving' ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            {status === 'saving' ? 'Saving...' : 'Save File'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
