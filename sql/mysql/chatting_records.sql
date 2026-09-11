-- ============================================================
-- 文件名称：chatting_records.sql
-- 功能描述：AIcode 数据库及对话记录数据表初始化脚本
-- 创建内容：数据库、对话记录表、相关索引
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
-- 2. 创建对话记录数据表（若不存在）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `chatting_records` (
    `id`                BIGINT       NOT NULL AUTO_INCREMENT          COMMENT '主键ID，自增长',
    `user_id`           INT          NOT NULL                         COMMENT '用户ID，关联用户表的用户标识',
    `chatting_name`     VARCHAR(128) NOT NULL                         COMMENT '对话名称，用户为本次对话自定义的标题，便于在对话列表中识别',
    `model_name`        VARCHAR(64)  NOT NULL                         COMMENT '模型名称，记录本次对话所调用的AI模型标识（如 glm-5.2、gpt-4 等）',
    `chatting_content`  MEDIUMTEXT   NOT NULL                         COMMENT '对话内容，存储完整的对话消息体（含多轮问答），最大约 16MB',
    `create_time`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间，记录对话首次写入时间',
    `update_time`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间，记录对话最近修改时间',
    PRIMARY KEY (`id`)                                            -- 主键索引
) ENGINE = InnoDB                                                  -- 存储引擎：InnoDB，支持事务与行级锁
  DEFAULT CHARSET = utf8mb4                                        -- 表字符集：utf8mb4
  COLLATE = utf8mb4_general_ci                                     -- 表排序规则
  COMMENT = '对话记录表，存储用户与AI模型之间的完整对话内容';

-- ------------------------------------------------------------
-- 3. 创建索引（若不存在）
-- ------------------------------------------------------------
-- 索引设计说明（是否需要生成索引的判断依据）：
--   1) user_id：高频查询条件（如查询某用户的历史对话列表），需要单独建立索引以加速单字段查询；
--   2) model_name：可能用于按模型筛选对话或统计各模型使用情况，属于中等频次查询条件，建立普通索引；
--   3) chatting_name：不同用户之间可能存在同名对话，单独建索引区分度低、意义不大，不单独建索引；
--      但与 user_id 组合可加速"查询某用户下指定名称对话"的高频组合查询，故建立复合索引；
--   4) chatting_content（MEDIUMTEXT）：字段内容较长，通常用于模糊检索而非等值/范围查询，
--      MySQL 对 TEXT 类列建立普通索引需指定前缀长度且区分度有限，故不建立普通索引；
--      如后续有全文检索需求，可另行评估 FULLTEXT 全文索引。
--   5) create_time / update_time：时间字段，如后续出现"按时间范围查询对话"的高频需求，
--      可再补充 (user_id, create_time) 复合索引，当前暂不预先建立，避免冗余索引。

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

-- 3.1 用户ID普通索引：加速按用户查询其历史对话列表的查询
CALL `_ensure_index`('chatting_records', 'idx_chatting_user_id', 0, '`user_id`');

-- 3.2 模型名称普通索引：加速按模型筛选对话或统计模型使用情况的查询
CALL `_ensure_index`('chatting_records', 'idx_chatting_model_name', 0, '`model_name`');

-- 3.3 用户ID + 对话名称复合索引：加速"查询某用户下指定名称对话"的组合查询
CALL `_ensure_index`('chatting_records', 'idx_chatting_user_name', 0, '`user_id`, `chatting_name`');

DROP PROCEDURE IF EXISTS `_ensure_index`;

-- ------------------------------------------------------------
-- 脚本执行完毕
-- ------------------------------------------------------------
