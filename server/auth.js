const crypto = require('crypto');
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return {salt, hash};
}
function verifyPassword(password, record) {
  if (!record?.salt || !record?.hash) return false;
  const actual = crypto.scryptSync(password, record.salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actual,'hex'), Buffer.from(record.hash,'hex'));
}
function sign(payload, secret) {
  const body=Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig=crypto.createHmac('sha256',secret).update(body).digest('base64url');
  return body+'.'+sig;
}
function verify(token, secret) {
  try { const [body,sig]=token.split('.'); if(!body||!sig)return null; const expected=crypto.createHmac('sha256',secret).update(body).digest('base64url'); if(!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null; const p=JSON.parse(Buffer.from(body,'base64url')); if(p.exp && p.exp<Date.now())return null; return p; } catch{return null;}
}
function cookieSerialize(name,value,maxAge){ return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`; }
module.exports={hashPassword,verifyPassword,sign,verify,cookieSerialize};
