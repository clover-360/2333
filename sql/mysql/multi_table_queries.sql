-- ============================================================
-- 文件名称：multi_table_queries.sql
-- 功能描述：基于 user / role / permission / preferences_statistics 四表的
--           嵌套查询、多表 JOIN、聚合函数及综合查询示例集合
-- 涉及表关系（RBAC 关联链）：
--   user.role_id        -> role.id            （用户所属角色）
--   role.permission_id  -> permission.id      （角色所拥有的权限）
--   preferences_statistics.name 与 user.preference 存在业务语义关联
--      （统计表按天记录某喜好的用户数，与用户表中记录的偏好存在业务对应关系）
-- 备注说明：所有示例仅作演示用途，实际使用时请根据业务场景调整条件
-- ============================================================

USE `AIcode`;

-- ============================================================
-- 一、嵌套查询（子查询）示例
-- ============================================================

-- ------------------------------------------------------------
-- 1.1 [IN 子查询] 查询已分配角色的用户（role_id 在 role 表主键集合中）
--    关联关系：user.role_id ∈ (SELECT id FROM role)
--    用途：找出所有已绑定有效角色的用户，排除 role_id=0 的未分配用户
-- ------------------------------------------------------------
SELECT
    `id`,
    `username`,
    `role_id`,
    `is_disabled`
FROM `user`
WHERE `role_id` IN (
    SELECT `id` FROM `role`
)
ORDER BY `role_id` ASC, `id` ASC;


-- ------------------------------------------------------------
-- 1.2 [NOT IN 子查询] 查询未分配任何角色的用户
--    关联关系：user.role_id 不在 role 表主键集合中（含 role_id=0 的情况）
--    用途：定位需要补全角色信息的用户，便于运维补录
-- ------------------------------------------------------------
SELECT
    `id`,
    `username`,
    `role_id`,
    `create_time`
FROM `user`
WHERE `role_id` NOT IN (
    SELECT `id` FROM `role`
)
ORDER BY `create_time` DESC;


-- ------------------------------------------------------------
-- 1.3 [EXISTS 子查询] 查询所属角色处于启用状态的用户
--    关联关系：存在 role 表中 id = user.role_id 且 is_disabled=0 的记录
--    用途：筛选"角色有效且未禁用"的用户，用于登录鉴权前的有效用户列表
-- ------------------------------------------------------------
SELECT
    u.`id`,
    u.`username`,
    u.`role_id`
FROM `user` u
WHERE EXISTS (
    SELECT 1
    FROM `role` r
    WHERE r.`id` = u.`role_id`
      AND r.`is_disabled` = 0
)
  AND u.`is_disabled` = 0
ORDER BY u.`id` ASC;


-- ------------------------------------------------------------
-- 1.4 [NOT EXISTS 子查询] 查询其角色已被禁用或不存在对应角色的用户
--    关联关系：不存在 role 表中 id = user.role_id 且 is_disabled=0 的记录
--    用途：发现"角色失效"的用户，提示管理员重新分配角色
-- ------------------------------------------------------------
SELECT
    u.`id`,
    u.`username`,
    u.`role_id`
FROM `user` u
WHERE NOT EXISTS (
    SELECT 1
    FROM `role` r
    WHERE r.`id` = u.`role_id`
      AND r.`is_disabled` = 0
)
ORDER BY u.`id` ASC;


-- ------------------------------------------------------------
-- 1.5 [比较运算符子查询] 查询 user_count 大于"所有喜好平均用户数"的统计记录
--    关联关系：preferences_statistics.user_count > (SELECT AVG(user_count) ...)
--    用途：找出高于平均水平的"热门喜好"统计记录，辅助运营决策
-- ------------------------------------------------------------
SELECT
    `name`,
    `user_count`,
    `statistics_date`
FROM `preferences_statistics`
WHERE `user_count` > (
    SELECT AVG(`user_count`)
    FROM `preferences_statistics`
)
ORDER BY `user_count` DESC;


-- ------------------------------------------------------------
-- 1.6 [ALL 比较子查询] 查询 user_count 大于"每个喜好各自最大值中最大者"的记录
--    关联关系：user_count > ALL(SELECT MAX(user_count) ... GROUP BY name)
--    用途：定位全库最高峰值的喜好统计记录（演示 ALL 用法）
--    说明：此查询结果通常为空或仅一条，用于演示 ALL 语义
-- ------------------------------------------------------------
SELECT
    `name`,
    `user_count`,
    `statistics_date`
