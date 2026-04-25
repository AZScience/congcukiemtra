import { collection, addDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type { ActivityLog } from '@/lib/types';

export async function logActivity(
    userId: string,
    action: ActivityLog['action'],
    targetType: string,
    details: string,
    extra?: {
      userEmail?: string;
      ipAddress?: string;
      previousData?: any;
      newData?: any;
    }
) {
  const { firestore } = initializeFirebase();
  if (!firestore || !userId) {
    console.warn("Firestore or User ID not available for logging activity.");
    return;
  }

  try {
    // Try to get IP address if not provided
    let ipAddress = extra?.ipAddress;
    if (!ipAddress && typeof window !== 'undefined') {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        ipAddress = data.ip;
      } catch (e) {
        console.warn("Could not fetch IP address:", e);
      }
    }

    const logData: Omit<ActivityLog, 'id'> = {
      userId,
      userEmail: extra?.userEmail || '',
      ipAddress: ipAddress || '',
      action,
      targetType,
      details,
      timestamp: new Date().toISOString(),
      previousData: extra?.previousData || null,
      newData: extra?.newData || null,
    };
    await addDoc(collection(firestore, 'activity-logs'), logData);
  } catch (error) {
    console.error("Error logging activity:", error);
  }
}
