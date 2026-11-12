import type { ToolEvent } from '../shared/types';
export type Evidence = { paths: string[]; kind: 'write-input' | 'output'; };
const object = (v: unknown): Record<string,unknown> | null => v && typeof v==='object' && !Array.isArray(v) ? v as Record<string,unknown> : null;
export function failed(output: unknown): boolean {
  const o=object(output); if (!o) return false;
  return o.isError===true || o.success===false || o.ok===false || !!o.error || (typeof o.exit_code==='number' && o.exit_code!==0) || (typeof o.exitCode==='number' && o.exitCode!==0);
}
// Only known writing tools can confirm input paths. No shell/transcript string mining.
export function evidence(event: ToolEvent): Evidence | null {
  if (failed(event.output)) return null;
  const name=event.tool.split(/[.:/]/).at(-1)!.toLowerCase(), input=object(event.input);
  if (['write','write_file','create_file','edit','edit_file','multiedit'].includes(name) && input) {
    const p=input.file_path ?? input.path;
    if(typeof p==='string') return {paths:[p],kind:'write-input'};
  }
  if (name==='apply_patch') {
    const patch=typeof event.input==='string' ? event.input : input?.patch ?? input?.input;
    if(typeof patch==='string') return {paths:[...patch.matchAll(/^\*\*\* (?:Add|Update) File: (.+)$/gm)].map(m=>m[1]),kind:'write-input'};
  }
  const output=object(event.output);
  if (!output || /^(read|read_file|view_image|list|glob|grep|search|stat)$/.test(name)) return null;
  const paths: string[]=[];
  for(const key of ['output_files','generated_files','written_files']) {
    const values=output[key];
    if(Array.isArray(values)) for(const v of values.slice(0,128)) { const p=typeof v==='string' ? v : object(v)?.path; if(typeof p==='string') paths.push(p); }
  }
  return paths.length ? {paths,kind:'output'} : null;
}
export class AgentObserver {
  private panes=new Map<string,{workspaceId:string; at:number}>();
  set(workspaceId:string,pane:string,state:string,at:number) { if(state==='working') this.panes.set(pane,{workspaceId,at}); else this.panes.delete(pane); }
  active(workspaceId:string) { return [...this.panes.values()].some(p=>p.workspaceId===workspaceId); }
  remove(workspaceId:string) { for(const [k,p] of this.panes) if(p.workspaceId===workspaceId) this.panes.delete(k); }
}
