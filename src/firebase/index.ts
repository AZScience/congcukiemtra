'use client';

export { initializeFirebase } from './init';

// Re-exporting hooks and providers for easy access from other parts of the app.
export * from './provider';
export * from './client-provider';
export * from './auth/use-user';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