FROM `preferences_statistics`
WHERE `user_count` >= ALL (
    SELECT MAX(`user_count`)
    FROM `preferences_statistics`
    GROUP BY `name`
);


-- ------------------------------------------------------------
-- 1.7 [ANY/IN 子查询] 查询角色 ID 属于"已禁用权限对应角色集合"的用户
--    关联关系：user.role_id ∈ (SELECT id FROM role WHERE permission_id IN (SELECT id FROM permission WHERE is_disabled=1))
--    用途：找出权限已被禁用但仍关联该角色的用户，用于权限回收排查
-- ------------------------------------------------------------
SELECT
    `id`,
    `username`,
    `role_id`
FROM `user`
WHERE `role_id` IN (
    SELECT `id`
    FROM `role`
    WHERE `permission_id` IN (
        SELECT `id`
        FROM `permission`
        WHERE `is_disabled` = 1
    )
)
ORDER BY `role_id` ASC;


-- ============================================================
-- 二、多表 JOIN 示例
-- ============================================================

-- ------------------------------------------------------------
-- 2.1 [INNER JOIN 双表] 查询用户及其所属角色名称
--    关联关系：user.role_id = role.id（内连接，仅保留已分配角色的用户）
--    用途：用户列表展示角色名称，替代仅显示 role_id 的原始数据
-- ------------------------------------------------------------
SELECT
    u.`id`          AS `用户ID`,
    u.`username`    AS `用户名`,
    u.`is_disabled` AS `用户状态`,
    r.`id`          AS `角色ID`,
    r.`role_name`   AS `角色名`
FROM `user` u
INNER JOIN `role` r
    ON u.`role_id` = r.`id`
ORDER BY r.`id` ASC, u.`id` ASC;


-- ------------------------------------------------------------
-- 2.2 [LEFT JOIN 双表] 查询所有用户及其角色信息（含未分配角色的用户）
--    关联关系：user.role_id = role.id（左连接，保留所有 user 记录）
--    用途：完整用户清单，未分配角色者角色字段显示为 NULL
-- ------------------------------------------------------------
SELECT
    u.`id`          AS `用户ID`,
    u.`username`    AS `用户名`,
    u.`role_id`     AS `角色ID`,
    r.`role_name`   AS `角色名`
FROM `user` u
LEFT JOIN `role` r
    ON u.`role_id` = r.`id`
ORDER BY u.`id` ASC;


-- ------------------------------------------------------------
-- 2.3 [INNER JOIN 三表] 查询用户-角色-权限完整 RBAC 关联
--    关联关系：user.role_id = role.id AND role.permission_id = permission.id
--    用途：构建完整的"用户→角色→权限"映射，用于权限校验与审计
-- ------------------------------------------------------------
SELECT
    u.`id`                  AS `用户ID`,
    u.`username`            AS `用户名`,
    r.`id`                  AS `角色ID`,
    r.`role_name`           AS `角色名`,
    p.`id`                  AS `权限ID`,
    p.`permission_name`     AS `权限名`,
    p.`permission_description` AS `权限描述`
FROM `user` u
INNER JOIN `role` r
    ON u.`role_id` = r.`id`
INNER JOIN `permission` p
    ON r.`permission_id` = p.`id`
ORDER BY u.`id` ASC, p.`id` ASC;


-- ------------------------------------------------------------
-- 2.4 [LEFT JOIN 三表] 查询所有用户及其角色、权限信息（含未分配项）
--    关联关系：user LEFT JOIN role LEFT JOIN permission
--    用途：全量用户清单，即使角色或权限缺失也保留用户记录，便于发现数据缺口
-- ------------------------------------------------------------
SELECT
    u.`id`                  AS `用户ID`,
    u.`username`            AS `用户名`,
    u.`is_disabled`         AS `用户是否禁用`,
    r.`role_name`           AS `角色名`,
    r.`is_disabled`         AS `角色是否禁用`,
    p.`permission_name`     AS `权限名`,
    p.`is_disabled`         AS `权限是否禁用`
FROM `user` u
LEFT JOIN `role` r
    ON u.`role_id` = r.`id`
LEFT JOIN `permission` p
    ON r.`permission_id` = p.`id`
