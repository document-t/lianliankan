CREATE DATABASE IF NOT EXISTS lianliankan DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE lianliankan;
CREATE TABLE IF NOT EXISTS scores (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  nickname VARCHAR(50) NOT NULL COMMENT '玩家昵称',
  score INT NOT NULL COMMENT '本局得分',
  time_used INT NOT NULL COMMENT '游玩总秒数',
  use_hint INT DEFAULT 0 COMMENT '使用提示次数',
  use_shuffle INT DEFAULT 0 COMMENT '重排总次数(自动+手动)',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '提交时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='游戏排行榜数据表';