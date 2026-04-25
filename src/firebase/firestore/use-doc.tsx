
'use client';

import { useState, useEffect } from 'react';
import { onSnapshot, type DocumentReference } from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '../errors';
import { toast } from '@/hooks/use-toast';

// Biến toàn cục để tránh spam thông báo quota
let lastQuotaToastTime = 0;
const QUOTA_TOAST_THROTTLE = 60000; // 1 phút

/**
 * Hook to listen to a single Firestore document.
 * Includes safety checks for unmounting and handles permission errors contextually.
 */
export function useDoc<T extends { id: string }>(ref: DocumentReference | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!ref) {
      setData(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      ref,
      (doc) => {
        if (!isMounted) return;
        try {
          if (doc.exists()) {
            const docData = doc.data();
            setData({ ...docData, id: doc.id } as T);
          } else {
            setData(null);
          }
          setError(null);
        } catch (err: any) {
          setError(err);
        } finally {
          setLoading(false);
        }
      },
      async (serverError: any) => {
        if (!isMounted) return;

        if (serverError.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: ref.path,
            operation: 'get',
          } satisfies SecurityRuleContext);
          
          errorEmitter.emit('permission-error', permissionError);
          setError(permissionError);
        } else if (serverError.code === 'resource-exhausted') {
          const now = Date.now();
          if (now - lastQuotaToastTime > QUOTA_TOAST_THROTTLE) {
            toast({
              variant: "destructive",
              title: "Hết hạn mức dữ liệu (Quota Exceeded)",
              description: "Hệ thống đã đạt giới hạn truy vấn miễn phí trong ngày của Firebase. Hạn mức sẽ tự động được reset sau 24h.",
            });
            lastQuotaToastTime = now;
          }
          setError(serverError);
        } else {
          setError(serverError);
        }
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      try {
        unsubscribe();
      } catch (e) {}
    };
  }, [ref]);

  return { data, loading, error };
}
