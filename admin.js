const r=require('express').Router(),{db,uid,hash}=require('../database');
r.use((q,s,n)=>q.user.is_admin?n():s.status(403).json({error:'forbidden'}));
r.get('/stats',(q,s)=>s.json({users:db.prepare('select count(*) n from users').get().n,groups:db.prepare('select count(*) n from groups').get().n,online:q.app.get('io').of('/').sockets.size}));
r.get('/user/:masked',(q,s)=>{const u=db.prepare('select * from users where masked=?').get(q.params.masked);if(!u)return s.status(404).json({error:'nf'});
s.json({username:u.username,groups:db.prepare('select g.id,g.name from groups g join members m on m.group_id=g.id where m.user_id=? and m.left_at is null').all(u.id),
chats:db.prepare('select c.id,o.masked other from chats c join users o on o.id=(case when c.a=? then c.b else c.a end) where c.a=? or c.b=?').all(u.id,u.id,u.id)})});
r.delete('/chat/:id',(q,s)=>{const c=db.prepare('select * from chats where id=?').get(q.params.id);if(!c)return s.status(404).json({error:'nf'});
db.prepare('delete from messages where chat_id=?').run(c.id);db.prepare('delete from chats where id=?').run(c.id);[c.a,c.b].forEach(p=>q.app.get('io').to(p).emit('chatgone',c.id));s.json({ok:1})});
r.delete('/group/:gid/member/:masked',(q,s)=>{const u=db.prepare('select id from users where masked=?').get(q.params.masked);
if(u)db.prepare('delete from members where group_id=? and user_id=?').run(q.params.gid,u.id);s.json({ok:1})});
r.post('/official',(q,s)=>{const id=uid(),mode=q.body.send_mode==='all'?'all':'admin';
db.prepare('insert into groups(id,name,admin_id,official,send_mode) values(?,?,?,1,?)').run(id,String(q.body.name||'Official').slice(0,40),q.user.id,mode);
db.prepare('insert into members values(?,?,null)').run(id,q.user.id);s.json({id})});
r.post('/official/:id/addall',(q,s)=>{db.prepare('insert into members select ?,id,null from users where 1 on conflict(group_id,user_id) do update set left_at=null').run(q.params.id);q.app.get('io').emit('chats');s.json({ok:1})});
r.post('/password',(q,s)=>{if(!/^[A-Za-z0-9]{6,15}$/.test(q.body.password||''))return s.status(400).json({error:'password'});
db.prepare('update users set pass=? where id=?').run(hash(q.body.password),q.user.id);s.json({ok:1})});
module.exports=r;
