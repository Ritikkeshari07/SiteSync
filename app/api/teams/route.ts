import {z} from 'zod';
import {identity,sameOrigin} from '../identity';
import {listTeams,createTeam,addMember,removeMember} from '@/db/teams';
import {AccessError} from '@/lib/access';
export const dynamic='force-dynamic';
export async function GET(){const user=await identity();if(!user)return Response.json({error:'Sign in first.'},{status:401});try{return Response.json({teams:await listTeams(user)},{headers:{'Cache-Control':'no-store'}});}catch(e){console.error('Teams unavailable',e);return Response.json({error:'Unable to load team workspaces.'},{status:503});}}
const schema=z.discriminatedUnion('type',[
 z.object({type:z.literal('create'),name:z.string().trim().min(3).max(80)}),
 z.object({type:z.literal('add'),id:z.string().uuid(),email:z.string().trim().email().max(254).transform(s=>s.toLowerCase()),actor:z.string().min(1).max(80),version:z.number().int().nonnegative()}),
 z.object({type:z.literal('remove'),id:z.string().uuid(),memberId:z.string().uuid(),version:z.number().int().nonnegative()})
]);
export async function POST(req:Request){const user=await identity();if(!user)return Response.json({error:'Sign in first.'},{status:401});if(!sameOrigin(req))return Response.json({error:'Invalid origin.'},{status:403});try{const parsed=schema.safeParse(await req.json());if(!parsed.success)return Response.json({error:'Check the workspace name, email and stakeholder selection.'},{status:400});const c=parsed.data;let id;if(c.type==='create')id=await createTeam(user,c.name);if(c.type==='add')await addMember(user,c.id,c.email,c.actor,c.version);if(c.type==='remove')await removeMember(user,c.id,c.memberId,c.version);return Response.json({id,teams:await listTeams(user)});}catch(e){if(e instanceof AccessError)return Response.json({error:e.message},{status:e.status});console.error('Team update failed',e);return Response.json({error:'Unable to save workspace membership. Refresh and retry.'},{status:503});}}
