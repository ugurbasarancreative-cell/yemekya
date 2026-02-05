'use client';

import { useState, useEffect } from 'react';
import DataStore from '@/lib/dataStore';
import type { Restaurant } from '@/lib/dataStore';

export default function RestaurantsDataExample() {
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

    useEffect(() => {
        // İlk yükleme
        loadRestaurants();

        // Gerçek zamanlı senkronizasyon
        const handleStorageChange = () => {
            loadRestaurants();
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const loadRestaurants = async () => {
        const dataStore = DataStore.getInstance();
        const loaded = await dataStore.getRestaurants();
        setRestaurants(loaded);
    };

    const updateRestaurantStatus = async (id: string, status: 'open' | 'busy' | 'closed') => {
        const dataStore = DataStore.getInstance();
        await dataStore.updateRestaurant(id, { status });
        loadRestaurants(); // Yeniden yükle
    };

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-6">Restoranlar (DataStore Entegre)</h1>

            <div className="grid gap-4">
                {restaurants.map((restaurant) => (
                    <div key={restaurant.id} className="bg-white p-6 rounded-lg shadow">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-bold">{restaurant.name}</h2>
                                <p className="text-gray-600">{restaurant.address}</p>
                                <p className="text-sm text-gray-500">{restaurant.phone}</p>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => updateRestaurantStatus(restaurant.id, 'open')}
                                    className={`px-3 py-1 rounded ${restaurant.status === 'open'
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gray-200'
                                        }`}
                                >
                                    Açık
                                </button>
                                <button
                                    onClick={() => updateRestaurantStatus(restaurant.id, 'busy')}
                                    className={`px-3 py-1 rounded ${restaurant.status === 'busy'
                                        ? 'bg-yellow-500 text-white'
                                        : 'bg-gray-200'
                                        }`}
                                >
                                    Yoğun
                                </button>
                                <button
                                    onClick={() => updateRestaurantStatus(restaurant.id, 'closed')}
                                    className={`px-3 py-1 rounded ${restaurant.status === 'closed'
                                        ? 'bg-red-500 text-white'
                                        : 'bg-gray-200'
                                        }`}
                                >
                                    Kapalı
                                </button>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                            <div>
                                <span className="text-gray-500">Toplam Sipariş:</span>
                                <span className="font-bold ml-2">{restaurant.totalOrders || 0}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Ciro:</span>
                                <span className="font-bold ml-2">{restaurant.revenue || 0} TL</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Puan:</span>
                                <span className="font-bold ml-2">⭐ {restaurant.rating}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
