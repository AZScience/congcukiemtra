'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { 
    doc, 
    setDoc, 
    serverTimestamp, 
    onSnapshot, 
    collection, 
    query, 
    where, 
    increment,
    getCountFromServer,
    Timestamp
} from 'firebase/firestore';
import { format, startOfWeek, startOfMonth } from 'date-fns';

interface VisitStats {
    online: number;
    today: number;
    weekly: number;
    monthly: number;
}

const VisitContext = createContext<VisitStats | undefined>(undefined);

export function VisitTrackerProvider({ children }: { children: React.ReactNode }) {
    const firestore = useFirestore();
    const { user } = useUser();
    const [stats, setStats] = useState<VisitStats>({ online: 0, today: 0, weekly: 0, monthly: 0 });

    // 1. Mark presence and handle visit count
    useEffect(() => {
        if (!firestore || !user) return;

        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const sessionKey = `v_count_${todayStr}`;
        const lastCounted = localStorage.getItem('last_counted_visit');

        // Update presence every 2 minutes
        const updatePresence = async () => {
            try {
                const presenceRef = doc(firestore, 'online_presence', user.uid);
                await setDoc(presenceRef, {
                    email: user.email,
                    lastSeen: serverTimestamp(),
                }, { merge: true });
            } catch (e) {
                console.warn('VisitTracker: Failed to update presence (Permission Denied)');
            }
        };

        // Increment daily visit count
        const incrementVisit = async () => {
            try {
                if (lastCounted !== todayStr) {
                    const visitRef = doc(firestore, 'visits', todayStr);
                    await setDoc(visitRef, {
                        count: increment(1),
                        date: todayStr
                    }, { merge: true });
                    localStorage.setItem('last_counted_visit', todayStr);
                }
            } catch (e) {
                console.warn('VisitTracker: Failed to increment visit count (Permission Denied)');
            }
        };

        updatePresence();
        incrementVisit();

        const interval = setInterval(updatePresence, 120000); // 2 mins

        return () => clearInterval(interval);
    }, [firestore, user]);

    // 2. Real-time stats listener
    useEffect(() => {
        if (!firestore) return;

        // --- Online Users ---
        // We count users seen in the last 5 minutes
        const fiveMinsAgo = new Date(Date.now() - 5 * 60000);
        const onlineQuery = query(
            collection(firestore, 'online_presence'),
            where('lastSeen', '>=', Timestamp.fromDate(fiveMinsAgo))
        );

        const unsubOnline = onSnapshot(
            onlineQuery, 
            (snapshot) => {
                setStats(prev => ({ ...prev, online: snapshot.size }));
            },
            (error) => {
                console.warn('VisitTracker: Online presence permission denied or index missing. Check Firebase Rules.', error.message);
            }
        );

        // --- Today, Weekly, Monthly ---
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');

        // We'll listen to the recent visits to calculate stats
        // To be efficient, we only listen to docs from the start of the month
        const visitsQuery = query(
            collection(firestore, 'visits'),
            where('date', '>=', monthStart)
        );

        const unsubVisits = onSnapshot(
            visitsQuery, 
            (snapshot) => {
                let today = 0;
                let weekly = 0;
                let monthly = 0;

                snapshot.forEach(doc => {
                    const data = doc.data();
                    const count = data.count || 0;
                    const date = data.date;

                    if (date === todayStr) today = count;
                    if (date >= weekStart) weekly += count;
                    monthly += count;
                });

                setStats(prev => ({ ...prev, today, weekly, monthly }));
            },
            (error) => {
                console.warn('VisitTracker: Visits data permission denied or index missing. Check Firebase Rules.', error.message);
            }
        );

        return () => {
            unsubOnline();
            unsubVisits();
        };
    }, [firestore]);

    return (
        <VisitContext.Provider value={stats}>
            {children}
        </VisitContext.Provider>
    );
}

export function useVisitStats() {
    const context = useContext(VisitContext);
    if (context === undefined) {
        return { online: 0, today: 0, weekly: 0, monthly: 0 };
    }
    return context;
}
