'use client';

import { ReactNode } from 'react';
import { initializeFirebase } from './init';
import { FirebaseProvider } from './provider';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

// It's a bit of a hack to ensure firebase is initialized only once.
let firebase: any;

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  if (!firebase) {
    firebase = initializeFirebase();
  }
  return <FirebaseProvider value={firebase}>{children}</FirebaseProvider>;
}
