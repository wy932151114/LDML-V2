const { MongoClient } = require('mongodb');

async function main() {
  const client = new MongoClient('mongodb://127.0.0.1:27017/dzs-v2');
  await client.connect();
  const db = client.db('dzs-v2');
  
  const user = await db.collection('v2_users').findOne({ email: 'admin@daoziran.com' });
  const session = await db.collection('v2_sessions').findOne({ userId: user._id, isRevoked: false });
  
  require('fs').writeFileSync('/tmp/admin_token.txt', session.accessToken);
  process.stdout.write('TOKEN_SAVED');
  
  await client.close();
}
main().catch(e => { process.stderr.write(e.message); process.exit(1); });
