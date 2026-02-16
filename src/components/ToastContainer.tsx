import React from 'react';
import { useAppStore } from '../store/app-store';

export const ToastContainer: React.FC = () => {
    const { toasts, removeToast } = useAppStore();

    if (toasts.length === 0) return null;

    return (
        <div className="toast-container">
            {toasts.map((toast) => (
                <div key={toast.id} className={`toast ${toast.type}`}>
                    <span>
                        {toast.type === 'success' && '✓'}
                        {toast.type === 'error' && '✕'}
                        {toast.type === 'info' && 'ℹ'}
                    </span>
                    <span>{toast.message}</span>
                    <button className="toast-close" onClick={() => removeToast(toast.id)}>
                        ✕
                    </button>
                </div>
            ))}
        </div>
    );
};
