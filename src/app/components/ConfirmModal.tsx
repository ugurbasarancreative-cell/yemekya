'use client';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info' | 'success';
}

export default function ConfirmModal({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Evet, Onaylıyorum',
    cancelText = 'Vazgeç',
    type = 'danger'
}: ConfirmModalProps) {
    if (!isOpen) return null;

    const getColors = () => {
        switch (type) {
            case 'danger': return { bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-50' };
            case 'warning': return { bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-50' };
            case 'success': return { bg: 'bg-green-500', text: 'text-green-600', light: 'bg-green-50' };
            default: return { bg: 'bg-primary', text: 'text-primary', light: 'bg-indigo-50' };
        }
    };

    const colors = getColors();

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm animate-fadeIn">
            <div
                className="bg-white w-full max-w-[400px] rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden animate-scaleUp"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-10 space-y-8 flex flex-col items-center text-center">
                    {/* Icon */}
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl ${colors.light} ${colors.text}`}>
                        {type === 'danger' ? '⚠️' : type === 'warning' ? '🛠️' : type === 'success' ? '✅' : 'ℹ️'}
                    </div>

                    {/* Content */}
                    <div className="space-y-3">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                            {title}
                        </h3>
                        <p className="text-sm font-medium text-slate-500 leading-relaxed px-2">
                            {message}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col w-full gap-3 pt-2">
                        <button
                            onClick={onConfirm}
                            className={`w-full py-4 ${colors.bg} text-white font-black rounded-2xl transition-all active:scale-95 shadow-lg shadow-slate-200 uppercase text-[11px] tracking-widest`}
                        >
                            {confirmText}
                        </button>
                        <button
                            onClick={onCancel}
                            className="w-full py-4 bg-slate-50 hover:bg-slate-100 text-slate-400 font-bold rounded-2xl transition-all text-[11px] uppercase tracking-widest"
                        >
                            {cancelText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
