-- ============================================================
-- 文件名称：user.sql
-- 功能描述：AIcode 数据库及用户数据表初始化脚本
-- 创建内容：数据库、用户表、相关索引
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
-- 2. 创建用户数据表（若不存在）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user` (
    `id`            BIGINT       NOT NULL AUTO_INCREMENT          COMMENT '主键ID，自增长',
    `avatar`        VARCHAR(255) DEFAULT NULL                     COMMENT '用户头像，存储头像图片的访问路径或URL',
    `username`      VARCHAR(64)  NOT NULL                         COMMENT '用户名，登录账号，唯一',
    `password`      VARCHAR(128) NOT NULL                         COMMENT '密码，建议存储加密后的密文（如 bcrypt / MD5 + 盐值）',
    `preference`    VARCHAR(512) DEFAULT NULL                     COMMENT '用户喜好，记录用户的个性化偏好设置，可存 JSON 字符串',
    `role_id`       BIGINT       NOT NULL DEFAULT 0               COMMENT '角色ID，关联角色表主键，0 表示未分配角色',
    `is_disabled`   TINYINT(1)   NOT NULL DEFAULT 0               COMMENT '是否禁用：0-正常，1-禁用',
    `create_time`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间，记录首次写入时间',
    `update_time`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间，记录最近修改时间',
    PRIMARY KEY (`id`)                                            -- 主键索引
) ENGINE = InnoDB                                                  -- 存储引擎：InnoDB，支持事务与行级锁
  DEFAULT CHARSET = utf8mb4                                        -- 表字符集：utf8mb4
  COLLATE = utf8mb4_general_ci                                     -- 表排序规则
  COMMENT = '用户信息表，存储系统用户的基本资料与账号状态';

-- ------------------------------------------------------------
-- 3. 创建索引（若不存在）
-- ------------------------------------------------------------

-- 3.1 用户名唯一索引：保证用户名不重复，同时加速按用户名登录的查询
CREATE UNIQUE INDEX IF NOT EXISTS `uk_user_username`
    ON `user` (`username`);

-- 3.2 角色ID普通索引：加速按角色筛选用户的查询（如权限校验、角色人员列表）
CREATE INDEX IF NOT EXISTS `idx_user_role_id`
    ON `user` (`role_id`);

-- 3.3 是否禁用普通索引：加速按账号状态筛选用户的查询（如统计正常/禁用用户数）
CREATE INDEX IF NOT EXISTS `idx_user_is_disabled`
    ON `user` (`is_disabled`);

-- 3.4 复合索引：角色ID + 是否禁用，加速"查询某角色下所有正常用户"这类高频组合查询
CREATE INDEX IF NOT EXISTS `idx_user_role_disabled`
    ON `user` (`role_id`, `is_disabled`);

-- ------------------------------------------------------------
-- 脚本执行完毕
-- ------------------------------------------------------------
