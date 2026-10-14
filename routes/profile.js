const r=require('express').Router(),{db,isContact}=require('../database');
const pub=u=>({masked:u.masked,username:u.username,avatar:u.avatar,bio:u.bio,link:u.link,paused:u.paused,find_all:u.find_all,pic_all:u.pic_all,link_public:u.link_public,onboarded:u.onboarded,is_admin:u.is_admin});
r.get('/me',(q,s)=>s.json(pub(q.user)));
r.put('/me',(q,s)=>{const u=q.user,{username,bio,link,avatar}=q.body;
if(username!==undefined&&username!==u.username){const n=[...username].length;if(n<1||n>15)return s.status(400).json({error:'username'});
const day=new Date().toISOString().slice(0,10),c=u.name_day===day?u.name_changes:0;if(c>=2)return s.status(429).json({error:'limit'});
db.prepare('update users set username=?,name_changes=?,name_day=? where id=?').run(username,c+1,day,u.id)}
if(link!==undefined){if(link&&!/^(https?:\/\/|t\.me\/)\S+$/i.test(link))return s.status(400).json({error:'link'});db.prepare('update users set link=? where id=?').run(link,u.id)}
if(bio!==undefined)db.prepare('update users set bio=? where id=?').run(String(bio).slice(0,300),u.id);
if(avatar!==undefined){if(avatar&&(!avatar.startsWith('data:image/')||avatar.length>300000))return s.status(400).json({error:'avatar'});db.prepare('update users set avatar=? where id=?').run(avatar||null,u.id)}
s.json(pub(db.prepare('select * from users where id=?').get(u.id)))});
r.put('/privacy',(q,s)=>{const b=q.body;for(const k of['paused','find_all','pic_all','link_public'])if(k in b)db.prepare(`update users set ${k}=? where id=?`).run(b[k]?1:0,q.user.id);s.json({ok:1})});
r.post('/onboarded',(q,s)=>{db.prepare('update users set onboarded=1 where id=?').run(q.user.id);s.json({ok:1})});
r.get('/u/:masked',(q,s)=>{const u=db.prepare('select * from users where masked=?').get(q.params.masked);
if(!u||(u.paused&&!q.user.is_admin))return s.status(404).json({error:'nf'});
const c=u.id===q.user.id||q.user.is_admin||isContact(u.id,q.user.id),o=pub(u);
if(!u.pic_all&&!c)o.avatar=null;if(!u.link_public&&!c)o.link='';s.json(o)});
r.delete('/me',(q,s)=>{const id=q.user.id;if(q.user.is_admin)return s.status(403).json({error:'admin'});
const io=q.app.get('io');
for(const c of db.prepare('select * from chats where a=? or b=?').all(id,id)){db.prepare('delete from messages where chat_id=?').run(c.id);db.prepare('delete from chats where id=?').run(c.id);io.to(c.a===id?c.b:c.a).emit('chatgone',c.id)}
db.prepare('delete from messages where owner_id=?').run(id);db.prepare('delete from members where user_id=?').run(id);
db.prepare('delete from sessions where user_id=?').run(id);db.prepare('delete from reads where user_id=?').run(id);
db.prepare('insert or ignore into banned values(?)').run(q.user.masked);db.prepare('delete from users where id=?').run(id);io.emit('chats');s.json({ok:1})});
module.exports=r;
