import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { getStorageUsage } from '../lib/db';
import { useProject } from '../contexts/ProjectContext';

export function StorageWarning() {
    const [usage, setUsage] = useState<{ used: number; percentage: number } | null>(null);
    const [dismissed, setDismissed] = useState(false);
    const { projectCode } = useProject();

    useEffect(() => {
        if (projectCode) {
            checkUsage();
        }
    }, [projectCode]);

    const checkUsage = async () => {
        if (!projectCode) return;
        try {
            const data = await getStorageUsage(projectCode);
            setUsage({ used: data.used, percentage: data.percentage });
        } catch (err) {
            console.error('Failed to check storage:', err);
        }
    };

    const formatSize = (bytes: number): string => {
        if (bytes >= 1024 * 1024 * 1024) {
            return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
        }
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    };

    // Only show warning at 80%+ usage
    if (!usage || usage.percentage < 80 || dismissed) {
        return null;
    }

    const isNearLimit = usage.percentage >= 90;
    const isAtLimit = usage.percentage >= 100;

    return (
        <div className={`rounded-xl border p-4 mb-6 flex items-start gap-3 ${isAtLimit
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : isNearLimit
                    ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                    : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
            }`}>
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
                <p className="font-medium">
                    {isAtLimit
                        ? 'Storage limit reached!'
                        : isNearLimit
                            ? 'Storage almost full!'
                            : 'Storage warning'}
                </p>
                <p className="text-sm opacity-80 mt-1">
                    {formatSize(usage.used)} / 1 GB used ({usage.percentage.toFixed(1)}%)
                    {isAtLimit
                        ? ' — Delete some files to upload more.'
                        : ' — Consider deleting unused files.'}
                </p>
                {/* Progress bar */}
                <div className="mt-2 h-2 bg-black/30 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all ${isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-orange-500' : 'bg-yellow-500'
                            }`}
                        style={{ width: `${Math.min(usage.percentage, 100)}%` }}
                    />
                </div>
            </div>
            <button
                onClick={() => setDismissed(true)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
