import pkg from 'pg';
const { Client } = pkg;
const connectionString = "postgres://postgres.myyavhepigrtwlewhdbt:Arnav1234%40%23%24_@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
client.connect().then(() => {
  return client.query("SELECT routine_name FROM information_schema.routines WHERE routine_type='FUNCTION' AND routine_schema='public';");
}).then(res => {
  console.log(res.rows.map(r => r.routine_name).filter(n => n.includes('update_user') || n.includes('record')));
  client.end();
});
