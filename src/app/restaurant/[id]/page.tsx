import RestaurantDetailClient from './RestaurantDetailClient';
import DataStore from '@/lib/dataStore';

export async function generateStaticParams() {
    try {
        const dataStore = DataStore.getInstance();
        const restaurants = await dataStore.getRestaurants();
        if (!restaurants || restaurants.length === 0) return [{ id: '1' }];
        return restaurants.map((res: any) => ({
            id: res.id,
        }));
    } catch (e) {
        console.warn("Static generation failed, using fallback");
        return [{ id: '1' }];
    }
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
    return <RestaurantDetailClient params={params} />;
}
