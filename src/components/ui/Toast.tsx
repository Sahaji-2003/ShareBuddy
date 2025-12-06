import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

interface ToastContextType {
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        const id = crypto.randomUUID();
        setToasts((prev) => [...prev, { id, message, type }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    useEffect(() => {
        if (toasts.length > 0) {
            const timer = setTimeout(() => {
                setToasts((prev) => prev.slice(1));
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [toasts]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'success':
                return <CheckCircle className="h-5 w-5 text-green-400" />;
            case 'error':
                return <AlertCircle className="h-5 w-5 text-red-400" />;
            default:
                return <Info className="h-5 w-5 text-blue-400" />;
        }
    };

    const getGlowColor = (type: string) => {
        switch (type) {
            case 'success':
                return 'shadow-green-500/20';
            case 'error':
                return 'shadow-red-500/20';
            default:
                return 'shadow-blue-500/20';
        }
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
                <AnimatePresence>
                    {toasts.map((toast) => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, y: 50, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 100, scale: 0.9 }}
                            className={`flex items-center gap-3 rounded-xl border border-white/10 bg-gray-900/90 backdrop-blur-xl px-4 py-3 shadow-2xl ${getGlowColor(toast.type)}`}
                        >
                            {getIcon(toast.type)}
                            <span className="text-sm text-gray-100">{toast.message}</span>
                            <button
                                onClick={() => removeToast(toast.id)}
                                className="ml-2 p-1 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X className="h-4 w-4 text-gray-400" />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}
