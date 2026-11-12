import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import type { ToolEvent, Workspace } from '../shared/types';
import { defaultOrcaDataDirectory } from './native-workspace-adapter';
import { within } from './workspace-resolver';
const execute=promisify(execFile);
const object=(v:unknown):Record<string,unknown>|null=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:null;
const quote=(v:string)=>"'"+v.replace(/'/g,"''")+"'";
export type HistoryCandidate={file:string;event:ToolEvent};
export type JournalRead=(database:string,sql:string)=>Promise<unknown>;
const read:JournalRead=async(database,sql)=>{
  const {stdout}=await execute('sqlite3',['-readonly','-json',database,sql],{timeout:6000,maxBuffer:2*1024*1024});
  return stdout.trim()?JSON.parse(stdout):[];
};
// Optional journal compatibility adapter, verified against Orca 1.4.257.
// Query only structured diff paths/ownership: no prompts, message text or patches.
// No database mutation, core imports, shell parsing or repository-wide file scan.
export class NativeWorktreeAdapter {
  constructor(private reader:JournalRead=read,private database=path.join(defaultOrcaDataDirectory(),'agent-session-journal.db')){}
  async assets(w:Workspace,aliases:Map<string,string>):Promise<HistoryCandidate[]> {
    if(!w.root||w.reason||(w.hostId!==null&&w.hostId!=='local'))return [];
    const owners=[w.id,...[...aliases].filter(([,id])=>id===w.id).map(([alias])=>alias)];
    const sql=[
      "WITH owners AS (SELECT a.session_id,e.generation,",
      "json_extract(a.record_json,'$.location.workspaceId') AS workspace_id,",
      "json_extract(a.record_json,'$.provider') AS agent",
      "FROM agent_session_records a JOIN journal_outcome_epochs e USING(session_id)",
      "WHERE json_extract(a.record_json,'$.schemaVersion')=2",
      "AND json_extract(a.record_json,'$.location.executionHostId')='local'",
      "AND json_extract(a.record_json,'$.location.workspaceId') IN ("+owners.map(quote).join(',')+")),",
      "latest AS (SELECT o.session_id,o.workspace_id,o.agent,j.value_json,j.deleted,",
      "row_number() OVER(PARTITION BY j.generation,j.entry_key ORDER BY j.seq DESC) AS n",
      "FROM journal_outcomes j JOIN owners o USING(generation) WHERE j.field='items')",
      "SELECT session_id,workspace_id,agent,",
      "json_extract(value_json,'$.body.path') AS path,",
      "json_extract(value_json,'$.observedAt') AS observed_at",
      "FROM latest WHERE n=1 AND deleted=0",
      "AND json_extract(value_json,'$.body.kind')='diff' LIMIT 5001;",
    ].join(' ');
    const rows=await this.reader(this.database,sql);
    if(!Array.isArray(rows))throw new Error('Worktree chat file history is unavailable.');
    if(rows.length>5000)throw new Error('Worktree chat file history exceeds its safe metadata limit.');
    const files=new Map<string,HistoryCandidate>();
    for(const value of rows){
      const r=object(value);if(!r||typeof r.workspace_id!=='string'||!owners.includes(r.workspace_id)||typeof r.session_id!=='string'||!/^[A-Za-z0-9_-]{1,200}$/.test(r.session_id)||typeof r.path!=='string'||r.path.length>2048||r.path.includes('\0'))continue;
      // Native diff metadata uses absolute paths; never guess a base for other values.
      if(!path.isAbsolute(r.path)||!within(w.root,r.path))continue;
      const file=path.resolve(r.path),event:ToolEvent={agent:typeof r.agent==='string'?r.agent:'agent',workspaceId:w.id,tool:'native-file-change',conversationId:r.session_id,orcaTabId:'structured-agent-session-'+r.session_id};
      files.set(file,{file,event});
    }
    return [...files.values()];
  }
}
