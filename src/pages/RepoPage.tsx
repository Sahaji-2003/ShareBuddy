import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, File as FileIcon, Trash2, Download, Plus } from 'lucide-react';
import { getRepo, getRepoFiles, addFile, deleteFile } from '../lib/db';
import { LargeTextCreator } from '../components/LargeTextCreator';
import { GlassCard } from '../components/ui/GlassCard';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';

interface Repo {
    id: string;
    name: string;
    description: string;
    createdAt: number;
}

interface FileRecord {
    id: string;
    name: string;
    type: string;
    size: number;
    createdAt: number;
    content: Blob;
}

export function RepoPage() {
    const { id } = useParams<{ id: string }>();
    const [repo, setRepo] = useState<Repo | null>(null);
    const [files, setFiles] = useState<FileRecord[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [showTextCreator, setShowTextCreator] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { showToast } = useToast();
    const { confirm } = useConfirm();

    useEffect(() => {
        if (id) {
            loadRepo(id);
            loadFiles(id);
        }
    }, [id]);

    const loadRepo = async (repoId: string) => {
        const data = await getRepo(repoId);
        setRepo(data || null);
    };

    const loadFiles = async (repoId: string) => {
        const data = await getRepoFiles(repoId);
        setFiles(data);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files.length || !id) return;

        setIsUploading(true);
        try {
            const file = e.target.files[0];
            await addFile(id, file, file.name);
            await loadFiles(id);
            showToast(`${file.name} uploaded successfully!`, 'success');
        } catch (err) {
            console.error('Upload failed:', err);
            showToast('Upload failed', 'error');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeleteFile = async (fileId: string, fileName: string) => {
        const confirmed = await confirm({
            title: 'Delete File',
            message: `Are you sure you want to delete "${fileName}"?`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
        });

        if (!confirmed) return;

        try {
            await deleteFile(fileId);
            if (id) {
                const updatedFiles = await getRepoFiles(id);
                setFiles(updatedFiles);
            }
            showToast('File deleted', 'success');
        } catch (err) {
            console.error('Delete failed:', err);
            showToast('Failed to delete file', 'error');
        }
    };

    const handleDownload = (file: FileRecord) => {
        const blob = new Blob([file.content], { type: file.type || 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        showToast(`Downloading ${file.name}`, 'info');
    };

    if (!repo) return <div className="p-8 flex items-center justify-center"><div className="text-gray-500">Loading...</div></div>;

    return (
        <div className="space-y-6 relative">
            {/* Subtle background */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute top-[10%] right-[5%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[150px]" />
            </div>

            {/* Header */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                    <Link to="/" className="rounded-full p-2 hover:bg-white/10 transition-colors">
                        <ArrowLeft className="h-5 w-5 text-gray-400" />
                    </Link>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white truncate">{repo.name}</h1>
                        {repo.description && (
                            <p className="text-gray-500 text-sm truncate">{repo.description}</p>
                        )}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:bg-blue-500 active:scale-95 disabled:opacity-50"
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        {isUploading ? 'Uploading...' : 'Upload File'}
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileUpload}
                    />

                    <button
                        onClick={() => setShowTextCreator(true)}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium transition-all hover:bg-white/10 active:scale-95"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Create Text
                    </button>
                </div>
            </div>

            {/* Files List */}
            <GlassCard className="p-0 overflow-hidden">
                {/* Desktop Header */}
                <div className="hidden sm:grid grid-cols-12 gap-4 border-b border-white/5 bg-white/5 p-4 text-sm font-medium text-gray-500">
                    <div className="col-span-6">Name</div>
                    <div className="col-span-2">Size</div>
                    <div className="col-span-2">Type</div>
                    <div className="col-span-2 text-right">Actions</div>
                </div>

                <div className="max-h-[60vh] overflow-auto">
                    {files.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                            <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-3">
                                <Upload className="h-6 w-6 opacity-30" />
                            </div>
                            <p className="text-sm">No files yet. Upload one or create a text file.</p>
                        </div>
                    ) : (
                        files.map((file) => (
                            <div key={file.id} className="group border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                {/* Mobile Layout */}
                                <div className="sm:hidden p-4 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-blue-500/20">
                                            {file.type.startsWith('text/') ? (
                                                <FileText className="h-4 w-4 text-blue-400" />
                                            ) : (
                                                <FileIcon className="h-4 w-4 text-orange-400" />
                                            )}
                                        </div>
                                        <span className="font-medium text-white text-sm truncate flex-1">{file.name}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                        <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleDownload(file)}
                                                className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                                            >
                                                <Download className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteFile(file.id, file.name)}
                                                className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Desktop Layout */}
                                <div className="hidden sm:grid grid-cols-12 gap-4 p-4 text-sm items-center">
                                    <div className="col-span-6 flex items-center gap-3 overflow-hidden">
                                        <div className="p-2 rounded-lg bg-blue-500/20">
                                            {file.type.startsWith('text/') ? (
                                                <FileText className="h-4 w-4 text-blue-400" />
                                            ) : (
                                                <FileIcon className="h-4 w-4 text-orange-400" />
                                            )}
                                        </div>
                                        <span className="truncate font-medium text-white">{file.name}</span>
                                    </div>
                                    <div className="col-span-2 text-gray-500 font-mono text-xs">
                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </div>
                                    <div className="col-span-2 text-gray-500 truncate text-xs">
                                        {file.type || 'Unknown'}
                                    </div>
                                    <div className="col-span-2 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleDownload(file)}
                                            className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                                        >
                                            <Download className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteFile(file.id, file.name)}
                                            className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </GlassCard>

            {showTextCreator && id && (
                <LargeTextCreator
                    repoId={id}
                    onComplete={() => {
                        setShowTextCreator(false);
                        loadFiles(id);
                        showToast('Text file created successfully!', 'success');
                    }}
                    onCancel={() => setShowTextCreator(false)}
                />
            )}
        </div>
    );
}
