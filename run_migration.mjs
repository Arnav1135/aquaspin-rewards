import fs from 'fs';
import pkg from 'pg';
const { Client } = pkg;

const connectionString = "postgres://postgres.myyavhepigrtwlewhdbt:Arnav1234%40%23%24_@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";
const sql = fs.readFileSync('d:/Web App - Aqua Blue/supabase/migrations/20260914000000_secure_economy.sql', 'utf8');

const client = new Client({ 
  connectionString,
  ssl: { rejectUnauthorized: false }
});
client.connect()
  .then(() => console.log('Connected to DB!'))
  .then(() => client.query(sql))
  .then(() => console.log('Migration executed successfully!'))
  .catch(e => console.error('Error:', e.message))
  .finally(() => client.end());
