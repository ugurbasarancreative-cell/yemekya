import RestaurantDetailClient from './RestaurantDetailClient';
import DataStore from '@/lib/dataStore';

export async function generateStaticParams() {
    const dataStore = DataStore.getInstance();
    const restaurants = await dataStore.getRestaurants();
    return restaurants.map((res: any) => ({
        id: res.id,
    }));
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
    return <RestaurantDetailClient params={params} />;
}
