import { Link, Outlet } from 'react-router-dom';
import { FolderGit2, LogOut, Copy } from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';
import { useToast } from './ui/Toast';

export function Layout() {
    const { projectCode, logout } = useProject();
    const { showToast } = useToast();

    const copyCode = () => {
        if (projectCode) {
            navigator.clipboard.writeText(projectCode);
            showToast('Project code copied!', 'success');
        }
    };

    return (
        <div className="min-h-screen bg-background font-sans antialiased">
            <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-gray-900/80 backdrop-blur-xl">
                <div className="container flex h-14 max-w-screen-xl mx-auto items-center justify-between px-4">
                    <Link to="/" className="flex items-center gap-2.5 group">
                        <div className="p-1.5 rounded-lg bg-blue-500/20 group-hover:bg-blue-500 transition-colors">
                            <FolderGit2 className="h-4 w-4 text-blue-400 group-hover:text-white transition-colors" />
                        </div>
                        <span className="font-semibold text-white text-sm sm:text-base">ShareBuddy</span>
                    </Link>

                    <div className="flex items-center gap-2">
                        {/* Project Code Badge */}
                        <button
                            onClick={copyCode}
                            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                            title="Click to copy"
                        >
                            <span className="text-xs text-gray-500">Code:</span>
                            <span className="font-mono font-bold text-blue-400">{projectCode}</span>
                            <Copy className="h-3 w-3 text-gray-500" />
                        </button>

                        {/* Mobile Code Badge */}
                        <button
                            onClick={copyCode}
                            className="sm:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10"
                        >
                            <span className="font-mono font-bold text-blue-400 text-sm">{projectCode}</span>
                            <Copy className="h-3 w-3 text-gray-500" />
                        </button>

                        {/* Logout */}
                        <button
                            onClick={logout}
                            className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                            title="Leave project"
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </header>
            <main className="container max-w-screen-xl mx-auto px-4 py-6">
                <Outlet />
            </main>
        </div>
    );
}
