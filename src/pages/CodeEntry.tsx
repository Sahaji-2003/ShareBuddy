import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderGit2, ArrowRight, Plus, Loader2 } from 'lucide-react';
import { createProject, validateProjectCode } from '../lib/db';
import { useProject } from '../contexts/ProjectContext';
import { useToast } from '../components/ui/Toast';

export function CodeEntry() {
    const [code, setCode] = useState(['', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [mode, setMode] = useState<'join' | 'create'>('join');
    const { setProjectCode } = useProject();
    const { showToast } = useToast();
    const navigate = useNavigate();

    const handleCodeChange = (index: number, value: string) => {
        // Only allow digits
        const digit = value.replace(/\D/g, '').slice(-1);

        const newCode = [...code];
        newCode[index] = digit;
        setCode(newCode);

        // Auto-focus next input
        if (digit && index < 3) {
            const nextInput = document.getElementById(`code-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            const prevInput = document.getElementById(`code-${index - 1}`);
            prevInput?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedText = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
        const newCode = pastedText.split('').concat(['', '', '', '']).slice(0, 4);
        setCode(newCode);

        // Focus last filled input or first empty
        const lastIndex = Math.min(pastedText.length, 3);
        document.getElementById(`code-${lastIndex}`)?.focus();
    };

    const handleJoin = async () => {
        const fullCode = code.join('');
        if (fullCode.length !== 4) {
            showToast('Please enter a 4-digit code', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const isValid = await validateProjectCode(fullCode);
            if (isValid) {
                setProjectCode(fullCode);
                showToast('Joined project successfully!', 'success');
                navigate('/');
            } else {
                showToast('Invalid project code', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Failed to join project', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async () => {
        setIsLoading(true);
        try {
            const newCode = await createProject();
            setProjectCode(newCode);
            showToast(`Project created! Your code is ${newCode}`, 'success');
            navigate('/');
        } catch (err) {
            console.error(err);
            showToast('Failed to create project', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            {/* Subtle background */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute top-[20%] left-[20%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[150px]" />
                <div className="absolute bottom-[20%] right-[20%] w-[30%] h-[30%] rounded-full bg-purple-500/10 blur-[150px]" />
            </div>

            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/20 mb-4">
                        <FolderGit2 className="h-8 w-8 text-blue-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">ShareBuddy</h1>
                    <p className="text-gray-500 text-sm mt-1">Share files across devices</p>
                </div>

                {/* Card */}
                <div className="bg-gray-900/50 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                    {mode === 'join' ? (
                        <>
                            <h2 className="text-lg font-semibold text-white mb-1">Join a Project</h2>
                            <p className="text-gray-500 text-sm mb-6">Enter the 4-digit project code</p>

                            {/* Code Input */}
                            <div className="flex justify-center gap-3 mb-6">
                                {code.map((digit, index) => (
                                    <input
                                        key={index}
                                        id={`code-${index}`}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleCodeChange(index, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                        onPaste={index === 0 ? handlePaste : undefined}
                                        className="w-14 h-16 text-center text-2xl font-bold rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                        disabled={isLoading}
                                    />
                                ))}
                            </div>

                            {/* Join Button */}
                            <button
                                onClick={handleJoin}
                                disabled={isLoading || code.join('').length !== 4}
                                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition-all hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        Join Project
                                        <ArrowRight className="h-4 w-4" />
                                    </>
                                )}
                            </button>

                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-white/10"></div>
                                </div>
                                <div className="relative flex justify-center text-xs">
                                    <span className="px-2 bg-gray-900/50 text-gray-500">or</span>
                                </div>
                            </div>

                            <button
                                onClick={() => setMode('create')}
                                className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-gray-300 transition-all hover:bg-white/10"
                            >
                                <Plus className="h-4 w-4" />
                                Create New Project
                            </button>
                        </>
                    ) : (
                        <>
                            <h2 className="text-lg font-semibold text-white mb-1">Create a Project</h2>
                            <p className="text-gray-500 text-sm mb-6">Get a unique 4-digit code to share</p>

                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
                                <p className="text-sm text-blue-300">
                                    A unique code will be generated for you. Share this code with others to give them access to your files.
                                </p>
                            </div>

                            <button
                                onClick={handleCreate}
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition-all hover:bg-blue-500 disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        <Plus className="h-4 w-4" />
                                        Create Project
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => setMode('join')}
                                className="w-full mt-3 text-sm text-gray-500 hover:text-gray-400 transition-colors"
                            >
                                ← Back to join
                            </button>
                        </>
                    )}
                </div>

                <p className="text-center text-xs text-gray-600 mt-6">
                    Files are stored securely in the cloud
                </p>
            </div>
        </div>
    );
}
