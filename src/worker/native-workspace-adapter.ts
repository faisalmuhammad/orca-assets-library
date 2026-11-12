import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { homedir } from 'node:os';
import path from 'node:path';
import type { ProjectAppearance, Workspace } from '../shared/types';
const execute=promisify(execFile);
const object=(v:unknown):Record<string,unknown>|null=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:null;
export function defaultOrcaDataDirectory(){
  const scratch=process.env.ORCA_CHAT_SCRATCH_DIR;
  if(scratch&&/^[a-f0-9]{32}$/.test(path.basename(scratch)))return path.dirname(path.dirname(scratch));
  const config=process.platform==='darwin'?path.join(homedir(),'Library','Application Support'):process.platform==='win32'?(process.env.APPDATA??path.join(homedir(),'AppData','Roaming')):(process.env.XDG_CONFIG_HOME??path.join(homedir(),'.config'));
  return path.join(config,'orca');
}
async function inventory(){
  const cli=process.env.ORCA_CLI_COMMAND||(process.env.ORCA_DEV_REPO_ROOT?'orca-dev':process.platform==='linux'?'orca-ide':'orca');
  const [worktrees,projects]=await Promise.allSettled([
    execute(cli,['worktree','ps','--limit','500','--environment','local','--json'],{timeout:6000,maxBuffer:8*1024*1024}),
    execute(cli,['project','list','--environment','local','--json'],{timeout:6000,maxBuffer:2*1024*1024})
  ]);
  if(worktrees.status==='rejected')throw worktrees.reason;
  const response=JSON.parse(worktrees.value.stdout.slice(worktrees.value.stdout.indexOf('{')));
  // Project appearance is optional; older CLIs can still collect assets.
  if(projects.status==='fulfilled')try{const metadata=JSON.parse(projects.value.stdout.slice(projects.value.stdout.indexOf('{')));if(metadata.ok===true&&Array.isArray(metadata.result?.projects)&&object(response.result))response.result.projects=metadata.result.projects;}catch{}
  return response;
}
function projectAppearances(values:unknown):Map<string,ProjectAppearance|null>{
  const byRepo=new Map<string,ProjectAppearance|null>();if(!Array.isArray(values))return byRepo;
  for(const value of values.slice(0,500)){
    const project=object(value);if(!project||!Array.isArray(project.sourceRepoIds))continue;
    const appearance:ProjectAppearance={},configuredIcon=object(project.repoIcon);
    if(typeof project.badgeColor==='string'&&/^#[a-f0-9]{6}$/i.test(project.badgeColor))appearance.color=project.badgeColor;
    if(configuredIcon?.type==='lucide'&&typeof configuredIcon.name==='string'&&/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(configuredIcon.name))appearance.iconName=configuredIcon.name;
    for(const id of new Set(project.sourceRepoIds.slice(0,32)))if(typeof id==='string'&&id.length<=200)byRepo.set(id,byRepo.has(id)?null:appearance);
  }
  return byRepo;
}
// Public CLI metadata maps native session/workspace identities to SDK roots.
// No chat folders, transcript files, prompts or messages are read or retained.
export class NativeWorkspaceAdapter {
  aliases=new Map<string,string>();activeWorkspaceId?:string;
  activities:{workspaceId:string;paneKey:string;state:string;startedAt:number}[]=[];
  constructor(private readInventory:()=>Promise<unknown>=inventory){}
  async sync(workspaces:Workspace[]){
    this.aliases.clear();this.activities=[];this.activeWorkspaceId=undefined;
    for(const w of workspaces)delete w.projectAppearance;
    const response=object(await this.readInventory()),result=object(response?.result);
    if(response?.ok!==true||!result||!Array.isArray(result.worktrees))throw new Error('Orca CLI workspace inventory is unavailable.');
    const rows=result.worktrees.slice(0,500),paths=new Map<string,number>(),appearances=projectAppearances(result.projects);
    for(const value of rows){const row=object(value);if(row?.hostId==='local'&&typeof row.path==='string')paths.set(row.path,(paths.get(row.path)??0)+1);}
    let active:string|undefined;
    for(const value of rows){
      const row=object(value),address=object(row?.address);
      if(!row||row.hostId!=='local'||address?.environment!=='local'||typeof address.worktree!=='string'||typeof row.path!=='string')continue;
      const matches=workspaces.filter(w=>w.root&&!w.reason&&(w.hostId===null||w.hostId==='local')&&w.path===row.path);
      if(matches.length!==1||paths.get(row.path)!==1)continue;const w=matches[0];
      const appearance=typeof row.repoId==='string'?appearances.get(row.repoId):undefined;if(appearance&&(appearance.color||appearance.iconName))w.projectAppearance={...appearance};
      if(typeof row.worktreeId==='string')this.aliases.set(row.worktreeId,w.id);
      if(row.isActive===true)active=active===undefined?w.id:'';
      if(!Array.isArray(row.agents))continue;
      for(const value of row.agents){
        const agent=object(value);if(!agent||typeof agent.paneKey!=='string'||!/^structured-agent-session-[A-Za-z0-9_-]{1,200}:[A-Za-z0-9-]{1,100}$/.test(agent.paneKey))continue;
        const status=object(agent.mainAgent)??agent;
        if(typeof status.state==='string'&&['working','blocked','waiting','done'].includes(status.state)&&typeof status.stateStartedAt==='number'&&Number.isFinite(status.stateStartedAt))this.activities.push({workspaceId:w.id,paneKey:agent.paneKey,state:status.state,startedAt:status.stateStartedAt});
      }
    }
    this.activeWorkspaceId=active||undefined;
    return result.truncated===true?'Orca CLI truncated workspace inventory; some session mappings may be unavailable.':undefined;
  }
}
