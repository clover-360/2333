-- ============================================================
-- 文件名称：role.sql
-- 功能描述：AIcode 数据库及角色数据表初始化脚本
-- 创建内容：数据库、角色表、相关索引
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
-- 2. 创建角色数据表（若不存在）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `role` (
    `id`                BIGINT       NOT NULL AUTO_INCREMENT          COMMENT '主键ID，自增长',
    `role_name`         VARCHAR(64)  NOT NULL                         COMMENT '角色名，角色的显示名称，唯一',
    `role_description`  VARCHAR(512) DEFAULT NULL                     COMMENT '角色描述，记录角色的职责说明与业务含义，便于运维识别',
    `permission_id`     BIGINT       NOT NULL DEFAULT 0               COMMENT '权限ID，关联权限表主键，0 表示未分配权限',
    `is_disabled`       TINYINT(1)   NOT NULL DEFAULT 0               COMMENT '是否禁用：0-正常，1-禁用',
    `create_time`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间，记录首次写入时间',
    `update_time`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间，记录最近修改时间',
    PRIMARY KEY (`id`)                                            -- 主键索引
) ENGINE = InnoDB                                                  -- 存储引擎：InnoDB，支持事务与行级锁
  DEFAULT CHARSET = utf8mb4                                        -- 表字符集：utf8mb4
  COLLATE = utf8mb4_general_ci                                     -- 表排序规则
  COMMENT = '角色信息表，存储系统角色的基本资料与启用状态';

-- ------------------------------------------------------------
-- 3. 创建索引（若不存在）
-- ------------------------------------------------------------

-- 3.1 角色名唯一索引：保证角色名不重复，同时加速按角色名查询的检索
CREATE UNIQUE INDEX IF NOT EXISTS `uk_role_role_name`
    ON `role` (`role_name`);

-- 3.2 权限ID普通索引：加速按权限筛选角色的查询（如权限校验、权限关联角色列表）
CREATE INDEX IF NOT EXISTS `idx_role_permission_id`
    ON `role` (`permission_id`);

-- 3.3 是否禁用普通索引：加速按角色状态筛选的查询（如统计正常/禁用角色数）
CREATE INDEX IF NOT EXISTS `idx_role_is_disabled`
    ON `role` (`is_disabled`);

-- 3.4 复合索引：权限ID + 是否禁用，加速"查询某权限下所有正常角色"这类高频组合查询
CREATE INDEX IF NOT EXISTS `idx_role_permission_disabled`
    ON `role` (`permission_id`, `is_disabled`);

-- ------------------------------------------------------------
-- 脚本执行完毕
-- ------------------------------------------------------------
