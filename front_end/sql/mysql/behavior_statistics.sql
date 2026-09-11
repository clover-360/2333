-- ============================================================
-- 文件名称：behavior_statistics.sql
-- 功能描述：AIcode 数据库及用户行为统计数据表初始化脚本
-- 创建内容：数据库、用户行为统计表、相关索引
-- 备注说明：所有对象均采用"不存在则创建"的幂等写法，可重复执行
-- ============================================================

-- ------------------------------------------------------------
-- 1. 创建数据库（若不存在）
-- ------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS `AIcode`
    DEFAULT CHARACTER SET utf8mb4           -- 字符集：utf8mb4，支持完整 Unicode（含 emoji）
    DEFAULT COLLATE       utf8mb4_general_ci; -- 排序规则：不区分大小写，通用场景适用

-- 切换到目标数据库
USE `AIcode`;

-- ------------------------------------------------------------
-- 2. 创建用户行为统计数据表（若不存在）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `behavior_statistics` (
    `id`               BIGINT   NOT NULL AUTO_INCREMENT          COMMENT '主键ID，自增长',
    `user_id`          INT      NOT NULL                         COMMENT '用户ID，关联用户表的用户标识',
    `login_count`      INT      NOT NULL DEFAULT 0               COMMENT '登录次数，统计周期内用户登录的总次数',
    `dialog_count`     INT      NOT NULL DEFAULT 0               COMMENT '对话次数，统计周期内用户发起对话的总次数',
    `statistics_date`  DATE     NOT NULL                         COMMENT '统计日期，按天维度统计的行为数据所属日期',
    `create_time`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间，记录首次写入时间',
    `update_time`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间，记录最近修改时间',
    PRIMARY KEY (`id`)                                            -- 主键索引
) ENGINE = InnoDB                                                  -- 存储引擎：InnoDB，支持事务与行级锁
  DEFAULT CHARSET = utf8mb4                                        -- 表字符集：utf8mb4
  COLLATE = utf8mb4_general_ci                                     -- 表排序规则
  COMMENT = '用户行为统计表，按天维度记录用户的登录次数与对话次数';

-- ------------------------------------------------------------
-- 3. 创建索引（若不存在）
-- ------------------------------------------------------------
-- 索引设计说明：
--   1) user_id 与 statistics_date 均为高频查询条件，需单独建立索引以加速单字段查询；
--   2) (user_id, statistics_date) 建立唯一索引，既保证同一用户同一天仅有一条统计记录，
--      又能加速"查询某用户某一天统计"的组合查询，避免重复数据写入；
--   3) login_count、dialog_count 为统计结果数值，通常作为查询展示字段而非查询条件，无需单独建索引。

-- 3.1 用户ID普通索引：加速按用户查询其历史行为统计的查询（如某用户近30天登录趋势）
CREATE INDEX IF NOT EXISTS `idx_behavior_user_id`
    ON `behavior_statistics` (`user_id`);

-- 3.2 统计日期普通索引：加速按日期范围查询全量用户统计的查询（如某天所有用户活跃情况）
CREATE INDEX IF NOT EXISTS `idx_behavior_statistics_date`
    ON `behavior_statistics` (`statistics_date`);

-- 3.3 用户ID + 统计日期唯一索引：保证同一用户同一天仅有一条统计记录，同时加速组合查询
CREATE UNIQUE INDEX IF NOT EXISTS `uk_behavior_user_date`
    ON `behavior_statistics` (`user_id`, `statistics_date`);

-- ------------------------------------------------------------
-- 脚本执行完毕
-- ------------------------------------------------------------
