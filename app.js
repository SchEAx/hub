"use strict";
const KEY = "garage-hub-session-v1";
const loginView = document.getElementById("login-view");
const appsView = document.getElementById("apps-view");
const logout = document.getElementById("logout");
let token = sessionStorage.getItem(KEY) || "";
let apps = [];
let pending = null;
const showLogin = message => {
  token = ""; sessionStorage.removeItem(KEY);
  loginView.hidden = false; appsView.hidden = true; logout.hidden = true;
  document.getElementById("login-error").textContent = message || "";
};
async function request(url, options={}) {
  const response = await fetch(url,{cache:"no-store",...options,headers:{...(token?{Authorization:`Bearer ${token}`}:{ }),...(options.headers||{})}});
  const body = await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(body.message || "İşlem tamamlanamadı.");
  return body;
}
async function showApps(user) {
  const result = await request("/api/apps");
  apps = result.apps;
  document.getElementById("welcome").textContent = `Hoş geldin, ${user.name}`;
  const list = document.getElementById("apps");
  list.replaceChildren();
  apps.forEach((item,index)=>{
    const button=document.createElement("button"); button.type="button"; button.className="app-card";
    const number=document.createElement("span"); number.className="number";number.textContent=`0${index+1} / PROGRAM`;
    const title=document.createElement("strong");title.textContent=item.name;
    const action=document.createElement("span");action.className="open";action.textContent="Aç →";
    button.append(number,title,action);
    button.addEventListener("click",()=>openApp(item));list.append(button);
  });
  loginView.hidden=true;appsView.hidden=false;logout.hidden=false;
}
function openApp(item){
  const url=new URL(item.url);
  if(url.protocol!=="https:") return;
  const target=window.open(url.href,"_blank");
  if(!target) {document.getElementById("app-error").textContent="Tarayıcı yeni pencereyi engelledi. Açılır pencerelere izin ver.";return;}
  pending={target,origin:url.origin,expires:Date.now()+30000};
  document.getElementById("app-error").textContent="";
}
window.addEventListener("message",event=>{
  if(!pending || !token || Date.now()>pending.expires || event.source!==pending.target || event.origin!==pending.origin) return;
  if(event.data?.type!=="garage-hub:ready" || typeof event.data.nonce!=="string" || !/^[a-f0-9]{32}$/.test(event.data.nonce)) return;
  pending.target.postMessage({type:"garage-hub:session",nonce:event.data.nonce,token},pending.origin);
  pending=null;
});
document.getElementById("login-form").addEventListener("submit",async event=>{
  event.preventDefault();
  const form=event.currentTarget,button=document.getElementById("login-button");
  button.disabled=true;document.getElementById("login-error").textContent="";
  try{
    const username=form.elements.namedItem("username");
    const password=form.elements.namedItem("password");
    const data=await request("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:username.value.trim(),password:password.value})});
    token=data.token;sessionStorage.setItem(KEY,token);password.value="";
    await showApps(data.user);
  }catch(err){showLogin(err.message);}finally{button.disabled=false;}
});
logout.addEventListener("click",()=>showLogin("Oturum kapatıldı."));
(async()=>{if(!token)return;try{const result=await request("/api/session");await showApps(result.user);}catch{showLogin("");}})();
