import { FirestoreMemoryAdapter as RuntimeFirestoreMemoryAdapter } from './firestore.js';

export interface FirestoreAdapterOptions {
  firestore: FirebaseFirestore.Firestore;
  collection?: string;
}

export const FirestoreMemoryAdapter: {
  new (options: FirestoreAdapterOptions): RuntimeFirestoreMemoryAdapter;
} = RuntimeFirestoreMemoryAdapter as unknown as {
  new (options: FirestoreAdapterOptions): RuntimeFirestoreMemoryAdapter;
};
