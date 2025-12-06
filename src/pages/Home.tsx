import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Folder, Trash2, Loader2, Search, Shield } from 'lucide-react';
import { createRepo, getRepos, deleteRepo, getAllRepos, type Repo } from '../lib/db';
import { GlassCard } from '../components/ui/GlassCard';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { useProject } from '../contexts/ProjectContext';
import { StorageWarning } from '../components/StorageWarning';

export function Home() {
    const [repos, setRepos] = useState<Repo[]>([]);
    const [filteredRepos, setFilteredRepos] = useState<Repo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [newRepoName, setNewRepoName] = useState('');
    const [newRepoDesc, setNewRepoDesc] = useState('');
    const { showToast } = useToast();
    const { confirm } = useConfirm();
    const { projectCode, isAdmin } = useProject();

    useEffect(() => {
        if (projectCode) {
            loadRepos();
        }
    }, [projectCode, isAdmin]);

    useEffect(() => {
        // Filter repos based on search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            setFilteredRepos(
                repos.filter(
                    (repo) =>
                        repo.name.toLowerCase().includes(query) ||
                        (repo.description || '').toLowerCase().includes(query) ||
                        (isAdmin && repo.project_code.includes(query))
                )
            );
        } else {
            setFilteredRepos(repos);
        }
    }, [searchQuery, repos, isAdmin]);

    const loadRepos = async () => {
        if (!projectCode) return;
        setIsLoading(true);
        try {
            // Admin sees all repos, regular users see only their project's repos
            const data = isAdmin ? await getAllRepos() : await getRepos(projectCode);
            setRepos(data);
        } catch (err) {
            console.error(err);
            showToast('Failed to load repositories', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRepoName.trim() || !projectCode) return;

        setIsSaving(true);
        try {
            await createRepo(projectCode, newRepoName, newRepoDesc);
            setNewRepoName('');
            setNewRepoDesc('');
            setIsCreating(false);
            showToast('Repository created!', 'success');
            loadRepos();
        } catch (err) {
            console.error(err);
            showToast('Failed to create repository', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();

        const confirmed = await confirm({
            title: 'Delete Repository',
            message: 'This will delete all files in this repository. This action cannot be undone.',
            confirmText: 'Delete',
            cancelText: 'Cancel',
        });

        if (confirmed) {
            try {
                await deleteRepo(id);
                showToast('Repository deleted', 'success');
                loadRepos();
            } catch (err) {
                console.error(err);
                showToast('Failed to delete repository', 'error');
            }
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6 relative">
            {/* Subtle background */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute -top-[30%] -left-[20%] w-[60%] h-[60%] rounded-full bg-blue-500/10 blur-[150px]" />
            </div>

            {/* Storage Warning */}
            <StorageWarning />

            {/* Header */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl sm:text-3xl font-bold text-white">
                                {isAdmin ? 'All Repositories' : 'Repositories'}
                            </h1>
                            {isAdmin && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-medium">
                                    <Shield className="h-3 w-3" />
                                    Admin
                                </span>
                            )}
                        </div>
                        <p className="text-gray-500 text-sm mt-1">
                            {repos.length} {repos.length === 1 ? 'repository' : 'repositories'}
                            {isAdmin && ' (all projects)'}
                        </p>
                    </div>
                    {!isAdmin && (
                        <button
                            onClick={() => setIsCreating(true)}
                            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-500 active:scale-95"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            New Repository
                        </button>
                    )}
                </div>

                {/* Search */}
                {repos.length > 0 && (
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search repositories..."
                            className="w-full h-11 pl-10 pr-4 rounded-xl border border-white/10 bg-white/5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        />
                    </div>
                )}
            </div>

            {/* Create Form */}
            {isCreating && (
                <GlassCard className="max-w-md mx-auto">
                    <h2 className="text-lg font-semibold mb-4 text-white">Create Repository</h2>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Name</label>
                            <input
                                value={newRepoName}
                                onChange={(e) => setNewRepoName(e.target.value)}
                                className="w-full h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                placeholder="My Project Files"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Description (optional)</label>
                            <input
                                value={newRepoDesc}
                                onChange={(e) => setNewRepoDesc(e.target.value)}
                                className="w-full h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                placeholder="Project files and documents"
                            />
                        </div>
                        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsCreating(false)}
                                className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving || !newRepoName.trim()}
                                className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                            </button>
                        </div>
                    </form>
                </GlassCard>
            )}

            {/* Repository Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredRepos.map((repo) => (
                    <Link key={repo.id} to={`/repo/${repo.id}`}>
                        <GlassCard hoverEffect className="h-full flex flex-col justify-between group">
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300">
                                        <Folder className="h-5 w-5" />
                                    </div>
                                    <button
                                        onClick={(e) => handleDelete(e, repo.id)}
                                        className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/20 text-red-400 rounded-full transition-all"
                                        title="Delete"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                                <h3 className="text-lg font-semibold mb-1 text-white truncate">{repo.name}</h3>
                                <p className="text-sm text-gray-500 line-clamp-2">{repo.description || 'No description'}</p>
                            </div>
                            <div className="text-xs text-gray-600 pt-3 mt-3 border-t border-white/5 flex justify-between items-center">
                                <span>Created {new Date(repo.created_at).toLocaleDateString()}</span>
                                {isAdmin && (
                                    <span className="font-mono text-yellow-500/70">#{repo.project_code}</span>
                                )}
                            </div>
                        </GlassCard>
                    </Link>
                ))}

                {filteredRepos.length === 0 && !isCreating && (
                    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center text-gray-500">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                            <Folder className="h-8 w-8 opacity-30" />
                        </div>
                        {searchQuery ? (
                            <>
                                <h3 className="text-lg font-semibold mb-1 text-gray-400">No results found</h3>
                                <p className="text-sm">Try a different search term</p>
                            </>
                        ) : (
                            <>
                                <h3 className="text-lg font-semibold mb-1 text-gray-400">No repositories yet</h3>
                                <p className="text-sm">Create your first repository to get started</p>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
