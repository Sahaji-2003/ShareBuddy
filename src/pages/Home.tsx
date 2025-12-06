import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Folder, Trash2 } from 'lucide-react';
import { createRepo, getAllRepos, deleteRepo } from '../lib/db';
import { GlassCard } from '../components/ui/GlassCard';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';

interface Repo {
    id: string;
    name: string;
    description: string;
    createdAt: number;
}

export function Home() {
    const [repos, setRepos] = useState<Repo[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newRepoName, setNewRepoName] = useState('');
    const [newRepoDesc, setNewRepoDesc] = useState('');
    const { showToast } = useToast();
    const { confirm } = useConfirm();

    useEffect(() => {
        loadRepos();
    }, []);

    const loadRepos = async () => {
        const data = await getAllRepos();
        setRepos(data);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRepoName.trim()) return;

        await createRepo(newRepoName, newRepoDesc);
        setNewRepoName('');
        setNewRepoDesc('');
        setIsCreating(false);
        showToast('Repository created successfully!', 'success');
        loadRepos();
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();

        const confirmed = await confirm({
            title: 'Delete Repository',
            message: 'Are you sure you want to delete this repository? All files will be permanently lost.',
            confirmText: 'Delete',
            cancelText: 'Cancel',
        });

        if (confirmed) {
            await deleteRepo(id);
            showToast('Repository deleted', 'success');
            loadRepos();
        }
    };

    return (
        <div className="space-y-6 relative">
            {/* Subtle background decoration */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute -top-[30%] -left-[20%] w-[60%] h-[60%] rounded-full bg-blue-500/10 blur-[150px]" />
                <div className="absolute bottom-[10%] -right-[20%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[150px]" />
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                        Repositories
                    </h1>
                    <p className="text-gray-500 text-sm sm:text-base mt-1">Manage your shared files and projects</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:bg-blue-500 active:scale-95"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    New Repository
                </button>
            </div>

            {/* Create Form */}
            {isCreating && (
                <GlassCard className="max-w-md mx-auto">
                    <h2 className="text-lg font-semibold mb-4 text-white">Create New Repository</h2>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="name" className="text-sm font-medium text-gray-400">Name</label>
                            <input
                                id="name"
                                value={newRepoName}
                                onChange={(e) => setNewRepoName(e.target.value)}
                                className="flex h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                placeholder="My Awesome Project"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="desc" className="text-sm font-medium text-gray-400">Description</label>
                            <input
                                id="desc"
                                value={newRepoDesc}
                                onChange={(e) => setNewRepoDesc(e.target.value)}
                                className="flex h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                placeholder="Optional description"
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
                                className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all"
                            >
                                Create
                            </button>
                        </div>
                    </form>
                </GlassCard>
            )}

            {/* Repository Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {repos.map((repo) => (
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
                                        title="Delete Repository"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                                <h3 className="text-lg font-semibold mb-1 text-white truncate">{repo.name}</h3>
                                <p className="text-sm text-gray-500 line-clamp-2">{repo.description || 'No description'}</p>
                            </div>
                            <div className="text-xs text-gray-600 pt-3 mt-3 border-t border-white/5 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                Created {new Date(repo.createdAt).toLocaleDateString()}
                            </div>
                        </GlassCard>
                    </Link>
                ))}

                {repos.length === 0 && !isCreating && (
                    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center text-gray-500">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                            <Folder className="h-8 w-8 opacity-30" />
                        </div>
                        <h3 className="text-lg font-semibold mb-1 text-gray-400">No repositories yet</h3>
                        <p className="text-sm max-w-xs">Create your first repository to start sharing files.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
