'use client';

import { useState, useEffect } from 'react';
import DataStore from '@/lib/dataStore';

import { Order as DSOrder, OrderItem as DSOrderItem } from '@/lib/dataStore';

export default function OrdersPage() {
    const [activeTab, setActiveTab] = useState('New');
    const [orders, setOrders] = useState<DSOrder[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<DSOrder | null>(null);
    const [showOfferModal, setShowOfferModal] = useState<string | null>(null);
    const [selectedOfferItem, setSelectedOfferItem] = useState<string>('');
    const [currentRestaurantId, setCurrentRestaurantId] = useState<string | null>(null);

    const alternatives = [
        { name: 'Big King (Alternatif)', price: 195 },
        { name: 'Steakhouse Burger (Alternatif)', price: 245 },
        { name: 'Tavuklu Wrap (Alternatif)', price: 155 }
    ];

    useEffect(() => {
        // Mevcut restoran kullanıcısını al
        const userStr = localStorage.getItem('yemekya_user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                // Eğer restoran yöneticisi ise ID'yi set et
                if (user.role === 'restaurant_manager' && user.restaurantId) {
                    setCurrentRestaurantId(user.restaurantId);
                }
            } catch (e) {
                console.error("Kullanıcı verisi okunamadı", e);
            }
        }
    }, []);

    useEffect(() => {
        const playNotificationSound = () => {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
            audio.play().catch(e => console.log('Sound play blocked:', e));
        };

        const showBrowserNotification = (order: DSOrder) => {
            if (Notification.permission === 'granted') {
                new Notification('Yeni Sipariş!', {
                    body: `${order.userName} - ${order.total} TL tutarında sipariş verdi.`,
                    icon: '/favicon.ico'
                });
            }
        };

        const syncLiveOrders = async (event?: Event) => {
            const dataStore = DataStore.getInstance();
            const allOrders = await dataStore.getOrders();
            const myOrders = currentRestaurantId
                ? allOrders.filter((o: any) => o.restaurantId === currentRestaurantId)
                : allOrders;

            // Yeni sipariş gelmişse ses çal ve bildirim göster
            if (event?.type === 'new-order' && currentRestaurantId) {
                const latestOrder = myOrders.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())[0];
                if (latestOrder && latestOrder.status === 'Yeni') {
                    playNotificationSound();
                    showBrowserNotification(latestOrder);
                }
            }

            setOrders(myOrders);
        };

        syncLiveOrders();

        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }

        window.addEventListener('storage', syncLiveOrders as any);
        window.addEventListener('restaurant-update', syncLiveOrders as any);
        window.addEventListener('new-order', syncLiveOrders as any);

        return () => {
            window.removeEventListener('storage', syncLiveOrders as any);
            window.removeEventListener('restaurant-update', syncLiveOrders as any);
            window.removeEventListener('new-order', syncLiveOrders as any);
        };
    }, [currentRestaurantId]);

    const handlePrint = (order: DSOrder) => {
        const storedSettings = localStorage.getItem('yemekya_restaurant_settings');
        const settings = storedSettings ? JSON.parse(storedSettings) : { printerType: '80mm' };
        const isSmall = settings.printerType === '58mm';

        const printContent = `
            <html>
                <head>
                    <title>Mutfak Fişi - ${order.id}</title>
                    <style>
                        body { font-family: 'monospace'; width: ${isSmall ? '200px' : '280px'}; padding: 10px; font-size: 13px; line-height: 1.4; color: #000; }
                        .center { text-align: center; }
                        .bold { font-weight: bold; }
                        .divider { border-top: 1px dashed #000; margin: 10px 0; }
                        .item { display: flex; justify-content: space-between; }
                        .total { font-size: 16px; margin-top: 10px; border-top: 2px solid #000; padding-top: 5px; }
                    </style>
                </head>
                <body>
                    <div class="center bold" style="font-size: 18px;">YEMEK YA</div>
                    <div class="center">MUTFAK FİŞİ</div>
                    <div class="divider"></div>
                    <div><b>Sipariş:</b> ${order.id}</div>
                    <div><b>Müşteri:</b> ${order.userName}</div>
                    <div><b>Tarih:</b> ${order.date ? new Date(order.date).toLocaleString('tr-TR') : new Date().toLocaleString('tr-TR')}</div>
                    <div class="divider"></div>
                    ${order.items.map((i: any) => `
                        <div class="item"><span class="bold">${i.quantity}x ${i.name}</span><span>${(i.price * i.quantity).toFixed(2)}</span></div>
                        ${i.note ? `<div style="font-size: 11px; margin-left: 10px;">└ Not: ${i.note}</div>` : ''}
                    `).join('')}
                    <div class="divider"></div>
                    <div class="total bold item"><span>TOPLAM:</span><span>${order.total.toFixed(2)} TL</span></div>
                    <div style="margin-top: 10px; font-size: 11px;"><b>Ödeme:</b> ${order.paymentMethod || 'Kapıda Nakit'}</div>
                    <div style="margin-top: 5px; font-size: 10px;"><b>Adres:</b> ${order.address}</div>
                    <div class="divider"></div>
                    <div class="center" style="font-size: 10px;">Afiyet Olsun!</div>
                    <script>window.onload = () => { window.print(); window.close(); }</script>
                </body>
            </html>
        `;

        const printWin = window.open('', '_blank', 'width=450,height=600');
        printWin?.document.write(printContent);
        printWin?.document.close();
    };

    const updateStatus = async (id: string, nextStatus: DSOrder['status']) => {
        const dataStore = DataStore.getInstance();
        await dataStore.updateOrder(id, { status: nextStatus });

        // Kullanıcının aktif siparişini de güncelle (Sync)
        const activeOrderStr = localStorage.getItem('yemekya_active_order');
        if (activeOrderStr) {
            const activeOrder = JSON.parse(activeOrderStr);
            if (activeOrder.id === id) {
                const updatedActive = { ...activeOrder, status: nextStatus };
                localStorage.setItem('yemekya_active_order', JSON.stringify(updatedActive));
            }
        }

        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('restaurant-update'));

        if (selectedOrder?.id === id) setSelectedOrder({ ...selectedOrder, status: nextStatus });
    };


    const filteredOrders = orders.filter(o => {
        if (activeTab === 'New') return o.status === 'Yeni' || o.status === 'Teklif Gönderildi';
        if (activeTab === 'Preparing') return o.status === 'Hazırlanıyor';
        if (activeTab === 'Ready') return o.status === 'Hazır';
        if (activeTab === 'Way') return o.status === 'Yolda';
        if (activeTab === 'History') return o.status === 'Teslim Edildi' || o.status === 'İptal Edildi';
        return false;
    });

    return (
        <div className="space-y-8 animate-fadeIn pb-12">

            {/* TABS */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex bg-surface p-1.5 rounded-[2rem] border border-border shadow-premium w-fit overflow-x-auto no-scrollbar">
                    {['New', 'Preparing', 'Ready', 'Way', 'History'].map((t) => (
                        <button key={t} onClick={() => setActiveTab(t)} className={`px-8 py-3.5 rounded-[1.5rem] text-xs font-black transition-all ${activeTab === t ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-light hover:text-text'}`}>
                            {t === 'New' ? 'Yeni' : t === 'Preparing' ? 'Hazırlanıyor' : t === 'Ready' ? 'Hazır' : t === 'Way' ? 'Yolda' : 'Geçmiş'}
                        </button>
                    ))}
                </div>
            </div>

            {/* ORDERS GRID */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {filteredOrders.map((order) => (
                    <div
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className="bg-surface rounded-[2.5rem] border border-border shadow-premium overflow-hidden flex flex-col group cursor-pointer hover:border-primary/30 transition-all active:scale-[0.98]"
                    >
                        <div className="p-6 border-b border-border flex items-center justify-between bg-background-alt/10">
                            <div className="flex items-center gap-3">
                                <span className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center text-xl">📦</span>
                                <span className="text-xl font-black text-text">{order.id}</span>
                            </div>
                            <span className="text-[10px] font-black text-text-light uppercase tracking-widest">{order.date ? new Date(order.date).toLocaleDateString('tr-TR') : 'Az Önce'}</span>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-black text-text text-xl tracking-tight">{order.userName}</h4>
                                    <p className="text-sm font-bold text-text-light italic">{order.neighborhood || 'Merkez'}</p>
                                </div>
                                <div className={`px-4 py-1.5 rounded-full text-[9px] font-black text-white uppercase tracking-tighter shadow-sm ${order.status === 'Yeni' ? 'bg-blue-500' :
                                    order.status === 'Hazırlanıyor' ? 'bg-amber-500' :
                                        order.status === 'Hazır' ? 'bg-purple-500' :
                                            order.status === 'Yolda' ? 'bg-indigo-500' :
                                                order.status === 'Teslim Edildi' ? 'bg-green-500' : 'bg-red-500'
                                    }`}>
                                    {order.status}
                                </div>
                            </div>

                            <div className="space-y-3 pb-4">
                                {order.items.slice(0, 2).map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm font-bold">
                                        <span className="text-text-light">{item.quantity}x {item.name}</span>
                                        <span className="text-text">{item.price * item.quantity} TL</span>
                                    </div>
                                ))}
                                {order.items.length > 2 && <p className="text-[10px] font-black text-primary uppercase">+{order.items.length - 2} Diğer Ürün</p>}
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-dashed border-border">
                                <span className="text-xs font-black text-text-light uppercase tracking-widest">Toplam Tutar</span>
                                <span className="text-xl font-black text-primary">{order.total.toFixed(2)} TL</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ORDER DETAIL MODAL */}
            {selectedOrder && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 backdrop-blur-xl bg-black/40 animate-fadeIn">
                    <div className="bg-surface w-full max-w-2xl rounded-[3rem] border border-border shadow-2xl overflow-hidden animate-scaleUp max-h-[90vh] flex flex-col">
                        <div className="p-8 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <span className="text-3xl">📦</span>
                                <div>
                                    <h2 className="text-2xl font-black text-text tracking-tighter">Sipariş Detayı</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full border border-primary/20">Sipariş ID: {selectedOrder.id}</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="w-10 h-10 bg-background-alt rounded-2xl flex items-center justify-center text-xl">✕</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
                            {/* Customer & Delivery */}
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <span className="text-[10px] font-black text-text-light uppercase tracking-widest block">Müşteri Bilgileri</span>
                                    <p className="text-lg font-black text-text">{selectedOrder.userName}</p>
                                    <p className="text-sm font-bold text-text-light">{selectedOrder.phone || '05xx xxx xx xx'}</p>
                                </div>
                                <div className="space-y-2">
                                    <span className="text-[10px] font-black text-text-light uppercase tracking-widest block">Teslimat Adresi</span>
                                    <p className="text-[13px] font-bold text-text-light leading-relaxed">{selectedOrder.address}</p>
                                    <p className="text-[10px] font-black text-primary uppercase tracking-tighter">📍 {selectedOrder.neighborhood}</p>
                                </div>
                            </div>

                            {/* Payment */}
                            <div className="bg-background-alt/30 p-6 rounded-[2rem] border border-border flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <span className="text-2xl">💳</span>
                                    <div>
                                        <span className="text-[10px] font-black text-text-light uppercase tracking-widest block">Ödeme Yöntemi</span>
                                        <span className="text-sm font-extrabold text-text">{selectedOrder.paymentMethod || 'Kapıda Nakit'}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-black text-text-light uppercase tracking-widest block">Toplam Kazanılacak</span>
                                    <span className="text-2xl font-black text-primary">{selectedOrder.total.toFixed(2)} TL</span>
                                </div>
                            </div>

                            {/* Order Items */}
                            <div className="space-y-4">
                                <span className="text-[10px] font-black text-text-light uppercase tracking-widest block">Sipariş İçeriği</span>
                                <div className="space-y-2">
                                    {selectedOrder.items.map((item, i) => (
                                        <div key={i} className="p-4 bg-surface border border-border rounded-2xl flex justify-between items-center group hover:border-primary/30 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <span className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center font-black text-sm">{item.quantity}</span>
                                                <div>
                                                    <p className="text-sm font-bold text-text">{item.name}</p>
                                                    {item.note && <p className="text-[10px] font-bold text-amber-500 italic">" {item.note} "</p>}
                                                </div>
                                            </div>
                                            <span className="text-sm font-black text-text">{(item.price * item.quantity).toFixed(2)} TL</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-8 border-t border-border bg-background-alt/10 flex gap-4">
                            <button onClick={() => handlePrint(selectedOrder)} className="w-16 h-16 bg-surface border border-border rounded-2xl flex items-center justify-center text-2xl hover:bg-background-alt transition-all shadow-sm">🖨️</button>

                            {selectedOrder.status === 'Yeni' && (
                                <button onClick={() => updateStatus(selectedOrder.id, 'Hazırlanıyor')} className="flex-1 bg-primary text-white font-black rounded-2xl text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">Siparişi Onayla</button>
                            )}
                            {selectedOrder.status === 'Hazırlanıyor' && (
                                <button onClick={() => updateStatus(selectedOrder.id, 'Hazır')} className="flex-1 bg-purple-500 text-white font-black rounded-2xl text-sm uppercase tracking-widest shadow-xl shadow-purple-500/20 hover:scale-[1.02] transition-all">Mutfakta Hazır</button>
                            )}
                            {selectedOrder.status === 'Hazır' && (
                                <button onClick={() => updateStatus(selectedOrder.id, 'Yolda')} className="flex-1 bg-indigo-500 text-white font-black rounded-2xl text-sm uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:scale-[1.02] transition-all">Kuryeye Teslim Et</button>
                            )}
                            {selectedOrder.status === 'Yolda' && (
                                <button onClick={() => updateStatus(selectedOrder.id, 'Teslim Edildi')} className="flex-1 bg-green-500 text-white font-black rounded-2xl text-sm uppercase tracking-widest shadow-xl shadow-green-500/20 hover:scale-[1.02] transition-all">Teslim Edildi İşaretle</button>
                            )}

                            {selectedOrder.status === 'Yeni' ? (
                                <button onClick={() => setShowOfferModal(selectedOrder.id)} className="px-6 bg-amber-500/10 text-amber-600 font-black rounded-2xl text-[10px] uppercase tracking-widest border border-amber-500/20">Teklif Gönder</button>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}

            {/* OFFER MODAL */}
            {showOfferModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 backdrop-blur-md bg-black/60">
                    <div className="bg-surface w-full max-w-md rounded-[3rem] p-10 border border-border shadow-2xl animate-scaleUp">
                        <h2 className="text-2xl font-black text-text tracking-tighter mb-4 text-center">Alternatif Öner</h2>
                        <div className="space-y-3 mb-8">
                            {alternatives.map((alt, i) => (
                                <button key={i} onClick={() => setSelectedOfferItem(alt.name)} className={`w-full p-4 rounded-2xl border-2 text-left font-bold transition-all ${selectedOfferItem === alt.name ? 'border-primary bg-primary/5' : 'border-background-alt hover:border-border'}`}>
                                    <div className="flex justify-between items-center">
                                        <span>{alt.name}</span>
                                        <span className="text-primary">{alt.price} TL</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setShowOfferModal(null)} className="flex-1 py-4 bg-background-alt font-black rounded-2xl text-[10px] uppercase">Geri</button>
                            <button onClick={() => { updateStatus(showOfferModal, 'Teklif Gönderildi'); setShowOfferModal(null); }} className="flex-1 py-4 bg-primary text-white font-black rounded-2xl text-[10px] uppercase shadow-lg">Gönder</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
