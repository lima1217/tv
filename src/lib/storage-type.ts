export type StorageType = 'localstorage' | 'upstash';

const storageTypes = new Set<StorageType>([
  'localstorage',
  'upstash',
]);

function isStorageType(value: string | undefined): value is StorageType {
  return !!value && storageTypes.has(value as StorageType);
}

export function getStorageType(): StorageType {
  const configured = process.env.NEXT_PUBLIC_STORAGE_TYPE;
  if (isStorageType(configured)) {
    return configured;
  }

  if (process.env.UPSTASH_URL && process.env.UPSTASH_TOKEN) {
    return 'upstash';
  }

  return 'localstorage';
}

export function isDatabaseStorage(): boolean {
  return getStorageType() !== 'localstorage';
}
