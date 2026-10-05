-- =============================================================
-- 个人财务记账产品 · 数据库结构（MySQL 8/9）
-- 依据：PRD 第 7 章「数据模型设计」+ 002.记账产品/js/store.js 实际字段
-- 约定：
--   1) 金额以「元」DECIMAL(12,2) 存储（字段 *amount*），精确到分
--   2) 表/列名用 snake_case；前端 JS 用 camelCase，集成时映射
--   3) id 在 PRD 中为 string（前端概念），后端用 BIGINT 自增主键
-- =============================================================

CREATE DATABASE IF NOT EXISTS finance
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE finance;

-- ---------------------------------------------------------------
-- 分类表 Category（PRD 4.2 / 第 7 章）
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(32)  NOT NULL COMMENT '分类名称',
  type       ENUM('expense','income') NOT NULL COMMENT '收支类型：expense=支出 / income=收入',
  icon       VARCHAR(16)  NOT NULL DEFAULT '📦' COMMENT '图标（emoji 或标识）',
  sort       INT          NOT NULL DEFAULT 0 COMMENT '排序权重，越小越靠前',
  color      VARCHAR(16)  NULL COMMENT '图表/UI 颜色（可选，前端可由色板派生）',
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_cat_name_type (name, type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='分类表';

-- ---------------------------------------------------------------
-- 账目表 Transaction（PRD 4.1 / 第 7 章）
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  type         ENUM('expense','income') NOT NULL COMMENT '收支类型',
  amount       DECIMAL(12,2)   NOT NULL COMMENT '金额（元）',
  category_id  BIGINT UNSIGNED  NOT NULL COMMENT '关联分类 id',
  account      ENUM('现金','微信','支付宝','银行卡') NOT NULL DEFAULT '现金' COMMENT '账户',
  note         VARCHAR(100)    NULL COMMENT '备注（≤100 字）',
  date         DATE            NOT NULL COMMENT '记账日期 YYYY-MM-DD',
  deleted      TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '软删除标记（回收站）',
  deleted_at   DATETIME        NULL COMMENT '删除时间（软删除时写入）',
  created_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_tx_date     (date),
  KEY idx_tx_type     (type),
  KEY idx_tx_category (category_id),
  KEY idx_tx_deleted  (deleted),
  CONSTRAINT fk_tx_category FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='账目表';

-- ---------------------------------------------------------------
-- 预算表 Budget（PRD 4.5 / 第 7 章）
--   category_id 为 NULL 表示「总预算」
--   （单月总预算的唯一性由应用层保证，见 store.js setBudget）
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS budgets (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id  BIGINT UNSIGNED NULL COMMENT '分类预算；NULL 表示总预算',
  month        CHAR(7)        NOT NULL COMMENT '月份 YYYY-MM',
  amount       DECIMAL(12,2)  NOT NULL COMMENT '预算金额（元）',
  created_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_budget (category_id, month),
  CONSTRAINT fk_budget_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='预算表';

-- ---------------------------------------------------------------
-- 应用设置表 Settings（PRD 未明确列出，对应前端 pj_settings，扩展用）
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  `key`      VARCHAR(64) NOT NULL,
  `value`    TEXT        NULL,
  updated_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='应用设置（键值对）';

-- =============================================================
-- 种子数据：默认分类（PRD 4.2.2）
--   支出 12 个 + 收入 5 个，sort 与前端展示顺序一致
-- =============================================================
INSERT INTO categories (name, type, icon, sort) VALUES
  ('餐饮',   'expense', '🍜', 0),
  ('交通',   'expense', '🚇', 1),
  ('购物',   'expense', '🛒', 2),
  ('住房',   'expense', '🏠', 3),
  ('水电煤', 'expense', '💡', 4),
  ('通讯',   'expense', '📱', 5),
  ('娱乐',   'expense', '🎮', 6),
  ('医疗',   'expense', '💊', 7),
  ('教育',   'expense', '🎓', 8),
  ('宠物',   'expense', '🐶', 9),
  ('旅行',   'expense', '✈️', 10),
  ('其他',   'expense', '📦', 11),
  ('工资',     'income', '💰', 0),
  ('奖金',     'income', '🎁', 1),
  ('理财收益', 'income', '📈', 2),
  ('红包',     'income', '🧧', 3),
  ('其他',     'income', '📦', 4);
