import {verify,bearer,respond} from "../lib/auth.js";
export async function GET(request){
  try{
    if(!await verify(bearer(request)))return respond(401,{message:"Panel oturumu geçersiz."});
    const apps=[
      {id:"garage",name:"GarageFlow",url:process.env.GARAGE_URL||"https://yeni-prgram-test.vercel.app/"},
      {id:"kasa",name:"KasaFlow",url:process.env.KASA_URL||""},
      {id:"ekran",name:"Ekran & Çerçeve",url:process.env.EKRAN_URL||"https://ekran-sayilan.vercel.app/"}
    ];
    return respond(200,{apps:apps.map(app=>{
      let configured=false;
      try{configured=new URL(app.url).protocol==="https:";}catch{}
      return {...app,configured};
    })});
  }catch(err){console.error("hub apps failed",err?.message);return respond(503,{message:"Program listesi alınamadı."});}
}
