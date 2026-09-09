import { env } from 'cloudflare:workers';
import { initialProject, type Project } from '../lib/coordination';
export function db(){if(!env.DB)throw Error('Project storage is unavailable.');return env.DB;}
export async function readProject(owner:string){
 await db().prepare('INSERT OR IGNORE INTO projects (owner,state,version) VALUES (?,?,0)').bind(owner,JSON.stringify(initialProject())).run();
 const row=await db().prepare('SELECT state,version FROM projects WHERE owner=?').bind(owner).first<{state:string;version:number}>();
 if(!row)throw Error('Project could not be loaded.');return {project:JSON.parse(row.state) as Project,version:row.version};
}
export async function saveProject(owner:string,project:Project,version:number){const result=await db().prepare('UPDATE projects SET state=?,version=version+1 WHERE owner=? AND version=?').bind(JSON.stringify(project),owner,version).run();return result.meta.changes===1;}
