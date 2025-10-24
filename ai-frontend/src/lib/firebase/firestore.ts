const firestoreModule = (await import('firebase/firestore')) as typeof import('firebase/firestore');

const {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  writeBatch,
  Timestamp,
} = firestoreModule;

export {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  startAfter,
  Timestamp,
};

export type {
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  QueryConstraint,
  QuerySnapshot,
  FirestoreError,
} from 'firebase/firestore';

export type FirestoreTimestamp = import('firebase/firestore').Timestamp;
