const API = String(process.env.GARAGE_AUTH_BASE || "https://api.scheax.com.tr/migration-test/api").replace(/\/$/, "");
export const OWNER = String(process.env.HUB_OWNER_USERNAME || "SchEAx").trim().toLocaleLowerCase("tr-TR");
const ACCESS_URL = "https://api.scheax.com.tr/ekran1/api/hub/access";
if (!/^https:\/\/api\.scheax\.com\.tr\/(migration-test\/)?api$/.test(API)) throw new Error("GARAGE_AUTH_BASE geçersiz.");

export async function backend(path, options={}) {
  const response = await fetch(API+path,{...options,signal:AbortSignal.timeout(8000)});
  const data = await response.json().catch(()=>({}));
  return {status:response.status,data};
}
export function hubKey(){
  const key=String(process.env.HUB_CONFIG_KEY || "");
  if(key.length<32)throw new Error("HUB_CONFIG_KEY ayarlanmalı.");
  return key;
}
export async function hubAccess(method="GET",body){
  const response=await fetch(ACCESS_URL,{
    method,headers:{"X-Hub-Config-Key":hubKey(),...(body?{"Content-Type":"application/json"}:{})},
    ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(8000),cache:"no-store"
  });
  const data=await response.json().catch(()=>({}));
  return {status:response.status,data};
}
export async function allowed(username){
  const normalized=String(username||"").trim().toLocaleLowerCase("tr-TR");
  if(normalized===OWNER)return true;
  const result=await hubAccess();
  if(result.status!==200)throw new Error("Hub erişim listesine ulaşılamadı.");
  return Array.isArray(result.data.users)&&result.data.users.some(user=>String(user.username||"").toLocaleLowerCase("tr-TR")===normalized);
}
export async function verify(token){
  if(typeof token!=="string" || !token || token.length>4096)return null;
  const result=await backend("/auth/me",{headers:{Authorization:`Bearer ${token}`}});
  const u=result.data?.user;
  if(result.status!==200 || !u || u.is_active===false || !await allowed(u.username))return null;
  return {username:u.username,name:u.name||u.username,owner:String(u.username).toLocaleLowerCase("tr-TR")===OWNER};
}
export function bearer(request){const match=/^Bearer (\S+)$/i.exec(request.headers.get("authorization")||"");return match?.[1]||"";}
export function respond(status,body){return Response.json(body,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});}
