import {backend,verify,bearer,respond,hubAccess,OWNER} from "../../lib/auth.js";

async function requireOwner(request){
  const token=bearer(request);
  const user=await verify(token);
  return user?.owner ? token : "";
}

export async function GET(request){
  try{
    if(!await requireOwner(request))return respond(403,{message:"Ayarları yalnızca panel sahibi yönetebilir."});
    const result=await hubAccess();
    if(result.status!==200)throw new Error("access list unavailable");
    return respond(200,{users:[{username:OWNER,name:"Panel sahibi",owner:true},...(result.data.users||[])]});
  }catch(err){console.error("hub users list failed",err?.message);return respond(503,{message:"Erişim listesi alınamadı. VDS panel ayarlarını kontrol et."});}
}

export async function POST(request){
  try{
    const token=await requireOwner(request);
    if(!token)return respond(403,{message:"Ayarları yalnızca panel sahibi yönetebilir."});
    if(Number(request.headers.get("content-length")||0)>4096)return respond(413,{message:"İstek çok büyük."});
    const body=await request.json();
    const username=String(body.username||"").trim();
    const password=String(body.password||"");
    const name=String(body.name||"").trim();
    const role=String(body.role||"kasa");
    if(!/^[A-Za-z0-9._-]{3,120}$/.test(username)||username.toLocaleLowerCase("tr-TR")===OWNER)
      return respond(400,{message:"Kullanıcı adı geçersiz veya panel sahibine ait."});
    if(!["admin","kasa","satis","depo","usta"].includes(role))return respond(400,{message:"Rol geçersiz."});
    if(password){
      if(name.length<2||name.length>120||password.length<4||password.length>256)return respond(400,{message:"Ad veya şifre geçersiz."});
      const created=await backend("/users",{
        method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
        body:JSON.stringify({username,name,role,password,is_active:true,allowed_categories:[],permissions:{stockIn:false,stockOut:false,themeSettings:false,addToOrderPool:false}})
      });
      if(created.status!==200&&created.status!==201)return respond(created.status===409?409:400,{message:created.status===409?"Kullanıcı adı zaten kayıtlı.":"Hesap oluşturulamadı. Kullanıcı bilgilerini kontrol et."});
    }else{
      const existing=await backend("/users",{headers:{Authorization:`Bearer ${token}`}});
      if(existing.status!==200)return respond(503,{message:"Mevcut kullanıcılar alınamadı."});
      const found=(existing.data.users||[]).find(u=>String(u.username||"").toLocaleLowerCase("tr-TR")===username.toLocaleLowerCase("tr-TR")&&u.is_active!==false);
      if(!found)return respond(404,{message:"Etkin bir kullanıcı bulunamadı. Yeni hesap için ad ve şifre gir."});
    }
    const grant=await hubAccess("POST",{username,name,role});
    if(grant.status!==200)return respond(503,{message:"Hesap kayıtlı, fakat hub izni kaydedilemedi. Şifresiz olarak yeniden ekle."});
    return respond(200,{message:"Hub erişimi kaydedildi."});
  }catch(err){console.error("hub user create failed",err?.message);return respond(503,{message:"Hesap veya hub erişimi kaydedilemedi."});}
}

export async function DELETE(request){
  try{
    if(!await requireOwner(request))return respond(403,{message:"Ayarları yalnızca panel sahibi yönetebilir."});
    const username=new URL(request.url).searchParams.get("username")||"";
    if(!/^[A-Za-z0-9._-]{3,120}$/.test(username)||username.toLocaleLowerCase("tr-TR")===OWNER)
      return respond(400,{message:"Bu kullanıcının hub izni kaldırılamaz."});
    const revoked=await hubAccess("DELETE",{username});
    if(revoked.status!==200)throw new Error("revoke failed");
    return respond(200,{message:"Hub erişimi kaldırıldı."});
  }catch(err){console.error("hub user revoke failed",err?.message);return respond(503,{message:"Hub erişimi kaldırılamadı."});}
}
