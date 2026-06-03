import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function testConnection() {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW()');
    client.release();
    return { success: true, message: '数据库连接成功', timestamp: res.rows[0].now };
  } catch (error) {
    console.error('数据库连接错误:', error);
    return { success: false, message: error.message };
  }
}

export async function query(text, params = []) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } catch (error) {
    console.error('查询错误:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

export default pool;