const storageModule = (await import('firebase/storage')) as typeof import('firebase/storage');

const {
  connectStorageEmulator,
  deleteObject,
  getDownloadURL,
  getStorage,
  listAll,
  ref,
  uploadBytes,
  uploadBytesResumable,
  uploadString,
} = storageModule;

export {
  connectStorageEmulator,
  deleteObject,
  getDownloadURL,
  getStorage,
  listAll,
  ref,
  uploadBytes,
  uploadBytesResumable,
  uploadString,
};

export type {
  FullMetadata,
  ListOptions,
  ListResult,
  StorageReference,
  UploadMetadata,
  UploadResult,
} from 'firebase/storage';
