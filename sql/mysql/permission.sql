-- ============================================================
-- 文件名称：permission.sql
-- 功能描述：AIcode 数据库及权限数据表初始化脚本
-- 创建内容：数据库、权限表、相关索引
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
-- 2. 创建权限数据表（若不存在）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `permission` (
    `id`                    BIGINT       NOT NULL AUTO_INCREMENT          COMMENT '主键ID，自增长',
    `permission_name`       VARCHAR(64)  NOT NULL                         COMMENT '权限名，权限的标识名称，唯一，如 user:create、role:delete',
    `permission_description` VARCHAR(512) DEFAULT NULL                     COMMENT '权限描述，记录权限的业务含义与适用范围，便于运维识别',
    `is_disabled`           TINYINT(1)   NOT NULL DEFAULT 0               COMMENT '是否禁用：0-正常，1-禁用',
    `create_time`           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间，记录首次写入时间',
    `update_time`           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间，记录最近修改时间',
    PRIMARY KEY (`id`)                                            -- 主键索引
) ENGINE = InnoDB                                                  -- 存储引擎：InnoDB，支持事务与行级锁
  DEFAULT CHARSET = utf8mb4                                        -- 表字符集：utf8mb4
  COLLATE = utf8mb4_general_ci                                     -- 表排序规则
  COMMENT = '权限信息表，存储系统权限的基本资料与启用状态';

-- ------------------------------------------------------------
-- 3. 创建索引（若不存在）
-- ------------------------------------------------------------

-- 3.1 权限名唯一索引：保证权限名不重复，同时加速按权限名查询的检索（如权限校验、权限分配）
CREATE UNIQUE INDEX IF NOT EXISTS `uk_permission_permission_name`
    ON `permission` (`permission_name`);

-- 3.2 是否禁用普通索引：加速按权限状态筛选的查询（如统计正常/禁用权限数、获取所有可用权限列表）
CREATE INDEX IF NOT EXISTS `idx_permission_is_disabled`
    ON `permission` (`is_disabled`);

-- ------------------------------------------------------------
-- 脚本执行完毕
-- ------------------------------------------------------------
