import {verify,bearer,respond} from "../lib/auth.js";
export async function GET(request){
  try{const user=await verify(bearer(request));return user?respond(200,{user}):respond(401,{message:"Panel oturumu geçersiz."});}
  catch(err){console.error("hub session failed",err?.message);return respond(503,{message:"Oturum servisine ulaşılamadı."});}
}
