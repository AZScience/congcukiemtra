'use client';

import { useState, useEffect, useRef } from 'react';
import { onSnapshot, queryEqual, type Query, type CollectionReference } from 'firebase/firestore';

function isQueryEqual(a: Query | CollectionReference | null, b: Query | CollectionReference | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  try {
    return queryEqual(a as Query, b as Query);
  } catch (e) {
    return false;
  }
}
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
  const [isOffline, setIsOffline] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const lastRefPath = useRef<string | null>(null);
  const retryCount = useRef(0);
  const memoizedRef = useRef<Query | CollectionReference | null>(null);

  if (!isQueryEqual(ref, memoizedRef.current)) {
    memoizedRef.current = ref;
  }

  useEffect(() => {
    let isMounted = true;
    const currentRef = memoizedRef.current;

    if (!currentRef) {
      setData([]);
      setLoading(false);
      return;
    }

    const currentPath = (currentRef as any).path || (currentRef as any)._query?.path?.segments?.join('/') || 'unknown';
    
    if (currentPath !== lastRefPath.current) {
      lastRefPath.current = currentPath;
      retryCount.current = 0;
    }
    setLoading(true);

    const unsubscribe = onSnapshot(
      currentRef,
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!isMounted) return;
        retryCount.current = 0;
        setIsOffline(snapshot.metadata.fromCache);
        
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
        setLoading(false);
        
        if (serverError.code === 'permission-denied') {
          const path = (currentRef as any).path || 'collection';
          const permissionError = new FirestorePermissionError({
            path: path,
            operation: 'list',
          } satisfies SecurityRuleContext);
          
          errorEmitter.emit('permission-error', permissionError);
          setError(permissionError);

          if (retryCount.current < MAX_RETRIES) {
            retryCount.current++;
            const delay = Math.min(3000 * retryCount.current, 15000);
            setTimeout(() => {
              if (isMounted) setRetryKey(k => k + 1);
            }, delay);
          }
        } else if (serverError.code === 'resource-exhausted') {
          const now = Date.now();
          if (now - lastQuotaToastTime > QUOTA_TOAST_THROTTLE) {
            toast({
              variant: "destructive",
              title: "Hết hạn mức dữ liệu (Quota Exceeded)",
              description: "Hệ thống đã đạt giới hạn truy vấn miễn phí của Firebase.",
            });
            lastQuotaToastTime = now;
          }
          setError(serverError);
        } else {
          setError(serverError);
        }
      }
    );

    return () => {
      isMounted = false;
      try { unsubscribe(); } catch (e) {}
    };
  }, [memoizedRef.current, retryKey]);

  return { data, loading, error, isOffline };
}