ORDER BY u.`id` ASC;


-- ------------------------------------------------------------
-- 2.5 [INNER JOIN 带过滤] 查询所有启用的"用户-角色-权限"完整链路
--    关联关系：三表 INNER JOIN，且三者 is_disabled 均为 0
--    用途：获取系统中所有"有效"的权限链路，用于运行时权限校验白名单
-- ------------------------------------------------------------
SELECT
    u.`username`            AS `用户名`,
    r.`role_name`           AS `角色名`,
    p.`permission_name`     AS `权限名`
FROM `user` u
INNER JOIN `role` r
    ON u.`role_id` = r.`id`
   AND r.`is_disabled` = 0
INNER JOIN `permission` p
    ON r.`permission_id` = p.`id`
   AND p.`is_disabled` = 0
WHERE u.`is_disabled` = 0
ORDER BY p.`permission_name` ASC, r.`role_name` ASC, u.`username` ASC;


-- ------------------------------------------------------------
-- 2.6 [多表 JOIN 含统计表] 查询用户及其角色、权限，并关联喜好统计
--    关联关系：
--      user.role_id = role.id
--      role.permission_id = permission.id
--      preferences_statistics.name 与 user.preference 存在业务语义关联
--      （此处以 preferences_statistics.name = user.preference 做字符串关联演示）
--    用途：展示用户在 RBAC 体系下的身份信息及其偏好对应的最新统计数据
--    说明：user.preference 为 JSON 字符串，此处简化为字符串等值关联演示
-- ------------------------------------------------------------
SELECT
    u.`id`                  AS `用户ID`,
    u.`username`            AS `用户名`,
    r.`role_name`           AS `角色名`,
    p.`permission_name`     AS `权限名`,
    u.`preference`          AS `用户喜好`,
    ps.`user_count`         AS `该喜好用户数`,
    ps.`statistics_date`    AS `统计日期`
FROM `user` u
INNER JOIN `role` r
    ON u.`role_id` = r.`id`
INNER JOIN `permission` p
    ON r.`permission_id` = p.`id`
LEFT JOIN `preferences_statistics` ps
    ON ps.`name` = u.`preference`
ORDER BY u.`id` ASC, ps.`statistics_date` DESC;


-- ============================================================
-- 三、聚合函数示例（COUNT / SUM / AVG / MAX / MIN，含 GROUP BY / HAVING）
-- ============================================================

-- ------------------------------------------------------------
-- 3.1 [COUNT + GROUP BY] 统计每个角色下的用户数量
--    关联关系：按 user.role_id 分组，统计每组的用户数
--    用途：角色人员分布统计，辅助角色管理与权限规划
-- ------------------------------------------------------------
SELECT
    u.`role_id`              AS `角色ID`,
    r.`role_name`            AS `角色名`,
    COUNT(u.`id`)            AS `用户数量`
FROM `user` u
LEFT JOIN `role` r
    ON u.`role_id` = r.`id`
GROUP BY u.`role_id`, r.`role_name`
ORDER BY `用户数量` DESC, u.`role_id` ASC;


-- ------------------------------------------------------------
-- 3.2 [COUNT + GROUP BY + HAVING] 查询用户数大于 5 的角色
--    关联关系：按角色分组后，使用 HAVING 过滤 COUNT 结果
--    用途：识别"大角色"（用户数过多），便于拆分或优化角色设计
-- ------------------------------------------------------------
SELECT
    u.`role_id`              AS `角色ID`,
    r.`role_name`            AS `角色名`,
    COUNT(u.`id`)            AS `用户数量`
FROM `user` u
INNER JOIN `role` r
    ON u.`role_id` = r.`id`
GROUP BY u.`role_id`, r.`role_name`
HAVING COUNT(u.`id`) > 5
ORDER BY `用户数量` DESC;


-- ------------------------------------------------------------
-- 3.3 [SUM + GROUP BY] 统计每个喜好的累计用户数（跨所有日期）
--    关联关系：按 preferences_statistics.name 分组，累加 user_count
--    用途：喜好热度总榜，反映各喜好的长期累计受欢迎程度
-- ------------------------------------------------------------
SELECT
    `name`                          AS `喜好名`,
    SUM(`user_count`)               AS `累计用户数`,
    COUNT(*)                        AS `统计天数`
