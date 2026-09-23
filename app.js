"use strict";
const KEY = "garage-hub-session-v1";
const loginView = document.getElementById("login-view");
const appsView = document.getElementById("apps-view");
const logout = document.getElementById("logout");
let token = sessionStorage.getItem(KEY) || "";
let apps = [];
const frames = new Map();
const showLogin = message => {
  token = ""; sessionStorage.removeItem(KEY);
  frames.clear();document.body.classList.remove("workspace-open");
  document.getElementById("program-workspace").replaceChildren();
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
  document.getElementById("welcome").textContent = `Hoş geldin, ${user.name}`;
  document.body.classList.add("workspace-open");
  loginView.hidden=true;appsView.hidden=false;logout.hidden=false;
  document.getElementById("app-error").textContent="";
  try{
    const result = await request("/api/apps");
    apps = result.apps;
  }catch(err){
    document.getElementById("app-error").textContent=err.message;
    return;
  }
  const list = document.getElementById("apps");
  list.replaceChildren();
  frames.clear();
  document.getElementById("program-workspace").replaceChildren();
  apps.forEach((item,index)=>{
    const button=document.createElement("button"); button.type="button"; button.className="app-tab";
    button.disabled=!item.configured;
    button.textContent=item.configured?item.name:`${item.name} · Adres ayarlanmadı`;
    button.setAttribute("aria-label",`${index+1}. program: ${item.name}`);
    button.addEventListener("click",()=>openApp(item));list.append(button);
  });
  const first=apps.find(item=>item.configured);
  if(first)openApp(first);
}
function openApp(item){
  if(!item.configured)return;
  const url=new URL(item.url);
  if(url.protocol!=="https:") return;
  const workspace=document.getElementById("program-workspace");
  if(!frames.has(item.id)){
    const iframe=document.createElement("iframe");
    iframe.className="program-frame";iframe.title=item.name;
    iframe.referrerPolicy="strict-origin-when-cross-origin";
    workspace.append(iframe);
    frames.set(item.id,{iframe,origin:url.origin});
    iframe.src=url.href;
  }
  for(const [id,{iframe}] of frames)iframe.hidden=id!==item.id;
  document.querySelectorAll(".app-tab").forEach((button,index)=>{
    const selected=apps[index].id===item.id;
    button.classList.toggle("selected",selected);
    button.setAttribute("aria-current",selected?"page":"false");
  });
  document.getElementById("app-error").textContent="";
}
window.addEventListener("message",event=>{
  if(!token)return;
  const frame=[...frames.values()].find(({iframe,origin})=>event.source===iframe.contentWindow && event.origin===origin);
  if(!frame)return;
  if(event.data?.type!=="garage-hub:ready" || typeof event.data.nonce!=="string" || !/^[a-f0-9]{32}$/.test(event.data.nonce)) return;
  event.source.postMessage({type:"garage-hub:session",nonce:event.data.nonce,token},event.origin);
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
