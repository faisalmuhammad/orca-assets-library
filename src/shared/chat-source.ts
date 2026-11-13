import { createHash } from 'node:crypto';
import path from 'node:path';
// Optional Orca compatibility convention, verified against the installed host:
// chat-scratch/<first 32 hex characters of SHA-256(sessionId)>.
export function chatDirectory(dataDirectory:string,sessionId:string):string {
  if(!/^[A-Za-z0-9_-]{1,200}$/.test(sessionId))throw new Error('Invalid chat session identity');
  return path.join(dataDirectory,'chat-scratch',createHash('sha256').update(sessionId,'utf8').digest('hex').slice(0,32));
}