FROM `preferences_statistics`
GROUP BY `name`
ORDER BY `累计用户数` DESC;


-- ------------------------------------------------------------
-- 3.4 [AVG + GROUP BY] 计算每个喜好的日均用户数
--    关联关系：按 name 分组，求 user_count 的平均值
--    用途：喜好日均热度，剔除统计天数差异带来的偏差
-- ------------------------------------------------------------
SELECT
    `name`                          AS `喜好名`,
    AVG(`user_count`)               AS `日均用户数`,
    MIN(`user_count`)               AS `最低用户数`,
    MAX(`user_count`)               AS `最高用户数`
FROM `preferences_statistics`
GROUP BY `name`
ORDER BY `日均用户数` DESC;


-- ------------------------------------------------------------
-- 3.5 [MAX + MIN + GROUP BY] 查询每个喜好用户数的峰值与谷值及对应日期范围
--    关联关系：按 name 分组，取 user_count 的最大/最小值
--    用途：识别喜好的波动范围，辅助运营判断喜好的稳定性
-- ------------------------------------------------------------
SELECT
    `name`                          AS `喜好名`,
    MAX(`user_count`)               AS `峰值用户数`,
    MIN(`user_count`)               AS `谷值用户数`,
    MAX(`user_count`) - MIN(`user_count`) AS `波动幅度`,
    MAX(`statistics_date`)          AS `最新统计日期`,
    MIN(`statistics_date`)          AS `最早统计日期`
FROM `preferences_statistics`
GROUP BY `name`
ORDER BY `波动幅度` DESC;


-- ------------------------------------------------------------
-- 3.6 [COUNT + SUM + HAVING] 统计统计天数超过 30 天且累计用户数超过 1000 的喜好
--    关联关系：按 name 分组，同时用 HAVING 限制天数与累计用户数
--    用途：筛选"长期且热门"的喜好，作为重点运营对象
-- ------------------------------------------------------------
SELECT
    `name`                          AS `喜好名`,
    COUNT(*)                        AS `统计天数`,
    SUM(`user_count`)               AS `累计用户数`,
    ROUND(AVG(`user_count`), 2)     AS `日均用户数`
FROM `preferences_statistics`
GROUP BY `name`
HAVING COUNT(*) > 30
   AND SUM(`user_count`) > 1000
ORDER BY `累计用户数` DESC;


-- ------------------------------------------------------------
-- 3.7 [COUNT 多表] 统计每个权限下关联的角色数与用户数
--    关联关系：permission LEFT JOIN role LEFT JOIN user，按权限分组计数
--    用途：权限影响面分析，评估禁用某权限将影响多少角色与用户
-- ------------------------------------------------------------
SELECT
    p.`id`                          AS `权限ID`,
    p.`permission_name`             AS `权限名`,
    COUNT(DISTINCT r.`id`)          AS `关联角色数`,
    COUNT(DISTINCT u.`id`)          AS `关联用户数`
FROM `permission` p
LEFT JOIN `role` r
    ON r.`permission_id` = p.`id`
LEFT JOIN `user` u
    ON u.`role_id` = r.`id`
GROUP BY p.`id`, p.`permission_name`
ORDER BY `关联用户数` DESC, `关联角色数` DESC;


-- ------------------------------------------------------------
-- 3.8 [COUNT + GROUP BY 多字段] 按角色与用户禁用状态分组统计用户数
--    关联关系：按 role_id 与 user.is_disabled 双字段分组
--    用途：角色健康度分析，查看每个角色下正常/禁用用户的分布
-- ------------------------------------------------------------
SELECT
    u.`role_id`                     AS `角色ID`,
    r.`role_name`                   AS `角色名`,
    u.`is_disabled`                 AS `是否禁用`,
    COUNT(u.`id`)                   AS `用户数量`
FROM `user` u
LEFT JOIN `role` r
    ON u.`role_id` = r.`id`
GROUP BY u.`role_id`, r.`role_name`, u.`is_disabled`
ORDER BY u.`role_id` ASC, u.`is_disabled` ASC;


-- ============================================================
-- 四、综合示例（嵌套 + JOIN + 聚合 组合）
-- ============================================================

