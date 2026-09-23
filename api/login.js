import {backend,verify,respond,ALLOWED} from "../lib/auth.js";
export async function POST(request){
  try{
    if(Number(request.headers.get("content-length")||0)>4096)return respond(413,{message:"İstek çok büyük."});
    const {username,password}=await request.json();
    if(typeof username!=="string" || typeof password!=="string" || username.length>120 || password.length>256)return respond(400,{message:"Giriş bilgileri geçersiz."});
    if(!ALLOWED.has(username.trim().toLocaleLowerCase("tr-TR")))return respond(401,{message:"Giriş bilgileri veya panel yetkisi geçersiz."});
    const login=await backend("/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,password})});
    const token=login.status===200 ? login.data?.token : "";
    const user=token ? await verify(token) : null;
    if(!user)return respond(401,{message:"Giriş bilgileri veya panel yetkisi geçersiz."});
    return respond(200,{token,user});
  }catch(err){console.error("hub login failed",err?.message);return respond(503,{message:"Giriş servisine ulaşılamadı."});}
}
