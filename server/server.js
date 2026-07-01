const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// 中间件
app.use(cors());
app.use(express.json());
// 托管前端静态文件
app.use(express.static(path.join(__dirname, '../public')));

// MySQL 数据库配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'lianliankan',
  port: 3306,                    
  connectionLimit: 10,
  waitForConnections: true
};
const pool = mysql.createPool(dbConfig);

// ========== 自动初始化数据库（建库建表） ==========
async function initDatabase() {
  // 临时连接池（不指定 database，以便创建库）
  const tempPool = mysql.createPool({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    port: dbConfig.port
  });
  const conn = await tempPool.getConnection();
  try {
    // 创建数据库，指定字符集（如果不存在）
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS ${dbConfig.database} 
       DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await conn.query(`USE ${dbConfig.database}`);
    // 创建成绩表（完整结构，包含注释和引擎）
    await conn.query(`
      CREATE TABLE IF NOT EXISTS scores (
        id INT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
        nickname VARCHAR(50) NOT NULL COMMENT '玩家昵称',
        score INT NOT NULL COMMENT '本局得分',
        time_used INT NOT NULL COMMENT '游玩总秒数',
        use_hint INT DEFAULT 0 COMMENT '使用提示次数',
        use_shuffle INT DEFAULT 0 COMMENT '重排总次数(自动+手动)',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '提交时间'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='游戏排行榜数据表'
    `);
    console.log('✅ 数据库和表初始化成功（或已存在）');
  } catch (err) {
    console.error('❌ 数据库初始化失败:', err.message);
  } finally {
    conn.release();
    await tempPool.end();
  }
}
// ===============================================

// 测试数据库连接并执行初始化
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ MySQL 数据库连接成功（端口 3306）');
    conn.release();
    await initDatabase();
  } catch (err) {
    console.log('❌ MySQL 连接失败:');
    console.log('请检查账号密码是否正确、MySQL服务是否启动、端口3308是否开放');
    console.error(err);
  }
})();

// ========== API 接口 ==========

// 接口1：提交分数
app.post('/api/score', async (req, res) => {
  const { nickname, score, time_used, use_hint, use_shuffle } = req.body;
  const sql = `
    INSERT INTO scores (nickname, score, time_used, use_hint, use_shuffle)
    VALUES (?, ?, ?, ?, ?)
  `;
  try {
    await pool.query(sql, [nickname, score, time_used, use_hint, use_shuffle]);
    res.json({ code: 200, msg: '提交成功' });
  } catch (err) {
    res.status(500).json({ code: 500, msg: '提交失败', err: err.message });
  }
});

// 接口2：获取排行榜（按分数降序，时间升序）
app.get('/api/rankings', async (req, res) => {
  const sql = `
    SELECT nickname, score, time_used FROM scores
    ORDER BY score DESC, time_used ASC LIMIT 20
  `;
  try {
    const [rows] = await pool.query(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ code: 500, msg: '获取榜单失败', err: err.message });
  }
});

// 启动 Web 服务
app.listen(PORT, () => {
  console.log('🚀 服务器启动成功');
  console.log(`🎮 游戏访问地址: http://localhost:${PORT}`);
});