-- ------------------------------------------------------------
-- 4.1 [嵌套 + JOIN + 聚合] 查询"用户数最多的角色"下所有用户的完整 RBAC 信息
--    关联关系：
--      1) 子查询：找出 user 表中用户数最多的 role_id
--      2) 主查询：通过三表 JOIN 展示该角色下所有用户的角色、权限详情
--    用途：定位系统中"最大角色"的完整成员及其权限，用于重点审计
-- ------------------------------------------------------------
SELECT
    u.`id`                  AS `用户ID`,
    u.`username`            AS `用户名`,
    u.`is_disabled`         AS `用户是否禁用`,
    r.`role_name`           AS `角色名`,
    p.`permission_name`     AS `权限名`,
    p.`permission_description` AS `权限描述`
FROM `user` u
INNER JOIN `role` r
    ON u.`role_id` = r.`id`
INNER JOIN `permission` p
    ON r.`permission_id` = p.`id`
WHERE u.`role_id` = (
    SELECT `role_id`
    FROM `user`
    WHERE `role_id` <> 0
    GROUP BY `role_id`
    ORDER BY COUNT(*) DESC
    LIMIT 1
)
ORDER BY u.`id` ASC;


-- ------------------------------------------------------------
-- 4.2 [嵌套 + JOIN + 聚合 + HAVING] 查询"关联用户数超过平均值的角色"
--    及其对应的权限信息
--    关联关系：
--      1) 子查询：计算所有角色的平均用户数
--      2) 主查询：JOIN role 与 permission，筛选用户数大于平均值的角色
--    用途：识别"高负载角色"，结合其权限信息评估是否需要拆分角色
-- ------------------------------------------------------------
SELECT
    r.`id`                          AS `角色ID`,
    r.`role_name`                   AS `角色名`,
    r.`role_description`            AS `角色描述`,
    p.`permission_name`             AS `权限名`,
    cnt.`用户数量`                  AS `用户数量`
FROM `role` r
INNER JOIN `permission` p
    ON r.`permission_id` = p.`id`
INNER JOIN (
    SELECT `role_id`, COUNT(*) AS `用户数量`
    FROM `user`
    WHERE `role_id` <> 0
    GROUP BY `role_id`
) cnt
    ON cnt.`role_id` = r.`id`
WHERE cnt.`用户数量` > (
    SELECT AVG(`c`)
    FROM (
        SELECT COUNT(*) AS `c`
        FROM `user`
        WHERE `role_id` <> 0
        GROUP BY `role_id`
    ) AS `avg_tbl`
)
ORDER BY cnt.`用户数量` DESC;


-- ------------------------------------------------------------
-- 4.3 [嵌套 + JOIN + 聚合] 查询每个角色下"最新一天"的喜好统计汇总
--    关联关系：
--      1) 子查询：获取 preferences_statistics 中最新统计日期
--      2) 主查询：JOIN user 与 role，并关联该最新日期的喜好统计
--         以 user.preference 匹配 preferences_statistics.name
--    用途：展示各角色用户在最新统计日的喜好分布情况
-- ------------------------------------------------------------
SELECT
    r.`role_name`                   AS `角色名`,
    ps.`name`                       AS `喜好名`,
    ps.`user_count`                 AS `用户数`,
    ps.`statistics_date`            AS `统计日期`
FROM `user` u
INNER JOIN `role` r
    ON u.`role_id` = r.`id`
INNER JOIN `preferences_statistics` ps
    ON ps.`name` = u.`preference`
   AND ps.`statistics_date` = (
        SELECT MAX(`statistics_date`)
        FROM `preferences_statistics`
   )
GROUP BY r.`role_name`, ps.`name`, ps.`user_count`, ps.`statistics_date`
ORDER BY r.`role_name` ASC, ps.`user_count` DESC;


-- ------------------------------------------------------------
-- 4.4 [EXISTS + JOIN + 聚合] 查询"拥有启用权限"的角色及其用户数、权限名
--    关联关系：
--      1) EXISTS：角色对应的权限存在且启用（is_disabled=0）
--      2) JOIN：关联 user 统计用户数
--      3) 聚合：按角色分组计数
--    用途：筛选有效角色（权限可用）并统计其用户规模，用于权限治理
-- ------------------------------------------------------------
SELECT
    r.`id`                          AS `角色ID`,
    r.`role_name`                   AS `角色名`,
    p.`permission_name`             AS `权限名`,
    COUNT(u.`id`)                   AS `用户数量`
FROM `role` r
INNER JOIN `permission` p
    ON r.`permission_id` = p.`id`
