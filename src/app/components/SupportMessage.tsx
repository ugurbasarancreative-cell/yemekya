'use client';

import { useState, useEffect, useRef } from 'react';

interface Message {
    id: number;
    text: string;
    sender: 'user' | 'bot';
    time: string;
}

export default function SupportMessage({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const [messages, setMessages] = useState<Message[]>([
        { id: 1, text: "Merhaba! 👋 YemekYa Destek ekibine hoş geldiniz. Size nasıl yardımcı olabilirim?", sender: 'bot', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const userMsg: Message = {
            id: Date.now(),
            text: inputValue,
            sender: 'user',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue("");
        setIsTyping(true);

        // Bot Response Simulation
        setTimeout(() => {
            setIsTyping(false);
            const botMsg: Message = {
                id: Date.now() + 1,
                text: getBotResponse(inputValue),
                sender: 'bot',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, botMsg]);
        }, 1500);
    };

    const getBotResponse = (query: string) => {
        const q = query.toLowerCase();
        if (q.includes("sipariş") || q.includes("nerede")) return "Siparişinizi hemen kontrol ediyorum. Şu anda restoran hazırlık aşamasında görünüyor. En kısa sürede yola çıkacaktır. 🛵";
        if (q.includes("iptal")) return "Sipariş iptal talebinizi restorana iletiyorum. Restoran onayladığı takdirde işleminiz tamamlanacaktır. Beklemede kalın.";
        if (q.includes("eksik") || q.includes("yanlış")) return "Üzgünüz! Hemen restoranla iletişime geçip eksik ürünlerinizin telafisini sağlıyorum. Anlayışınız için teşekkürler.";
        if (q.includes("merhaba") || q.includes("selam")) return "Selam! Siparişinle ilgili her türlü konuda buradayım. Sorunu yazman yeterli.";
        return "Anladım, sizi konuyla ilgili bir temsilcimize aktarıyorum. Lütfen 1-2 dakika hattan ayrılmayın. 🎧";
    };

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-6 right-6 w-[380px] h-[550px] bg-white rounded-[2rem] shadow-2xl z-[100] border border-gray-100 flex flex-col overflow-hidden animate-scaleUp">
            {/* Header */}
            <div className="bg-primary p-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl backdrop-blur-md relative">
                        🎧
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-primary rounded-full"></span>
                    </div>
                    <div>
                        <h3 className="font-bold text-sm">Canlı Destek</h3>
                        <p className="text-[10px] text-white/70 font-medium">Çevrimiçi • Ortalama yanıt 1dk</p>
                    </div>
                </div>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full transition-all">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
            </div>

            {/* Messages Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 bg-gray-50/50 space-y-4 no-scrollbar">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-4 rounded-2xl text-sm font-medium shadow-sm transition-all ${msg.sender === 'user' ? 'bg-primary text-white rounded-tr-none' : 'bg-white text-text rounded-tl-none'}`}>
                            {msg.text}
                            <p className={`text-[9px] mt-1 opacity-50 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>{msg.time}</p>
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
                            <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                            <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-100 flex items-center gap-2">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Mesajınızı yazın..."
                    className="flex-1 bg-gray-50 border-none rounded-xl py-3 px-4 text-sm font-bold focus:ring-0 outline-none"
                />
                <button type="submit" className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 active:scale-90 transition-all hover:bg-primary-dark">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="rotate-45 ml-[-2px] mt-[-2px]"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                </button>
            </form>
        </div>
    );
}
