import { useState, createContext, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
}

interface ConfirmContextType {
    confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function useConfirm() {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmProvider');
    }
    return context;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
    const [dialogState, setDialogState] = useState<{
        isOpen: boolean;
        options: ConfirmDialogOptions;
        resolve: ((value: boolean) => void) | null;
    }>({
        isOpen: false,
        options: { title: '', message: '' },
        resolve: null,
    });

    const confirm = useCallback((options: ConfirmDialogOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            setDialogState({ isOpen: true, options, resolve });
        });
    }, []);

    const handleConfirm = () => {
        dialogState.resolve?.(true);
        setDialogState((prev) => ({ ...prev, isOpen: false, resolve: null }));
    };

    const handleCancel = () => {
        dialogState.resolve?.(false);
        setDialogState((prev) => ({ ...prev, isOpen: false, resolve: null }));
    };

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            <AnimatePresence>
                {dialogState.isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                        onClick={handleCancel}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative mx-4 w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-gray-900/95 p-6 shadow-2xl shadow-red-500/10"
                        >
                            {/* Glow effect */}
                            <div className="absolute -top-20 -left-20 h-40 w-40 rounded-full bg-red-500/20 blur-[80px]" />

                            <div className="relative flex items-start gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
                                    <AlertTriangle className="h-6 w-6 text-red-400" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-white">{dialogState.options.title}</h3>
                                    <p className="mt-1 text-sm text-gray-400">{dialogState.options.message}</p>
                                </div>
                            </div>

                            <div className="relative mt-6 flex justify-end gap-3">
                                <button
                                    onClick={handleCancel}
                                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-300 transition-all hover:bg-white/10"
                                >
                                    {dialogState.options.cancelText || 'Cancel'}
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    className="rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-red-500/25 transition-all hover:bg-red-600 hover:shadow-red-500/40"
                                >
                                    {dialogState.options.confirmText || 'Delete'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </ConfirmContext.Provider>
    );
}