LEFT JOIN `user` u
    ON u.`role_id` = r.`id`
WHERE r.`is_disabled` = 0
  AND EXISTS (
      SELECT 1
      FROM `permission` p2
      WHERE p2.`id` = r.`permission_id`
        AND p2.`is_disabled` = 0
  )
GROUP BY r.`id`, r.`role_name`, p.`permission_name`
ORDER BY `用户数量` DESC;


-- ------------------------------------------------------------
-- 4.5 [嵌套 + 多表 JOIN + 聚合 + HAVING] 综合查询：
--    查询"累计用户数排名前 3 的喜好"中，每个喜好在最新统计日
--    对应的用户数，以及偏好该喜好的用户所属角色分布
--    关联关系：
--      1) 子查询：按 name 累加 user_count 排序取前 3 喜好
--      2) 主查询：JOIN preferences_statistics（最新日期）、user、role
--    用途：热门喜好的最新热度与角色分布分析，辅助精准运营
-- ------------------------------------------------------------
SELECT
    ps.`name`                       AS `喜好名`,
    ps.`user_count`                 AS `最新用户数`,
    ps.`statistics_date`            AS `统计日期`,
    r.`role_name`                   AS `角色名`,
    COUNT(u.`id`)                   AS `该角色偏好用户数`
FROM `preferences_statistics` ps
LEFT JOIN `user` u
    ON u.`preference` = ps.`name`
LEFT JOIN `role` r
    ON u.`role_id` = r.`id`
WHERE ps.`statistics_date` = (
        SELECT MAX(`statistics_date`)
        FROM `preferences_statistics`
      )
  AND ps.`name` IN (
        SELECT `name`
        FROM (
            SELECT `name`, SUM(`user_count`) AS `total`
            FROM `preferences_statistics`
            GROUP BY `name`
            ORDER BY `total` DESC
            LIMIT 3
        ) AS `top3`
      )
GROUP BY ps.`name`, ps.`user_count`, ps.`statistics_date`, r.`role_name`
ORDER BY ps.`user_count` DESC, r.`role_name` ASC;


-- ------------------------------------------------------------
-- 4.6 [嵌套 + JOIN + 聚合] 查询没有任何用户关联的角色（孤儿角色）
--    及其权限信息
--    关联关系：
--      1) NOT EXISTS：不存在 user.role_id = role.id 的用户
--      2) LEFT JOIN permission：展示角色对应的权限（可能为空）
--    用途：发现"空角色"，便于清理或重新分配用户
-- ------------------------------------------------------------
SELECT
    r.`id`                          AS `角色ID`,
    r.`role_name`                   AS `角色名`,
    r.`role_description`            AS `角色描述`,
    p.`permission_name`             AS `权限名`,
    r.`is_disabled`                 AS `角色是否禁用`
FROM `role` r
LEFT JOIN `permission` p
    ON r.`permission_id` = p.`id`
WHERE NOT EXISTS (
    SELECT 1
    FROM `user` u
    WHERE u.`role_id` = r.`id`
)
ORDER BY r.`id` ASC;


-- ------------------------------------------------------------
-- 4.7 [嵌套 + 多表 JOIN + 聚合] 查询每个权限下"最近注册的用户"信息
--    关联关系：
--      1) 三表 JOIN：permission → role → user
--      2) 子查询：在每个权限对应的用户集合中取 create_time 最大的用户
--    用途：权限维度的"最新用户"审计，追踪权限分配的最近动态
-- ------------------------------------------------------------
SELECT
    p.`permission_name`             AS `权限名`,
    r.`role_name`                   AS `角色名`,
    u.`id`                          AS `用户ID`,
    u.`username`                    AS `用户名`,
    u.`create_time`                 AS `注册时间`
FROM `permission` p
INNER JOIN `role` r
    ON r.`permission_id` = p.`id`
INNER JOIN `user` u
    ON u.`role_id` = r.`id`
WHERE u.`id` = (
    SELECT `id`
    FROM `user` u2
    WHERE u2.`role_id` IN (
        SELECT `id` FROM `role` r2 WHERE r2.`permission_id` = p.`id`
    )
    ORDER BY `create_time` DESC
    LIMIT 1
)
ORDER BY p.`permission_name` ASC;


-- ============================================================
-- 脚本执行完毕
-- ============================================================
