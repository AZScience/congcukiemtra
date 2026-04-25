
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';

// This is a client-side component that listens for Firestore permission errors
// and throws them, so they can be caught by Next.js's development error overlay.
export function FirebaseErrorListener() {
  useEffect(() => {
    const handleError = (error: Error) => {
      // Throw the error so Next.js can catch it and display the overlay
      // This is for development purposes only.
      if (process.env.NODE_ENV === 'development') {
        // We throw it in a timeout to break out of the current call stack,
        // which prevents React from catching it and suppressing the overlay.
        setTimeout(() => {
          throw error;
        });
      } else {
        // In production, you might want to log this to a service like Sentry,
        // but for now, we'll just log to the console.
        console.error("Firestore Permission Error:", error);
      }
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
        errorEmitter.removeListener('permission-error', handleError);
    }
  }, []);

  return null; // This component doesn't render anything
}
