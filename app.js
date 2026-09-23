"use strict";
const KEY = "garage-hub-session-v1";
const loginView = document.getElementById("login-view");
const appsView = document.getElementById("apps-view");
const logout = document.getElementById("logout");
const settingsTab=document.getElementById("settings-tab");
const settingsView=document.getElementById("settings-view");
const workspace=document.getElementById("program-workspace");
let token = sessionStorage.getItem(KEY) || "";
let apps = [];
const frames = new Map();
const showLogin = message => {
  token = ""; sessionStorage.removeItem(KEY);
  frames.clear();document.body.classList.remove("workspace-open");
  workspace.replaceChildren();settingsView.hidden=true;
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
  settingsTab.hidden=!user.owner;
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
  workspace.replaceChildren();
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
  settingsView.hidden=true;workspace.hidden=false;
  settingsTab.classList.remove("selected");
  if(!frames.has(item.id)){
    const iframe=document.createElement("iframe");
    iframe.className="program-frame";iframe.title=item.name;
    iframe.referrerPolicy="strict-origin-when-cross-origin";
    workspace.append(iframe);
    frames.set(item.id,{iframe,origin:url.origin});
    iframe.src=url.href;
  }
  for(const [id,{iframe}] of frames)iframe.hidden=id!==item.id;
  document.querySelectorAll("#apps .app-tab").forEach((button,index)=>{
    const selected=apps[index].id===item.id;
    button.classList.toggle("selected",selected);
    button.setAttribute("aria-current",selected?"page":"false");
  });
  document.getElementById("app-error").textContent="";
}
settingsTab.addEventListener("click",async()=>{
  if(settingsTab.hidden)return;
  workspace.hidden=true;settingsView.hidden=false;
  document.querySelectorAll("#apps .app-tab").forEach(button=>button.classList.remove("selected"));
  settingsTab.classList.add("selected");
  await loadUsers();
});
async function loadUsers(){
  const list=document.getElementById("user-list");
  const message=document.getElementById("settings-message");
  list.replaceChildren();message.textContent="";
  try{
    const result=await request("/api/admin/users");
    for(const user of result.users){
      const row=document.createElement("div");row.className="user-row";
      const label=document.createElement("span");label.textContent=`${user.name||user.username} · ${user.username}${user.owner?" · Sahip":""}`;
      row.append(label);
      if(!user.owner){
        const revoke=document.createElement("button");revoke.type="button";revoke.textContent="Hub iznini kaldır";
        revoke.addEventListener("click",async()=>{
          if(!window.confirm(`${user.username} için hub erişimi kaldırılsın mı?`))return;
          revoke.disabled=true;
          try{await request(`/api/admin/users?username=${encodeURIComponent(user.username)}`,{method:"DELETE"});await loadUsers();}
          catch(err){message.textContent=err.message;revoke.disabled=false;}
        });
        row.append(revoke);
      }
      list.append(row);
    }
  }catch(err){message.textContent=err.message;}
}
document.getElementById("user-form").addEventListener("submit",async event=>{
  event.preventDefault();
  const form=event.currentTarget,button=form.querySelector("button[type=submit]");
  const value=key=>form.elements.namedItem(key).value.trim();
  button.disabled=true;
  try{
    const result=await request("/api/admin/users",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:value("username"),name:value("name"),role:value("role"),password:form.elements.namedItem("password").value})});
    form.reset();await loadUsers();
    document.getElementById("settings-message").textContent=result.message;
  }catch(err){document.getElementById("settings-message").textContent=err.message;}
  finally{button.disabled=false;form.elements.namedItem("password").value="";}
});
const themeSelect=document.getElementById("theme-select");
const themeMedia=window.matchMedia("(prefers-color-scheme: light)");
function applyTheme(){
  const choice=themeSelect.value;
  const light=choice==="light"||(choice==="system"&&themeMedia.matches);
  document.documentElement.dataset.theme=light?"light":"dark";
  document.querySelector('meta[name="theme-color"]').content=light?"#f1f6fa":"#101722";
}
try{themeSelect.value=localStorage.getItem("garage-hub-theme")||"system";}catch{}
applyTheme();
themeSelect.addEventListener("change",()=>{try{localStorage.setItem("garage-hub-theme",themeSelect.value);}catch{}applyTheme();});
themeMedia.addEventListener?.("change",applyTheme);
let deferredInstall;
window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();deferredInstall=event;document.getElementById("install-button").hidden=false;});
document.getElementById("install-button").addEventListener("click",async()=>{
  if(!deferredInstall)return;
  deferredInstall.prompt();await deferredInstall.userChoice;
  deferredInstall=null;document.getElementById("install-button").hidden=true;
});
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));
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
