import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
    id: string;
    type: ToastType;
    title?: string;
    message: string;
    duration?: number;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showToast = useCallback((message: string, type: ToastType = 'info', title?: string, duration: number = 3800) => {
        const id = Math.random().toString(36).substring(2, 9);
        const newToast: ToastItem = { id, type, title, message, duration };

        setToasts((prev) => [...prev.slice(-4), newToast]); // Máximo 5 toasts visibles

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, [removeToast]);

    const success = useCallback((message: string, title: string = 'Operación Exitosa') => {
        showToast(message, 'success', title);
    }, [showToast]);

    const error = useCallback((message: string, title: string = 'Atención Requerida') => {
        showToast(message, 'error', title);
    }, [showToast]);

    const warning = useCallback((message: string, title: string = 'Advertencia') => {
        showToast(message, 'warning', title);
    }, [showToast]);

    const info = useCallback((message: string, title: string = 'Información') => {
        showToast(message, 'info', title);
    }, [showToast]);

    const getToastStyles = (type: ToastType) => {
        switch (type) {
            case 'success':
                return {
                    border: 'border-emerald-500/50',
                    bg: 'bg-slate-950/95 shadow-emerald-950/40',
                    icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />,
                    titleColor: 'text-emerald-300',
                    glow: 'from-emerald-500/20 to-transparent',
                };
            case 'error':
                return {
                    border: 'border-rose-500/50',
                    bg: 'bg-slate-950/95 shadow-rose-950/40',
                    icon: <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />,
                    titleColor: 'text-rose-300',
                    glow: 'from-rose-500/20 to-transparent',
                };
            case 'warning':
                return {
                    border: 'border-amber-500/50',
                    bg: 'bg-slate-950/95 shadow-amber-950/40',
                    icon: <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />,
                    titleColor: 'text-amber-300',
                    glow: 'from-amber-500/20 to-transparent',
                };
            case 'info':
            default:
                return {
                    border: 'border-cyan-500/50',
                    bg: 'bg-slate-950/95 shadow-cyan-950/40',
                    icon: <Info className="w-5 h-5 text-cyan-400 flex-shrink-0" />,
                    titleColor: 'text-cyan-300',
                    glow: 'from-cyan-500/20 to-transparent',
                };
        }
    };

    return (
        <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
            {children}
            {/* Toast Container Flotante */}
            <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full px-3 sm:px-0 pointer-events-none">
                {toasts.map((toast) => {
                    const style = getToastStyles(toast.type);
                    return (
                        <div
                            key={toast.id}
                            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom-3 fade-in ${style.border} ${style.bg}`}
                        >
                            <div className="mt-0.5">{style.icon}</div>
                            <div className="flex-1 min-w-0">
                                {toast.title && (
                                    <h4 className={`text-xs font-bold ${style.titleColor} mb-0.5`}>
                                        {toast.title}
                                    </h4>
                                )}
                                <p className="text-xs text-slate-300 font-sans leading-relaxed break-words">
                                    {toast.message}
                                </p>
                            </div>
                            <button
                                onClick={() => removeToast(toast.id)}
                                className="text-slate-500 hover:text-white p-1 transition cursor-pointer"
                                title="Cerrar"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = (): ToastContextType => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast debe ser utilizado dentro de un ToastProvider');
    }
    return context;
};
