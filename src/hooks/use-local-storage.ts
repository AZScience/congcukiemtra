
"use client";

import { useState, useEffect, Dispatch, SetStateAction, useCallback, useRef } from 'react';

/**
 * Hook useLocalStorage đã được tối ưu để tránh lỗi Hydration Mismatch.
 * Giá trị sẽ được tải từ localStorage sau khi component đã mount trên client.
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    if (typeof window !== 'undefined') {
      try {
        const item = window.localStorage.getItem(key);
        if (item !== null) {
          setStoredValue(JSON.parse(item));
        }
      } catch (error) {
        console.warn(`Error reading localStorage key “${key}”:`, error);
      }
    }
    return () => { isMounted.current = false; };
  }, [key]);

  const setValue: Dispatch<SetStateAction<T>> = useCallback(
    (value) => {
      try {
        setStoredValue((prevValue) => {
          const valueToStore = value instanceof Function ? value(prevValue) : value;
          if (typeof window !== "undefined") {
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
          }
          return valueToStore;
        });
      } catch (error) {
        console.error(`Error setting localStorage key “${key}”:`, error);
      }
    },
    [key]
  );

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue && isMounted.current) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.warn(`Error parsing storage change for key “${key}”:`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key]);

  return [storedValue, setValue];
}
