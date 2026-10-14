const express=require('express'),http=require('http'),{Server}=require('socket.io'),{db,auth}=require('./database');
const app=express(),srv=http.createServer(app),io=new Server(srv);
app.set('io',io);app.use(express.json({limit:'1mb'}));app.use(express.static('public',{etag:false,setHeaders:r=>r.setHeader('Cache-Control','no-store')}));
app.use('/api/auth',require('./routes/auth'));app.use('/api',auth);
for(const n of['profile','chats','groups','admin'])app.use('/api/'+n,require('./routes/'+n));
io.use((s,n)=>{const u=db.prepare('select user_id from sessions where token=?').get(s.handshake.auth.token);if(!u)return n(new Error('auth'));s.uid=u.user_id;n()});
io.on('connection',s=>s.join(s.uid));
srv.listen(process.env.PORT||3000,()=>console.log('Telechat up'));
