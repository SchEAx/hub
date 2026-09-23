const API = String(process.env.GARAGE_AUTH_BASE || "https://api.scheax.com.tr/migration-test/api").replace(/\/$/, "");
export const ALLOWED = new Set(String(process.env.HUB_USERNAMES || "SchEAx").split(",").map(x => x.trim().toLocaleLowerCase("tr-TR")).filter(Boolean));
if (!/^https:\/\/api\.scheax\.com\.tr\/(migration-test\/)?api$/.test(API)) throw new Error("GARAGE_AUTH_BASE geçersiz.");

export async function backend(path, options={}) {
  const response = await fetch(API+path,{...options,signal:AbortSignal.timeout(8000)});
  const data = await response.json().catch(()=>({}));
  return {status:response.status,data};
}
export async function verify(token){
  if(typeof token!=="string" || !token || token.length>4096)return null;
  const result=await backend("/auth/me",{headers:{Authorization:`Bearer ${token}`}});
  const u=result.data?.user;
  if(result.status!==200 || !u || u.is_active===false || !ALLOWED.has(String(u.username||"").toLocaleLowerCase("tr-TR")))return null;
  return {username:u.username,name:u.name||u.username};
}
export function bearer(request){const match=/^Bearer (\S+)$/i.exec(request.headers.get("authorization")||"");return match?.[1]||"";}
export function respond(status,body){return Response.json(body,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});}
