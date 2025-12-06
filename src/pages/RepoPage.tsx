import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, File as FileIcon, Trash2, Download, Plus, Loader2, Search } from 'lucide-react';
import { getRepo, getRepoFiles, uploadFile, deleteFile, downloadFile, type Repo, type FileRecord } from '../lib/db';
import { LargeTextCreator } from '../components/LargeTextCreator';
import { GlassCard } from '../components/ui/GlassCard';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { useProject } from '../contexts/ProjectContext';

export function RepoPage() {
    const { id } = useParams<{ id: string }>();
    const [repo, setRepo] = useState<Repo | null>(null);
    const [files, setFiles] = useState<FileRecord[]>([]);
    const [filteredFiles, setFilteredFiles] = useState<FileRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [showTextCreator, setShowTextCreator] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { showToast } = useToast();
    const { confirm } = useConfirm();
    const { projectCode } = useProject();

    useEffect(() => {
        if (id) {
            loadData();
        }
    }, [id]);

    useEffect(() => {
        // Filter files based on search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            setFilteredFiles(
                files.filter((file) => file.name.toLowerCase().includes(query))
            );
        } else {
            setFilteredFiles(files);
        }
    }, [searchQuery, files]);

    const loadData = async () => {
        if (!id) return;
        setIsLoading(true);
        try {
            const [repoData, filesData] = await Promise.all([
                getRepo(id),
                getRepoFiles(id),
            ]);
            setRepo(repoData);
            setFiles(filesData);
        } catch (err) {
            console.error(err);
            showToast('Failed to load repository', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files.length || !id || !projectCode) return;

        setIsUploading(true);

        try {
            const file = e.target.files[0];
            await uploadFile(projectCode, id, file, file.name);
            showToast(`${file.name} uploaded!`, 'success');
            loadData();
        } catch (err) {
            console.error(err);
            showToast('Upload failed', 'error');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeleteFile = async (file: FileRecord) => {
        const confirmed = await confirm({
            title: 'Delete File',
            message: `Delete "${file.name}"? This cannot be undone.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
        });

        if (!confirmed) return;

        try {
            await deleteFile(file.id, file.storage_path);
            showToast('File deleted', 'success');
            loadData();
        } catch (err) {
            console.error(err);
            showToast('Failed to delete file', 'error');
        }
    };

    const handleDownload = async (file: FileRecord) => {
        try {
            showToast(`Downloading ${file.name}...`, 'info');
            if (file.storage_path) {
                await downloadFile(file.storage_path, file.name);
            }
        } catch (err) {
            console.error(err);
            showToast('Download failed', 'error');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            </div>
        );
    }

    if (!repo) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <p>Repository not found</p>
                <Link to="/" className="mt-4 text-blue-400 hover:underline">
                    ← Back to repositories
                </Link>
            </div>
        );
    }

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
                        <h1 className="text-xl sm:text-2xl font-bold text-white truncate">{repo.name}</h1>
                        {repo.description && (
                            <p className="text-gray-500 text-sm truncate">{repo.description}</p>
                        )}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-500 disabled:opacity-50"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <Upload className="mr-2 h-4 w-4" />
                                Upload File
                            </>
                        )}
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileUpload}
                    />

                    <button
                        onClick={() => setShowTextCreator(true)}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium transition-all hover:bg-white/10"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Create Text
                    </button>
                </div>

                {/* Search */}
                {files.length > 0 && (
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search files..."
                            className="w-full h-11 pl-10 pr-4 rounded-xl border border-white/10 bg-white/5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        />
                    </div>
                )}
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
                    {filteredFiles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                            <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-3">
                                <Upload className="h-6 w-6 opacity-30" />
                            </div>
                            {searchQuery ? (
                                <p className="text-sm">No files match your search</p>
                            ) : (
                                <p className="text-sm">No files yet. Upload or create one.</p>
                            )}
                        </div>
                    ) : (
                        filteredFiles.map((file) => (
                            <div key={file.id} className="group border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                {/* Mobile Layout */}
                                <div className="sm:hidden p-4 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-blue-500/20">
                                            {file.type?.startsWith('text/') ? (
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
                                                onClick={() => handleDeleteFile(file)}
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
                                            {file.type?.startsWith('text/') ? (
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
                                            onClick={() => handleDeleteFile(file)}
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

            {showTextCreator && id && projectCode && (
                <LargeTextCreator
                    repoId={id}
                    projectCode={projectCode}
                    onComplete={() => {
                        setShowTextCreator(false);
                        loadData();
                        showToast('Text file created!', 'success');
                    }}
                    onCancel={() => setShowTextCreator(false)}
                />
            )}
        </div>
    );
}
