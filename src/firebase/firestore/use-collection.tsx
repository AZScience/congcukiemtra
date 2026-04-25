'use client';

import { useState, useEffect, useRef } from 'react';
import { onSnapshot, type Query, type CollectionReference } from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '../errors';
import { toast } from '@/hooks/use-toast';

let lastQuotaToastTime = 0;
const QUOTA_TOAST_THROTTLE = 60000;
const MAX_RETRIES = 5;

export function useCollection<T extends { id: string }>(ref: Query | CollectionReference | null) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const lastRefPath = useRef<string | null>(null);
  const retryCount = useRef(0);

  useEffect(() => {
    let isMounted = true;

    if (!ref) {
      setData([]);
      setLoading(false);
      return;
    }

    const currentPath = (ref as any).path || (ref as any)._query?.path?.segments?.join('/') || 'unknown';
    
    if (currentPath !== lastRefPath.current) {
      lastRefPath.current = currentPath;
      retryCount.current = 0; // Reset retry count khi đổi collection khác
    }
    setLoading(true);

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        if (!isMounted) return;
        retryCount.current = 0; // Thành công → reset retry
        try {
          const result: T[] = [];
          snapshot.forEach((doc) => {
            const docData = doc.data();
            result.push({ ...docData, id: doc.id } as T);
          });
          setData(result);
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
          const path = (ref as any).path || 'collection';
          const permissionError = new FirestorePermissionError({
            path: path,
            operation: 'list',
          } satisfies SecurityRuleContext);
          
          errorEmitter.emit('permission-error', permissionError);
          setError(permissionError);

          // Auto-retry với exponential backoff — chỉ hoạt động vì retryKey có trong deps
          if (retryCount.current < MAX_RETRIES) {
            retryCount.current++;
            const delay = Math.min(3000 * retryCount.current, 15000);
            setTimeout(() => {
              if (!isMounted) return;
              setRetryKey(k => k + 1); // ← Thay đổi dep → useEffect chạy lại → listener mới
            }, delay);
          }
        } else if (serverError.code === 'resource-exhausted') {
          const now = Date.now();
          if (now - lastQuotaToastTime > QUOTA_TOAST_THROTTLE) {
            toast({
              variant: "destructive",
              title: "Hết hạn mức dữ liệu (Quota Exceeded)",
              description: "Hệ thống đã đạt giới hạn truy vấn miễn phí của Firebase. Hạn mức sẽ được reset sau 24h.",
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
  }, [ref, retryKey]); // retryKey trong deps → setRetryKey() triggers listener mới thực sự

  return { data, loading, error };
}
