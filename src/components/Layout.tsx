import { Link, Outlet } from 'react-router-dom';
import { FolderGit2 } from 'lucide-react';

export function Layout() {
    return (
        <div className="min-h-screen bg-background font-sans antialiased">
            <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-gray-900/80 backdrop-blur-xl">
                <div className="container flex h-14 max-w-screen-xl mx-auto items-center px-4">
                    <Link to="/" className="flex items-center gap-2.5 group">
                        <div className="p-1.5 rounded-lg bg-blue-500/20 group-hover:bg-blue-500 transition-colors">
                            <FolderGit2 className="h-4 w-4 text-blue-400 group-hover:text-white transition-colors" />
                        </div>
                        <span className="font-semibold text-white text-sm sm:text-base">ShareBuddy</span>
                    </Link>
                </div>
            </header>
            <main className="container max-w-screen-xl mx-auto px-4 py-6">
                <Outlet />
            </main>
        </div>
    );
}
