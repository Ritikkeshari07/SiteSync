import type { Command, Project } from './coordination';
export type Identity={id:string;email:string;name:string};
export type TeamRow={id:string;owner:string;owner_email:string;name:string;state:string;version:number;created_at:string};
export type Member={id:string;team_id:string;email:string;actor:string};
export class AccessError extends Error {status:number;constructor(message='You do not have access to this project.',status=403){super(message);this.status=status;}}
export function memberActor(identity:Identity,team:Pick<TeamRow,'owner'>,members:Member[]){
 if(team.owner===identity.id)return 'pm';
 const member=members.find(m=>m.email===identity.email.toLowerCase());
 if(!member||member.actor==='pm')throw new AccessError();return member.actor;
}
export function authenticatedCommand(command:Command,actor:string,project:Project):Command{
 if(command.actor!==actor)throw new AccessError('Your account cannot act as another stakeholder.');
 if(!project.people.some(p=>p.id===actor))throw new AccessError('Your assigned stakeholder no longer exists.');
 return {...command,actor};
}
export function validateMember(identity:Identity,team:Pick<TeamRow,'owner'|'owner_email'>,project:Project,email:string,actor:string){
 if(team.owner!==identity.id)throw new AccessError('Only the workspace owner can manage members.');
 if(actor==='pm'||email.toLowerCase()===team.owner_email.toLowerCase())throw new AccessError('The workspace owner retains the project manager role.',400);
 if(!project.people.some(p=>p.id===actor))throw new AccessError('Choose an existing stakeholder.',400);
}
