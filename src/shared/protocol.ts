import type { AssetPage, AssetRecord, DiscoverySettings, LibraryContext, Preview, Query } from './types';
export {};
declare module 'orca' {
  interface PluginRequests {
    'library.context': { output: LibraryContext };
    'library.list': { input: Query; output: AssetPage };
    'library.detail': { input: { id: string }; output: AssetRecord };
    'library.thumbnail': { input: { id: string }; output: Preview };
    'library.cacheThumbnail': { input: { id: string; contentHash: string; data: string }; output: { stored: boolean } };
    'library.preview': { input: { id: string; offset: number; contentHash?: string }; output: Preview };
    'library.documentPreview': { input: { id: string }; output: { text: string } };
    'library.refresh': { output: { ok: boolean } };
    'library.settings': { input: DiscoverySettings; output: DiscoverySettings };
    'library.action': { input: { id: string; action: 'open' | 'explorer' }; output: { ok: boolean; message?: string } };
  }
  interface PluginPanelEvents { 'library.changed': { revision: number }; 'library.contextChanged': { revision: number }; }
}
