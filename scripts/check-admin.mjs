const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');

async function main() {
  const client = new MongoClient('mongodb://127.0.0.***:27017/dzs-v2');
  await client.connect();
  const db = client.db('dzs-v2');
  
  const user = await db.collection('v2_users').findOne({ email: 'admin@daoziran.com' });
  if (!user) { console.log('USER_NOT_FOUND'); process.exit(1); }
  
  const session = await db.collection('v2_sessions').findOne({ userId: user._id, isRevoked: false });
  if (!session) { console.log('SESSION_NOT_FOUND'); process.exit(1); }
  
  const decoded = jwt.decode(session.accessToken);
  
  console.log('EMAIL: admin@daoziran.com');
  console.log('PASS: admin888');
  console.log('ROLE: ' + user.role);
  console.log('ISS: ' + new Date(decoded.iat * 1000).toISOString());
  console.log('EXP: ' + new Date(decoded.exp * 1000).toISOString());
  process.stdout.write('TOKEN: ' + session.accessToken);
  
  await client.close();
}
main().catch(e => { console.error(e.message); process.exit(1); });
