import type { DiscoverySettings } from './types';
export const EXTENSIONS = ['png','jpg','jpeg','webp','svg','gif','avif','md','markdown','mp4','webm','html','htm'];
export const DEFAULT_SETTINGS: DiscoverySettings = { includedFolders: [], excludedFolders: [], maxSizeMB: 32, extensions: EXTENSIONS, includeIgnored: false, includeUnavailable: false };
export const EXCLUDED = new Set(['node_modules','.git','.cache','.next','.nuxt','.turbo','.parcel-cache','.venv','venv','vendor','coverage','__pycache__','.DS_Store']);
export const MAX_ASSETS = 20000;
export const MAX_SCAN_ENTRIES = 100000;
export const CHUNK_SIZE = 128 * 1024;
