const fs=require('fs'); const path=require('path'); const {hashPassword}=require('./auth'); const {dataDir,defaultPassword}=require('./config');
function ensure(){fs.mkdirSync(dataDir,{recursive:true}); for(const [f,initial] of [['users.json',[]],['reviews.json',{}],['session-status.json',{}]]) if(!fs.existsSync(path.join(dataDir,f)))fs.writeFileSync(path.join(dataDir,f),JSON.stringify(initial,null,2));}
function read(name, fallback){try{return JSON.parse(fs.readFileSync(path.join(dataDir,name),'utf8'))}catch{return fallback}}
function write(name,data){fs.writeFileSync(path.join(dataDir,name),JSON.stringify(data,null,2),'utf8')}
function init(){ensure(); let users=read('users.json',[]); if(!users.some(u=>u.username==='admin')){const hp=hashPassword(defaultPassword); users.unshift({id:'admin',username:'admin',name:'System Administrator',role:'admin',password:hp,active:true,createdAt:new Date().toISOString()});write('users.json',users)}}
function sessions(){return read('imported-sessions.json',[])}
function cases(){return read('cases.json',[])}
function users(){return read('users.json',[])}
module.exports={ensure,init,read,write,sessions,cases,users};
