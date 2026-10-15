/** Cloudflare Pages advanced mode. Bind FEEDBACK_DB (D1) in Pages settings.
 * Static files served through env.ASSETS. No credentials are embedded.
 */
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const deny=()=>json({error:'Owner authentication has not been configured.'},403);
const pageHTML="<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta name=\"theme-color\" content=\"#214d36\"><meta name=\"description\" content=\"Shake N Bite — Makhana, Gud and Sattu. Little joys. Good roots.\"><title>Shake N Bite | Little joys. Good roots.</title><link rel=\"preconnect\" href=\"https://fonts.googleapis.com\"><link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin><link href=\"https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;1,400;1,500&display=swap\" rel=\"stylesheet\"><link rel=\"stylesheet\" href=\"/styles.css\"><link rel=\"icon\" type=\"image/png\" href=\"/favicon.png\"><link rel=\"apple-touch-icon\" href=\"/favicon.png\"></head><body><div id=\"app\"></div><script src=\"/app.js\" defer></script></body></html>\n";
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname==='/_api/catalog'&&request.method==='GET'){
   // Catalog is intentionally empty until owner-managed inventory is configured.
   return json({products:[]});
  }
  if(url.pathname==='/_api/feedback'&&request.method==='POST'){
   if(!env.FEEDBACK_DB)return json({error:'Feedback is temporarily unavailable.'},503);
   if(Number(request.headers.get('content-length')||0)>8000)return json({error:'Message too large.'},413);
   let body;try{body=await request.json()}catch{return json({error:'Invalid request.'},400)}
   const email=String(body?.email||'').trim(),message=String(body?.message||'').trim(),website=String(body?.website||'');
   if(website)return json({ok:true});
   if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||message.length<5||message.length>2000)return json({error:'Please enter a valid email and a message between 5 and 2000 characters.'},400);
   try{
    await env.FEEDBACK_DB.prepare('INSERT INTO feedback (email,message) VALUES (?,?)').bind(email,message).run();
    return json({ok:true});
   }catch{return json({error:'Unable to save feedback. Please try again later.'},503)}
  }
  if(url.pathname.startsWith('/_api/')||url.pathname.startsWith('/admin/api/'))return deny();
  if(request.method!=='GET'&&request.method!=='HEAD')return new Response('Method not allowed',{status:405});
  // Explicitly block public access to admin source/prototypes.
  if(url.pathname==='/owner-panel.html'||url.pathname==='/test_site.py')return new Response('Not found',{status:404});
  if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname.startsWith('/ingredients/')||url.pathname==='/gratitude'||url.pathname==='/privacy'||url.pathname==='/admin'||url.pathname.startsWith('/info/')){
   // Serve the SPA shell directly. Pages asset fetch for /index.html can return a
   // 308 redirect to /, which otherwise creates a redirect loop on every route.
   return new Response(request.method==='HEAD'?null:pageHTML,{status:200,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-cache','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin'}});
  }
  return env.ASSETS.fetch(request);
 }
};
