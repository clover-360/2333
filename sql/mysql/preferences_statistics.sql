-- ============================================================
-- 文件名称：preferences_statistics.sql
-- 功能描述：AIcode 数据库及用户喜好统计数据表初始化脚本
-- 创建内容：数据库、用户喜好统计表、相关索引
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
-- 2. 创建用户喜好统计数据表（若不存在）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `preferences_statistics` (
    `id`               BIGINT       NOT NULL AUTO_INCREMENT          COMMENT '主键ID，自增长',
    `name`             VARCHAR(128) NOT NULL                         COMMENT '喜好名，用户喜好的名称，关联喜好信息表',
    `user_count`       INT          NOT NULL DEFAULT 0               COMMENT '用户数量，统计日期当天选择该喜好的用户总数',
    `statistics_date`  DATE         NOT NULL                         COMMENT '统计日期，按天维度统计的喜好数据所属日期',
    `create_time`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间，记录首次写入时间',
    `update_time`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间，记录最近修改时间',
    PRIMARY KEY (`id`)                                               -- 主键索引
) ENGINE = InnoDB                                                   -- 存储引擎：InnoDB，支持事务与行级锁
  DEFAULT CHARSET = utf8mb4                                         -- 表字符集：utf8mb4
  COLLATE = utf8mb4_general_ci                                      -- 表排序规则
  COMMENT = '用户喜好统计表，按天维度记录各喜好对应的用户数量';

-- ------------------------------------------------------------
-- 3. 创建索引（若不存在）
-- ------------------------------------------------------------
-- 索引设计说明：
--   1) name 与 statistics_date 均为高频查询条件，需单独建立索引以加速单字段查询；
--   2) (name, statistics_date) 建立唯一索引，既保证同一喜好同一天仅有一条统计记录，
--      又能加速"查询某喜好某一天统计"的组合查询，避免重复数据写入；
--   3) user_count 为统计结果数值，通常作为查询展示字段而非查询条件，无需单独建索引。

-- 说明：MySQL 不支持 CREATE INDEX IF NOT EXISTS 语法，此处通过存储过程
--       查询 information_schema 判断索引是否存在，实现幂等创建，可重复执行
DROP PROCEDURE IF EXISTS `_ensure_index`;
DELIMITER //
CREATE PROCEDURE `_ensure_index`(
    IN p_table  VARCHAR(64),
    IN p_index  VARCHAR(64),
    IN p_unique TINYINT,
    IN p_cols   TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name   = p_table
          AND index_name   = p_index
    ) THEN
        IF p_unique = 1 THEN
            SET @sql = CONCAT('CREATE UNIQUE INDEX `', p_index, '` ON `', p_table, '` (', p_cols, ')');
        ELSE
            SET @sql = CONCAT('CREATE INDEX `', p_index, '` ON `', p_table, '` (', p_cols, ')');
        END IF;
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //
DELIMITER ;

-- 3.1 喜好名普通索引：加速按喜好查询其用户数量趋势的查询（如某喜好近30天用户数变化）
CALL `_ensure_index`('preferences_statistics', 'idx_preferences_statistics_name', 0, '`name`');

-- 3.2 统计日期普通索引：加速按日期范围查询全量喜好统计的查询（如某天所有喜好的用户数排行）
CALL `_ensure_index`('preferences_statistics', 'idx_preferences_statistics_date', 0, '`statistics_date`');

-- 3.3 喜好名 + 统计日期唯一索引：保证同一喜好同一天仅有一条统计记录，同时加速组合查询
CALL `_ensure_index`('preferences_statistics', 'uk_preferences_statistics_name_date', 1, '`name`, `statistics_date`');

DROP PROCEDURE IF EXISTS `_ensure_index`;

-- ------------------------------------------------------------
-- 脚本执行完毕
-- ------------------------------------------------------------
