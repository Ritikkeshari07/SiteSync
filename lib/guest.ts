// Anonymous demos use a random bearer cookie, never a user-chosen project identifier.
export const GUEST_COOKIE='__Host-sitesync-demo';
export async function guestSession(request:Request,create:boolean,secure=true){
 const cookieName=secure?GUEST_COOKIE:'sitesync-demo-preview';
 const match=(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='));
 let token=match?.slice(cookieName.length+1);let fresh=false;
 if(!token||!/^[a-f0-9]{64}$/.test(token)){if(!create)return null;token=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');fresh=true;}
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
 const owner='guest:'+Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
 return {owner,cookie:fresh?`${cookieName}=${token}; Path=/; HttpOnly; ${secure?'Secure; ':''}SameSite=Lax; Max-Age=2592000`:null};
}
