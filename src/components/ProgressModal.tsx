import { Upload, Download } from 'lucide-react';

interface ProgressModalProps {
    type: 'upload' | 'download';
    fileName: string;
    fileSize: number;
    progress: number;
    estimatedTimeRemaining: string;
}

export function ProgressModal({
    type,
    fileName,
    fileSize,
    progress,
    estimatedTimeRemaining
}: ProgressModalProps) {
    const isUpload = type === 'upload';
    const Icon = isUpload ? Upload : Download;
    const gradientFrom = isUpload ? 'from-blue-500' : 'from-green-500';
    const gradientTo = isUpload ? 'to-blue-400' : 'to-emerald-400';
    const bgGlow = isUpload ? 'bg-blue-500/20' : 'bg-green-500/20';
    const textColor = isUpload ? 'text-blue-400' : 'text-green-400';

    const formatSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gray-900 p-6 shadow-2xl animate-scaleIn">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${bgGlow} ${textColor} animate-pulse`}>
                            <Icon className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">
                                {isUpload ? 'Uploading' : 'Downloading'}
                            </h3>
                            <p className="text-xs text-gray-500">{formatSize(fileSize)}</p>
                        </div>
                    </div>
                    <div className={`text-2xl font-bold ${textColor}`}>
                        {progress}%
                    </div>
                </div>

                {/* File name */}
                <p className="text-sm text-gray-400 truncate mb-4 font-mono bg-black/30 px-3 py-2 rounded-lg">
                    {fileName}
                </p>

                {/* Progress Bar */}
                <div className="h-4 bg-gray-800 rounded-full overflow-hidden mb-4 relative">
                    {/* Animated background stripes */}
                    <div
                        className={`absolute inset-0 opacity-20 bg-gradient-to-r ${gradientFrom} ${gradientTo}`}
                        style={{
                            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)',
                            animation: 'moveStripes 1s linear infinite'
                        }}
                    />
                    {/* Progress fill */}
                    <div
                        className={`h-full bg-gradient-to-r ${gradientFrom} ${gradientTo} rounded-full transition-all duration-300 ease-out relative overflow-hidden`}
                        style={{ width: `${progress}%` }}
                    >
                        {/* Shimmer effect */}
                        <div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                            style={{ animation: 'shimmer 1.5s infinite' }}
                        />
                    </div>
                </div>

                {/* Stats */}
                <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>
                        {formatSize(fileSize * (progress / 100))} / {formatSize(fileSize)}
                    </span>
                    <span className={textColor}>
                        ETA: {estimatedTimeRemaining}
                    </span>
                </div>

                {/* Message */}
                {progress < 100 && (
                    <div className="mt-4 text-center">
                        <p className="text-xs text-gray-600">
                            Please don't close this page...
                        </p>
                        {/* Animated dots */}
                        <div className="flex justify-center gap-1 mt-2">
                            <div className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}

                {/* Success state */}
                {progress >= 100 && (
                    <div className="mt-4 text-center">
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${bgGlow} ${textColor} text-sm font-medium animate-pulse`}>
                            ✓ Complete!
                        </div>
                    </div>
                )}
            </div>

            {/* CSS Animations */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                @keyframes moveStripes {
                    0% { background-position: 0 0; }
                    100% { background-position: 40px 0; }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-out;
                }
                .animate-scaleIn {
                    animation: scaleIn 0.3s ease-out;
                }
            `}</style>
        </div>
    );
}
