import {db} from './store';
import {initialProject,type Project} from '../lib/coordination';
import {AccessError,memberActor,validateMember,type Identity,type TeamRow,type Member} from '../lib/access';
export async function listTeams(user:Identity){return (await db().prepare('SELECT DISTINCT t.id,t.name,t.owner,t.version FROM team_projects t LEFT JOIN team_members m ON m.team_id=t.id WHERE t.owner=? OR m.email=? ORDER BY t.created_at DESC').bind(user.id,user.email).all<{id:string;name:string;owner:string;version:number}>()).results.map(t=>({id:t.id,name:t.name,isOwner:t.owner===user.id}));}
export async function getTeam(user:Identity,id:string){
 const row=await db().prepare('SELECT * FROM team_projects WHERE id=?').bind(id).first<TeamRow>();if(!row)throw new AccessError('Project not found or access unavailable.',404);
 const members=(await db().prepare('SELECT * FROM team_members WHERE team_id=?').bind(id).all<Member>()).results;
 const actor=memberActor(user,row,members);return {row,members,actor,project:JSON.parse(row.state) as Project};
}
export async function createTeam(user:Identity,name:string){
 const count=await db().prepare('SELECT COUNT(*) as n FROM team_projects WHERE owner=?').bind(user.id).first<{n:number}>();if((count?.n||0)>=10)throw new AccessError('You can create up to 10 team workspaces in this prototype.',400);
 const id=crypto.randomUUID(),createdAt=new Date().toISOString(),p=initialProject();p.people[0].name=user.name;p.people[0].initials=user.name.split(/\s+/).map(s=>s[0]).slice(0,2).join('');p.history=[{id:crypto.randomUUID(),actor:'pm',at:createdAt,text:'Created team workspace '+name+' from the residential renovation template.'}];
 await db().prepare('INSERT INTO team_projects (id,owner,owner_email,name,state,version,created_at) VALUES (?,?,?,?,?,0,?)').bind(id,user.id,user.email,name,JSON.stringify(p),createdAt).run();return id;
}
// Permission is rechecked in the same write statement as the version comparison.
// A revoked member with an in-flight request cannot write after revocation.
export async function saveTeam(user:Identity,id:string,actor:string,p:Project,version:number){return (await db().prepare('UPDATE team_projects SET state=?,version=version+1 WHERE id=? AND version=? AND (owner=? OR EXISTS (SELECT 1 FROM team_members m WHERE m.team_id=team_projects.id AND m.email=? AND m.actor=?))').bind(JSON.stringify(p),id,version,user.id,user.email,actor).run()).meta.changes===1;}
export async function addMember(user:Identity,id:string,email:string,actor:string,version:number){
 const team=await getTeam(user,id);validateMember(user,team.row,team.project,email,actor);if(team.row.version!==version)throw new AccessError('Workspace changed. Refresh before editing members.',409);
 if(team.members.some(m=>m.email===email||m.actor===actor))throw new AccessError('That account or stakeholder is already assigned. Remove the existing assignment first.',409);
 const mid=crypto.randomUUID();team.project.history.unshift({id:mid,actor:'pm',at:new Date().toISOString(),text:`Assigned ${email} to ${team.project.people.find(p=>p.id===actor)!.role}.`});
 // D1 batch is transactional. A failed optimistic update makes the insert a no-op.
 const results=await db().batch([
 db().prepare('UPDATE team_projects SET state=?,version=version+1 WHERE id=? AND owner=? AND version=?').bind(JSON.stringify(team.project),id,user.id,version),
 db().prepare('INSERT INTO team_members (id,team_id,email,actor) SELECT ?,?,?,? WHERE changes()=1').bind(mid,id,email,actor)
 ]);if(results[0].meta.changes!==1)throw new AccessError('Workspace changed. Refresh and retry.',409);
}
export async function removeMember(user:Identity,id:string,memberId:string,version:number){
 const team=await getTeam(user,id);if(team.row.owner!==user.id)throw new AccessError('Only the workspace owner can manage members.');const member=team.members.find(m=>m.id===memberId);if(!member)throw new AccessError('Membership not found.',404);
 team.project.history.unshift({id:crypto.randomUUID(),actor:'pm',at:new Date().toISOString(),text:`Removed account access for ${member.email}. Stakeholder tasks and history are retained.`});
 const result=await db().batch([
 db().prepare('UPDATE team_projects SET state=?,version=version+1 WHERE id=? AND owner=? AND version=?').bind(JSON.stringify(team.project),id,user.id,version),
 db().prepare('DELETE FROM team_members WHERE id=? AND team_id=? AND changes()=1').bind(memberId,id)
 ]);if(result[0].meta.changes!==1)throw new AccessError('Workspace changed. Refresh and retry.',409);
}
