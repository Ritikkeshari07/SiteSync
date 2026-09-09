export type Person={id:string;name:string;role:string;initials:string;responsibility:string};
export type Task={id:string;title:string;owner:string;due:string;status:'todo'|'doing'|'done';dependsOn:string[];kind:'design'|'approval'|'procurement'|'site'};
export type Impact={taskId:string;path:string[];direct:boolean};
export type Change={id:string;title:string;description:string;root:string;requester:string;createdAt:string;status:'requested'|'reviewing'|'resolved'|'rejected';impacts:Impact[];labels?:Record<string,string>;owners?:Record<string,string>;note?:string};
export type Action={id:string;changeId:string;taskId:string;owner:string;done:boolean;note?:string;completedAt?:string;completedBy?:string};
export type Event={id:string;at:string;actor:string;text:string};
export type Notice={id:string;owner:string;text:string;read:boolean};
export type Project={people:Person[];tasks:Task[];changes:Change[];actions:Action[];history:Event[];notices:Notice[]};
export const people:Person[]=[
{id:'pm',name:'Ritik Keshari',role:'Project manager',initials:'RK',responsibility:'Coordinate work, confirm actions and manage delivery.'},
{id:'client',name:'Ananya Sharma',role:'Client',initials:'AS',responsibility:'Request changes and approve revised design decisions.'},
{id:'architect',name:'Rohan Mehta',role:'Architect',initials:'RM',responsibility:'Own layouts, specifications and design revisions.'},
{id:'plumber',name:'Amit Verma',role:'Plumbing contractor',initials:'AV',responsibility:'Review plumbing implications and execute site work.'},
{id:'vendor',name:'Neha Kapoor',role:'Material vendor',initials:'NK',responsibility:'Confirm quantities, procurement and material delivery.'}];
export function initialProject():Project{return {people:structuredClone(people),tasks:[
{id:'T01',title:'Bathroom layout',owner:'architect',due:'2026-09-08',status:'done',dependsOn:[],kind:'design'},
{id:'T02',title:'Plumbing drawings',owner:'plumber',due:'2026-09-09',status:'done',dependsOn:['T01'],kind:'design'},
{id:'T03',title:'Tile quantities',owner:'architect',due:'2026-09-09',status:'done',dependsOn:['T01'],kind:'design'},
{id:'T04',title:'Material order',owner:'vendor',due:'2026-09-10',status:'todo',dependsOn:['T03'],kind:'procurement'},
{id:'T05',title:'Plumbing installation',owner:'plumber',due:'2026-09-12',status:'todo',dependsOn:['T02'],kind:'site'},
{id:'T06',title:'Tile delivery',owner:'vendor',due:'2026-09-12',status:'todo',dependsOn:['T04'],kind:'procurement'},
{id:'T07',title:'Bathroom finishes',owner:'architect',due:'2026-09-14',status:'todo',dependsOn:['T05','T06'],kind:'site'},
{id:'T08',title:'Bathroom handover',owner:'pm',due:'2026-09-15',status:'todo',dependsOn:['T07'],kind:'site'},
{id:'T09',title:'Kitchen layout',owner:'architect',due:'2026-09-09',status:'done',dependsOn:[],kind:'design'},
{id:'T10',title:'Kitchen material order',owner:'vendor',due:'2026-09-11',status:'doing',dependsOn:['T09'],kind:'procurement'},
{id:'T11',title:'Living room lighting',owner:'architect',due:'2026-09-11',status:'doing',dependsOn:[],kind:'design'},
{id:'T12',title:'Site safety inspection',owner:'pm',due:'2026-09-10',status:'todo',dependsOn:[],kind:'site'}],changes:[],actions:[],history:[{id:'initial',at:'2026-09-08T09:00:00Z',actor:'pm',text:'Created the Maple Residence renovation project with 12 tasks and 5 stakeholders.'}],notices:[]};}
export function impactOf(tasks:Task[],root:string):Impact[]{
 if(!tasks.some(t=>t.id===root))throw Error('Select an existing deliverable.');
 const seen=new Set([root]); const queue:string[][]=[[root]];const result:Impact[]=[];
 while(queue.length){const path=queue.shift()!;for(const t of tasks.filter(t=>t.dependsOn.includes(path.at(-1)!))){if(seen.has(t.id))continue;seen.add(t.id);const next=[...path,t.id];result.push({taskId:t.id,path:next,direct:path.length===1});queue.push(next);}}
 return result;
}
export function validateDependencies(tasks:Task[]):void {
 const lookup=new Map(tasks.map(t=>[t.id,t]));const finished=new Set<string>();const stack:string[]=[];
 function visit(id:string){if(stack.includes(id)){const cycle=[...stack.slice(stack.indexOf(id)),id].map(key=>lookup.get(key)?.title||key).join(' → ');throw Error('Circular dependency: '+cycle);}
 if(finished.has(id))return;const task=lookup.get(id);if(!task)throw Error('A prerequisite no longer exists.');stack.push(id);for(const parent of task.dependsOn)visit(parent);stack.pop();finished.add(id);}
 for(const task of tasks)visit(task.id);
}
export function validDate(value:string|undefined):value is string{return !!value&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
export function blockers(p:Project,t:Task):string[]{
 const held=(id:string)=>p.changes.some(c=>c.status==='reviewing'&&(c.root===id||c.impacts.some(i=>i.taskId===id)));
 function ready(id:string,seen:Set<string>):boolean{if(seen.has(id))return false;const x=p.tasks.find(x=>x.id===id);if(!x||x.status!=='done'||held(id))return false;const next=new Set(seen);next.add(id);return x.dependsOn.every(parent=>ready(parent,next));}
 return [...t.dependsOn.filter(id=>!ready(id,new Set([t.id]))).map(id=>'Waiting for '+(p.tasks.find(x=>x.id===id)?.title||'missing prerequisite')),
 ...p.changes.filter(c=>c.status==='reviewing'&&(c.root===t.id||c.impacts.some(i=>i.taskId===t.id))).map(c=>'Change review: '+c.title)];
}
export function taskState(p:Project,t:Task){return blockers(p,t).length?'Blocked':t.status==='done'?'Complete':t.status==='doing'?'In progress':'To do';}
export type Command={type:string;actor:string;id?:string;title?:string;description?:string;root?:string;note?:string;owner?:string;status?:Task['status'];due?:string;dependsOn?:string[];name?:string;role?:string;responsibility?:string};
export function applyCommand(current:Project,c:Command):Project{
 const p=structuredClone(current);const actor=p.people.find(x=>x.id===c.actor);if(!actor)throw Error('Choose a valid project stakeholder.');
 const uid=()=>crypto.randomUUID();const at=new Date().toISOString();
 const log=(text:string)=>p.history.unshift({id:uid(),at,actor:c.actor,text});
 const notify=(owner:string,text:string)=>p.notices.unshift({id:uid(),owner,text,read:false});
 const pm=()=>{if(c.actor!=='pm')throw Error('Only the project manager can perform this action.');};
 if(c.type==='createChange'){
 const title=c.title?.trim(); if(!title||title.length>140||!c.description?.trim())throw Error('Add a title and description.');
 if(p.changes.some(x=>x.root===c.root&&['requested','reviewing'].includes(x.status)))throw Error('This deliverable already has an open change. Resolve it before adding another.');
 const impacts=impactOf(p.tasks,c.root!);const change:Change={id:uid(),title,description:c.description.trim(),root:c.root!,requester:c.actor,createdAt:at,status:'requested',impacts,labels:Object.fromEntries(p.tasks.map(t=>[t.id,t.title])),owners:Object.fromEntries(p.tasks.map(t=>[t.id,t.owner]))};p.changes.unshift(change);log('Requested change: '+title);notify('pm','New change needs review: '+title);
 }else if(c.type==='confirm'){
 pm();const change=p.changes.find(x=>x.id===c.id);if(!change)throw Error('Change not found.');if(change.status==='reviewing')return p;if(change.status!=='requested')throw Error('This change is no longer awaiting review.');
 change.impacts=impactOf(p.tasks,change.root);change.status='reviewing';
 for(const id of [change.root,...change.impacts.map(i=>i.taskId)]){const task=p.tasks.find(t=>t.id===id)!;if(!p.actions.some(a=>a.changeId===change.id&&a.taskId===id))p.actions.push({id:change.id+':'+id,changeId:change.id,taskId:id,owner:task.owner,done:false});}
 for(const owner of new Set(p.actions.filter(a=>a.changeId===change.id).map(a=>a.owner)))notify(owner,'Review your affected work: '+change.title);
 log('Confirmed impact review and assigned actions: '+change.title);
 }else if(c.type==='completeAction'){
 const a=p.actions.find(x=>x.id===c.id);if(!a)throw Error('Action not found.');if(a.owner!==c.actor)throw Error('Only the assigned stakeholder can complete this review.');const ch=p.changes.find(x=>x.id===a.changeId)!;if(ch.status!=='reviewing')throw Error('Change is not in review.');if(a.done)return p;if(!c.note?.trim()||c.note.trim().length<10||c.note.length>1000)throw Error('Add a review note of 10–1000 characters describing what was checked or revised.');a.done=true;a.note=c.note.trim();a.completedAt=at;a.completedBy=c.actor;log('Reviewed '+p.tasks.find(t=>t.id===a.taskId)?.title+' for '+ch.title+' — '+a.note);if(p.actions.filter(x=>x.changeId===ch.id).every(x=>x.done))notify('client','Ready for your approval: '+ch.title);
 }else if(c.type==='approve'||c.type==='reject'){
 const ch=p.changes.find(x=>x.id===c.id);if(!ch)throw Error('Change not found.');if(c.type==='approve'){
 if(c.actor!=='client')throw Error('Only the client can approve this design change.');if(ch.status!=='reviewing'||!p.actions.filter(a=>a.changeId===ch.id).every(a=>a.done))throw Error('Complete all stakeholder reviews before approval.');ch.status='resolved';
 }else{if(c.actor!=='client'&&c.actor!=='pm')throw Error('Only the client or project manager can reject changes.');if(!['requested','reviewing'].includes(ch.status))throw Error('This change is already closed.');if(!c.note?.trim())throw Error('Add a reason for rejecting this change.');ch.status='rejected';}
 ch.note=c.note?.trim()||'Revised scope approved after stakeholder review.';log((c.type==='approve'?'Approved and resolved: ':'Rejected: ')+ch.title+' — '+ch.note);
 for(const owner of new Set([p.tasks.find(t=>t.id===ch.root)!.owner,...ch.impacts.map(i=>p.tasks.find(t=>t.id===i.taskId)!.owner)]))notify(owner,`${ch.status==='resolved'?'Approved':'Rejected'}: ${ch.title}. Check task prerequisites before proceeding.`);
 }else if(c.type==='taskStatus'){
 const t=p.tasks.find(x=>x.id===c.id);if(!t)throw Error('Task not found.');if(c.actor!==t.owner&&c.actor!=='pm')throw Error('Only the owner or project manager can update this task.');if(!['todo','doing','done'].includes(c.status!))throw Error('Invalid status.');if(c.status!=='todo'&&blockers(p,t).length)throw Error('Resolve task blockers first.');t.status=c.status!;log(`Updated ${t.title} to ${c.status}.`);
 }else if(c.type==='reassign'){
 pm();const a=p.actions.find(x=>x.id===c.id);if(!a||!p.people.some(x=>x.id===c.owner))throw Error('Invalid action or owner.');if(a.done||p.changes.find(x=>x.id===a.changeId)?.status!=='reviewing')throw Error('Only open reviews can be reassigned.');a.owner=c.owner!;log('Assigned review of '+p.tasks.find(t=>t.id===a.taskId)?.title+' to '+p.people.find(x=>x.id===a.owner)?.name);notify(a.owner,'A review action was assigned to you.');
 }else if(c.type==='editTask'){
 pm();if(p.changes.some(x=>x.status==='requested'||x.status==='reviewing'))throw Error('Resolve open changes before editing the work plan. This keeps reviewed impacts consistent.');
 const t=p.tasks.find(x=>x.id===c.id);if(!t)throw Error('Task not found.');if(!c.title?.trim()||c.title.trim().length>140||!p.people.some(x=>x.id===c.owner))throw Error('Add a task title and valid owner.');if(!validDate(c.due))throw Error('Choose a valid due date.');if(!c.note?.trim())throw Error('Explain why the work plan is changing.');
 const updated:Task={...t,title:c.title.trim(),owner:c.owner!,due:c.due,dependsOn:[...new Set(c.dependsOn||[])]};const candidates=p.tasks.map(x=>x.id===t.id?updated:x);validateDependencies(candidates);
 if(updated.status!=='todo'&&blockers({...p,tasks:candidates},updated).length)throw Error('Reopen this task as To do before adding unfinished prerequisites.');
 // Preserve labels in closed change records before task names are edited.
 for(const change of p.changes){change.labels??=Object.fromEntries(p.tasks.map(x=>[x.id,x.title]));change.owners??=Object.fromEntries(p.tasks.map(x=>[x.id,x.owner]));}
 const before=t;const edits:string[]=[];if(before.title!==updated.title)edits.push('title: '+before.title+' → '+updated.title);if(before.owner!==updated.owner)edits.push('owner: '+p.people.find(x=>x.id===before.owner)?.name+' → '+p.people.find(x=>x.id===updated.owner)?.name);if(before.due!==updated.due)edits.push('due: '+before.due+' → '+updated.due);if([...before.dependsOn].sort().join(',')!==[...updated.dependsOn].sort().join(','))edits.push('prerequisites: '+(before.dependsOn.map(id=>p.tasks.find(x=>x.id===id)?.title).join(', ')||'none')+' → '+(updated.dependsOn.map(id=>p.tasks.find(x=>x.id===id)?.title).join(', ')||'none'));
 if(!edits.length)return p;p.tasks=candidates;log('Updated work plan for '+before.title+' ('+edits.join('; ')+'). Reason: '+c.note.trim());for(const id of new Set([before.owner,updated.owner,...impactOf(p.tasks,updated.id).map(i=>p.tasks.find(x=>x.id===i.taskId)!.owner)]))notify(id,'Work plan updated: '+updated.title+'. Review its ownership, deadline and prerequisites.');
 }else if(c.type==='addTask'){
 pm();if(p.changes.some(x=>x.status==='requested'||x.status==='reviewing'))throw Error('Resolve open changes before extending the dependency plan.');if(!c.title?.trim()||!p.people.some(x=>x.id===c.owner))throw Error('Add a task title and valid owner.');if(!validDate(c.due))throw Error('Choose a valid due date.');if((c.dependsOn||[]).some(id=>!p.tasks.some(t=>t.id===id)))throw Error('Invalid prerequisite.');p.tasks.push({id:uid(),title:c.title.trim(),owner:c.owner!,due:c.due,status:'todo',dependsOn:[...new Set(c.dependsOn||[])],kind:'site'});log('Added task: '+c.title);
 }else if(c.type==='addPerson'){
 pm();if(!c.name?.trim()||!c.role?.trim()||!c.responsibility?.trim())throw Error('Complete all stakeholder fields.');p.people.push({id:uid(),name:c.name.trim(),role:c.role.trim(),responsibility:c.responsibility.trim(),initials:c.name.trim().split(/\s+/).map(s=>s[0]).slice(0,2).join('')});log('Added stakeholder: '+c.name);
 }else if(c.type==='readNotices'){p.notices.filter(n=>n.owner===c.actor).forEach(n=>n.read=true);
 }else throw Error('Unknown action.');
 return p;
}
