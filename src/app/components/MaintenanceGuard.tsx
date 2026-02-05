'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function MaintenanceGuard({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        const checkMaintenanceAndRole = () => {
            const storedUser = localStorage.getItem('yemekya_user');
            const user = storedUser ? JSON.parse(storedUser) : null;

            // 1. RBAC Guard: Admin and Restaurant users should only access their panels
            if (user && (user.role === 'admin' || user.role === 'restaurant_manager')) {
                const targetPanel = user.role === 'admin' ? '/admin-panel' : '/restaurant-panel';

                // If they are NOT in their panel, redirect them
                if (!pathname?.startsWith(targetPanel)) {
                    // Exception: allow logout or very specific paths if needed, but per request, block everything else
                    router.push(targetPanel);
                    return;
                }
            }

            // 2. Maintenance Guard
            // Admin panel is always accessible for maintenance tasks
            if (pathname?.startsWith('/admin-panel') || pathname === '/login') return;

            const storedMaintenance = localStorage.getItem('YEMEKYA_MAINTENANCE_MODE');
            if (storedMaintenance) {
                const data = JSON.parse(storedMaintenance);
                if (data.active) {
                    const now = new Date().getTime();
                    if (now < data.endTime) {
                        if (pathname !== '/maintenance') {
                            router.push('/maintenance');
                        }
                    } else {
                        // Expired
                        localStorage.removeItem('YEMEKYA_MAINTENANCE_MODE');
                        if (pathname === '/maintenance') {
                            router.push('/');
                        }
                    }
                }
            } else if (pathname === '/maintenance') {
                router.push('/');
            }
        };

        checkMaintenanceAndRole();

        // Listen for storage changes
        window.addEventListener('storage', checkMaintenanceAndRole);
        return () => window.removeEventListener('storage', checkMaintenanceAndRole);
    }, [pathname, router]);

    return <>{children}</>;
}
