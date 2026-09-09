import {identity,sameOrigin} from '../identity';
import {getTeam,saveTeam} from '@/db/teams';
import {authenticatedCommand,AccessError} from '@/lib/access';
import { z } from 'zod';
import { readProject, saveProject } from '@/db/store';
import {guestSession} from '@/lib/guest';
import { applyCommand } from '@/lib/coordination';
export const dynamic='force-dynamic';
const command=z.object({type:z.string().max(40),actor:z.string().max(80),id:z.string().max(100).optional(),title:z.string().max(140).optional(),description:z.string().max(3000).optional(),root:z.string().max(80).optional(),note:z.string().max(1000).optional(),owner:z.string().max(80).optional(),status:z.enum(['todo','doing','done']).optional(),due:z.string().max(20).optional(),dependsOn:z.array(z.string().max(80)).max(100).optional(),name:z.string().max(100).optional(),role:z.string().max(100).optional(),responsibility:z.string().max(300).optional()});
function errorResponse(e:unknown){if(e instanceof AccessError)return Response.json({error:e.message},{status:e.status});console.error('Project operation failed',e);return Response.json({error:'Project storage is unavailable. Your input is preserved; please retry.'},{status:503});}
export async function GET(req:Request){const user=await identity();try{const id=new URL(req.url).searchParams.get('team');if(id){if(!user)return Response.json({error:'Sign in to access team projects.'},{status:401});const t=await getTeam(user,id);return Response.json({project:t.project,version:t.row.version,workspace:{id,name:t.row.name,mode:'team',actor:t.actor,isOwner:t.row.owner===user.id,members:t.row.owner===user.id?t.members:[],ownerEmail:t.row.owner===user.id?t.row.owner_email:undefined}},{headers:{'Cache-Control':'no-store'}});}const guest=user?null:await guestSession(req,true,process.env.NODE_ENV!=='development');const responseHeaders:Record<string,string>={'Cache-Control':'no-store'};if(guest?.cookie)responseHeaders['Set-Cookie']=guest.cookie;return Response.json({...await readProject(user?.id||guest!.owner),workspace:{id:'demo',name:'Maple Residence',mode:'demo',actor:null,isOwner:true,members:[]}},{headers:responseHeaders});}catch(e){return errorResponse(e);}}
export async function POST(req:Request){const user=await identity();if(!sameOrigin(req))return Response.json({error:'Invalid origin.'},{status:403});try{
 const parsed=z.object({version:z.number().int().nonnegative(),command,team:z.string().uuid().optional()}).safeParse(await req.json());if(!parsed.success)return Response.json({error:'Invalid request fields.'},{status:400});const body=parsed.data;
 if(body.team&&!user)return Response.json({error:'Sign in to access team projects.'},{status:401});const guest=user?null:await guestSession(req,false,process.env.NODE_ENV!=='development');if(!user&&!guest)return Response.json({error:'Refresh to start your private demo session. Cookies must be enabled.'},{status:401});const demoOwner=user?.id||guest!.owner;const team=body.team&&user?await getTeam(user,body.team):null;const current=team?{project:team.project,version:team.row.version}:await readProject(demoOwner);
 if(body.version!==current.version)return Response.json({error:'Project changed in another tab or by another member. Refresh before retrying.'},{status:409});
 const cmd=team?authenticatedCommand(body.command,team.actor,current.project):body.command;
 let project;try{project=applyCommand(current.project,cmd);}catch(e){return Response.json({error:e instanceof Error?e.message:'Action could not be completed.'},{status:400});}
 const saved=team?await saveTeam(user!,team.row.id,team.actor,project,current.version):await saveProject(demoOwner,project,current.version);
 if(!saved)return Response.json({error:'Project or membership changed. Refresh before retrying.'},{status:409});return Response.json({project,version:current.version+1});
 }catch(e){return errorResponse(e);}}
