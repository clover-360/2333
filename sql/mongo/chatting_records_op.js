// ===================================================================
// 脚本名称：chatting_records_op.js
// 脚本描述：对话记录集合（chatting_records）的增删改查操作示例
// 创建日期：2026-09-07
// 集合说明：存储用户与 AI 模型的对话记录
// 字段说明：
//   user_id       : 用户id（INT 类型，32 位整数）
//   chat_name     : 对话名称（字符串）
//   model_name    : 模型名称（字符串）
//   chat_content  : 对话内容（字符串，存储完整对话文本）
// 索引说明：
//   idx_user_id            : user_id 升序索引
//   idx_chat_name          : chat_name 升序索引
//   idx_model_name         : model_name 升序索引
//   idx_user_id_chat_name  : user_id + chat_name 复合索引
//   idx_chat_content_text  : chat_content 文本索引（支持全文搜索）
// ===================================================================

// -------------------------------------------------------------------
// 〇、切换到 AICode 数据库并获取集合引用
// -------------------------------------------------------------------
db = db.getSiblingDB('AICode');
print('========== 当前使用数据库：' + db.getName() + ' ==========');

var collection = db.getCollection('chatting_records');


// ===================================================================
// 一、插入操作（Create）
// ===================================================================

// -------------------------------------------------------------------
// 1.1 单条插入 insertOne
// 用途：向对话记录集合中插入一条新的对话记录
// 场景：用户开启一个新对话时，保存首条对话信息
// -------------------------------------------------------------------
var insertOneResult = collection.insertOne({
    user_id: NumberInt(1001),           // 用户id，使用 NumberInt 保证 32 位整数存储
    chat_name: '如何使用 MongoDB 索引', // 对话名称
    model_name: 'glm-5.2',              // 模型名称
    chat_content: '请问 MongoDB 中复合索引和单字段索引有什么区别？' // 对话内容
});
print('[插入-单条] insertOne 写入结果：');
printjson(insertOneResult);
// insertOne 返回结果包含 acknowledged 与 insertedId 字段


// -------------------------------------------------------------------
// 1.2 批量插入 insertMany
// 用途：一次性插入多条对话记录，减少网络往返开销
// 场景：批量导入历史对话记录、用户连续多轮对话一次性落库
// -------------------------------------------------------------------
var insertManyResult = collection.insertMany([
    {
        user_id: NumberInt(1001),
        chat_name: '如何使用 MongoDB 索引',
        model_name: 'glm-5.2',
        chat_content: '复合索引遵循最左前缀原则，单字段索引只针对单个字段。'
    },
    {
        user_id: NumberInt(1002),
        chat_name: 'React 性能优化方案',
        model_name: 'glm-5.2',
        chat_content: '可以使用 React.memo、useMemo、useCallback 优化渲染性能。'
    },
    {
        user_id: NumberInt(1003),
        chat_name: 'SQL 优化建议',
        model_name: 'deepseek-v3',
        chat_content: '通过添加合适索引、避免 SELECT *、减少子查询等方式优化 SQL。'
    },
    {
        user_id: NumberInt(1001),
        chat_name: 'MongoDB 聚合管道',
        model_name: 'glm-5.2',
        chat_content: '聚合管道通过 $match、$group、$project 等阶段处理数据。'
    }
]);
print('[插入-批量] insertMany 写入结果：');
printjson(insertManyResult);
// insertMany 返回结果包含 acknowledged 与 insertedIds 字段（id 映射表）


// ===================================================================
// 二、删除操作（Delete）
// ===================================================================

// -------------------------------------------------------------------
// 2.1 单条删除 deleteOne
// 用途：按条件删除一条对话记录（即使匹配多条也只删第一条）
// 场景：用户删除某个具体的对话记录
// 注意：删除前建议先查询确认，避免误删
// -------------------------------------------------------------------
var deleteOneResult = collection.deleteOne({
    user_id: NumberInt(1001),
    chat_name: '如何使用 MongoDB 索引'
});
print('[删除-单条] deleteOne 删除结果（matchedCount/deletedCount）：');
printjson(deleteOneResult);


// -------------------------------------------------------------------
// 2.2 批量删除 deleteMany
// 用途：按条件批量删除对话记录
// 场景：清理某用户的所有对话记录、清理指定模型的过期对话
// 警告：条件为空文档 {} 会删除集合全部文档，请谨慎使用
// -------------------------------------------------------------------
var deleteManyResult = collection.deleteMany({
    user_id: NumberInt(1003)
});
print('[删除-批量] deleteMany 删除结果（按用户id=1003 删除其所有对话）：');
printjson(deleteManyResult);


// -------------------------------------------------------------------
// 2.3 按复合条件批量删除
// 用途：删除指定用户在指定模型下的全部对话记录
// 场景：用户切换模型后清理旧模型的历史对话
// -------------------------------------------------------------------
var deleteByCompositeResult = collection.deleteMany({
    user_id: NumberInt(1002),
    model_name: 'glm-5.2'
});
print('[删除-复合条件] deleteMany 删除结果（user_id=1002 且 model_name=glm-5.2）：');
printjson(deleteByCompositeResult);


// ===================================================================
// 三、修改操作（Update）
// ===================================================================

// -------------------------------------------------------------------
// 3.1 单条修改 updateOne（$set 操作符）
// 用途：修改匹配到的第一条文档的指定字段
// 场景：用户重命名对话、修改对话内容
// $set：仅更新指定字段，不影响其他字段
// -------------------------------------------------------------------
var updateOneSetResult = collection.updateOne(
    { user_id: NumberInt(1001), chat_name: 'MongoDB 聚合管道' }, // 查询条件
    { $set: { chat_name: 'MongoDB 聚合管道详解' } }                // 更新内容
);
print('[修改-单条-$set] updateOne 结果（matchedCount/modifiedCount）：');
printjson(updateOneSetResult);


// -------------------------------------------------------------------
// 3.2 批量修改 updateMany（$set 操作符）
// 用途：批量修改满足条件的所有文档的指定字段
// 场景：模型名称变更后批量更新历史对话记录中的 model_name 字段
// -------------------------------------------------------------------
var updateManySetResult = collection.updateMany(
    { model_name: 'glm-5.2' },
    { $set: { model_name: 'glm-5.3' } }
);
print('[修改-批量-$set] updateMany 结果（将 model_name=glm-5.2 全部更新为 glm-5.3）：');
printjson(updateManySetResult);


// -------------------------------------------------------------------
// 3.3 单条修改 updateOne（$inc 操作符）
// 用途：对数值字段执行原子自增操作
// 场景：统计对话被访问次数、点赞次数等数值字段
// 说明：本集合无数值字段，此处演示 $inc 用法，新增 visit_count 字段
// -------------------------------------------------------------------
var updateOneIncResult = collection.updateOne(
    { user_id: NumberInt(1001), chat_name: 'MongoDB 聚合管道详解' },
    { $inc: { visit_count: NumberInt(1) } } // 访问次数 +1，字段不存在时自动创建并赋值为增量值
);
print('[修改-单条-$inc] updateOne 结果（visit_count 自增 1）：');
printjson(updateOneIncResult);


// -------------------------------------------------------------------
// 3.4 单条修改 updateOne（多操作符组合 $set + $inc + $currentDate）
// 用途：一次更新中组合多种更新操作符
// 场景：修改对话内容的同时更新访问次数与最后修改时间
// $currentDate：将字段值设置为当前服务器时间
// -------------------------------------------------------------------
var updateMultiOpResult = collection.updateOne(
    { user_id: NumberInt(1001), chat_name: 'MongoDB 聚合管道详解' },
    {
        $set: { chat_content: '聚合管道是 MongoDB 强大的数据处理工具，支持多阶段流式处理。' },
        $inc: { visit_count: NumberInt(1) },
        $currentDate: { last_modified: true } // 自动写入当前时间到 last_modified 字段
    }
);
print('[修改-多操作符组合] updateOne 结果（$set + $inc + $currentDate）：');
printjson(updateMultiOpResult);


// -------------------------------------------------------------------
// 3.5 单条修改 updateOne（$unset 操作符）
// 用途：删除文档中的指定字段
// 场景：移除对话记录中的临时字段（如 visit_count）
// -------------------------------------------------------------------
var updateUnsetResult = collection.updateOne(
    { user_id: NumberInt(1001), chat_name: 'MongoDB 聚合管道详解' },
    { $unset: { visit_count: '' } } // 值随意写，$unset 只关心字段名
);
print('[修改-单条-$unset] updateOne 结果（移除 visit_count 字段）：');
printjson(updateUnsetResult);


// -------------------------------------------------------------------
// 3.6 单条修改 updateOne（$rename 操作符）
// 用途：重命名文档中的字段名
// 场景：字段命名规范化、数据库迁移
// -------------------------------------------------------------------
var updateRenameResult = collection.updateOne(
    { user_id: NumberInt(1001), chat_name: 'MongoDB 聚合管道详解' },
    { $rename: { 'last_modified': 'update_time' } }
);
print('[修改-单条-$rename] updateOne 结果（将 last_modified 重命名为 update_time）：');
printjson(updateRenameResult);


// -------------------------------------------------------------------
// 3.7 批量修改 updateMany（$mul 操作符）
// 用途：对数值字段执行原子乘法操作
// 场景：批量调整数值字段的值（如积分翻倍）
// 说明：本集合无数值字段，此处演示 $mul 用法
// -------------------------------------------------------------------
var updateManyMulResult = collection.updateMany(
    { visit_count: { $exists: true } },
    { $mul: { visit_count: 2 } } // visit_count 字段值乘以 2
);
print('[修改-批量-$mul] updateMany 结果（visit_count 字段值翻倍）：');
printjson(updateManyMulResult);


// -------------------------------------------------------------------
// 3.8 upsert 操作（updateOne + upsert:true）
// 用途：存在则更新，不存在则插入
// 场景：用户对话记录幂等写入，避免重复创建
// -------------------------------------------------------------------
var upsertResult = collection.updateOne(
    { user_id: NumberInt(1004), chat_name: 'upsert 演示对话' },
    {
        $set: {
            model_name: 'glm-5.2',
            chat_content: '若该对话不存在则新建，存在则更新内容。'
        },
        $setOnInsert: { create_time: new Date() } // 仅在插入时设置创建时间，更新时不修改
    },
    { upsert: true }
);
print('[修改-upsert] updateOne upsert 结果（upsertedId 表示新插入文档的 _id）：');
printjson(upsertResult);


// ===================================================================
// 四、查询操作（Read）
// ===================================================================

// -------------------------------------------------------------------
// 4.1 单条查询 findOne
// 用途：按条件查询单条文档，返回匹配的第一条
// 场景：根据用户id与对话名称获取具体对话内容
// -------------------------------------------------------------------
var findOneResult = collection.findOne({
    user_id: NumberInt(1001),
    chat_name: 'MongoDB 聚合管道详解'
});
print('[查询-单条] findOne 结果：');
printjson(findOneResult);


// -------------------------------------------------------------------
// 4.2 列表查询 find
// 用途：按条件查询多条文档，返回游标
// 场景：查询某用户的所有对话记录
// 说明：find 返回游标，需通过 toArray() 转为数组打印
// -------------------------------------------------------------------
var findListResult = collection.find({
    user_id: NumberInt(1001)
}).toArray();
print('[查询-列表] find 结果（user_id=1001 的所有对话）：');
printjson(findListResult);


// -------------------------------------------------------------------
// 4.3 条件查询（多种查询操作符）
// 用途：使用 $gt、$lt、$in、$regex 等操作符构建复杂查询条件
// 场景：查询用户id 在指定范围内、模型名称匹配多个值、对话名称模糊匹配
// -------------------------------------------------------------------
var complexQueryResult = collection.find({
    user_id: { $gte: NumberInt(1001), $lte: NumberInt(1002) }, // 用户id 在 [1001, 1002] 范围内
    model_name: { $in: ['glm-5.2', 'glm-5.3', 'deepseek-v3'] }, // 模型名称在给定列表中
    chat_name: { $regex: /MongoDB/i }                            // 对话名称包含 MongoDB（不区分大小写）
}).toArray();
print('[查询-条件] find 复合条件查询结果：');
printjson(complexQueryResult);


// -------------------------------------------------------------------
// 4.4 分页查询（limit + skip）
// 用途：实现分页查询，limit 限制返回条数，skip 跳过指定条数
// 场景：前端对话列表分页展示，每页 10 条，查询第 2 页
// 公式：skip = (页码 - 1) * 每页条数
// -------------------------------------------------------------------
var pageNum = 2;      // 当前页码
var pageSize = 10;    // 每页条数
var pagedResult = collection.find({
    user_id: NumberInt(1001)
})
    .sort({ _id: -1 })             // 按 _id 降序排序（最新在前）
    .skip((pageNum - 1) * pageSize) // 跳过前 (页码-1)*每页条数 条
    .limit(pageSize)                // 限制返回每页条数
    .toArray();
print('[查询-分页] find 分页查询结果（第 ' + pageNum + ' 页，每页 ' + pageSize + ' 条）：');
printjson(pagedResult);


// -------------------------------------------------------------------
// 4.5 排序查询 sort
// 用途：按指定字段升序（1）或降序（-1）排序
// 场景：按用户id 升序、对话名称降序排列
// -------------------------------------------------------------------
var sortResult = collection.find({})
    .sort({ user_id: 1, chat_name: -1 }) // user_id 升序，相同 user_id 下 chat_name 降序
    .limit(20)
    .toArray();
print('[查询-排序] find 排序查询结果（user_id 升序，chat_name 降序）：');
printjson(sortResult);


// -------------------------------------------------------------------
// 4.6 投影查询 projection
// 用途：只返回指定字段，减少网络传输与内存占用
// 场景：列表页只需展示对话名称与模型名称，不需要完整对话内容
// 语法：projection 中 1 表示包含，0 表示排除；_id 默认返回，需显式排除
// -------------------------------------------------------------------
var projectionResult = collection.find(
    { user_id: NumberInt(1001) },
    { chat_name: 1, model_name: 1, _id: 0 } // 仅返回 chat_name 与 model_name，排除 _id
).toArray();
print('[查询-投影] find 投影查询结果（仅返回 chat_name 与 model_name）：');
printjson(projectionResult);


// -------------------------------------------------------------------
// 4.7 全文搜索（基于文本索引 idx_chat_content_text）
// 用途：利用 $text 操作符对 chat_content 字段执行全文搜索
// 场景：用户在历史对话中搜索包含特定关键词的记录
// 前提：集合已建立 chat_content 字段的文本索引
// -------------------------------------------------------------------
var textSearchResult = collection.find(
    { $text: { $search: '索引 优化' } } // 搜索同时包含"索引"或"优化"的对话内容
).toArray();
print('[查询-全文搜索] find $text 全文搜索结果（搜索"索引 优化"）：');
printjson(textSearchResult);


// -------------------------------------------------------------------
// 4.8 计数查询 countDocuments
// 用途：统计满足条件的文档数量
// 场景：统计某用户的对话总数、统计指定模型的对话数量
// -------------------------------------------------------------------
var totalCount = collection.countDocuments({});
print('[查询-计数] countDocuments 全部文档数：' + totalCount);

var userChatCount = collection.countDocuments({ user_id: NumberInt(1001) });
print('[查询-计数] countDocuments user_id=1001 的对话数：' + userChatCount);


// -------------------------------------------------------------------
// 4.9 去重查询 distinct
// 用途：返回指定字段的所有去重值
// 场景：获取所有不重复的模型名称、获取某用户的所有对话名称
// -------------------------------------------------------------------
var distinctModels = collection.distinct('model_name', {});
print('[查询-去重] distinct model_name 所有不重复的模型名称：');
printjson(distinctModels);

var distinctChatNames = collection.distinct('chat_name', { user_id: NumberInt(1001) });
print('[查询-去重] distinct chat_name user_id=1001 的所有不重复对话名称：');
printjson(distinctChatNames);


// ===================================================================
// 五、聚合管道操作（Aggregate）
// ===================================================================

// -------------------------------------------------------------------
// 5.1 聚合-基础统计（$match + $group + $count）
// 用途：统计每个用户的对话记录数量
// 场景：后台统计报表，展示各用户对话活跃度
// $match：过滤文档（相当于 find 的查询条件）
// $group：按指定字段分组，$sum:1 表示每匹配一条计数 +1
// -------------------------------------------------------------------
var groupByUserResult = collection.aggregate([
    { $match: { user_id: { $gte: NumberInt(1001) } } }, // 仅统计 user_id >= 1001 的记录
    {
        $group: {
            _id: '$user_id',          // 按 user_id 分组
            chat_count: { $sum: 1 },  // 统计每组的文档数量
            chat_names: { $push: '$chat_name' } // 收集每组的对话名称到数组
        }
    },
    { $sort: { chat_count: -1 } } // 按对话数量降序排列
]).toArray();
print('[聚合-基础统计] aggregate 按用户分组统计对话数量：');
printjson(groupByUserResult);


// -------------------------------------------------------------------
// 5.2 聚合-按模型分类统计（$group + $sum + $avg）
// 用途：统计每个模型被使用的次数与平均用户id（演示 $avg 用法）
// 场景：分析各 AI 模型的使用情况
// -------------------------------------------------------------------
var groupByModelResult = collection.aggregate([
    {
        $group: {
            _id: '$model_name',             // 按 model_name 分组
            use_count: { $sum: 1 },         // 使用次数
            avg_user_id: { $avg: '$user_id' }, // 平均用户id（演示 $avg）
            max_user_id: { $max: '$user_id' }, // 最大用户id（演示 $max）
            min_user_id: { $min: '$user_id' }  // 最小用户id（演示 $min）
        }
    },
    { $sort: { use_count: -1 } }
]).toArray();
print('[聚合-按模型统计] aggregate 按模型分组统计使用情况：');
printjson(groupByModelResult);


// -------------------------------------------------------------------
// 5.3 聚合-投影转换（$project）
// 用途：对查询结果进行字段重命名、字段裁剪、计算新字段
// 场景：返回给前端时字段名转换、隐藏敏感字段
// -------------------------------------------------------------------
var projectResult = collection.aggregate([
    { $match: { user_id: NumberInt(1001) } },
    {
        $project: {
            _id: 0,                          // 排除 _id
            userId: '$user_id',              // 重命名为 userId（驼峰）
            chatName: '$chat_name',          // 重命名为 chatName
            modelName: '$model_name',        // 重命名为 modelName
            contentLength: { $strLenCP: '$chat_content' } // 计算对话内容字符长度
        }
    },
    { $limit: 10 }
]).toArray();
print('[聚合-投影转换] aggregate $project 字段重命名与计算：');
printjson(projectResult);


// -------------------------------------------------------------------
// 5.4 聚合-分页（$skip + $limit）
// 用途：在聚合管道中实现分页
// 场景：聚合查询结果分页展示
// 注意：$skip 必须在 $limit 之前
// -------------------------------------------------------------------
var aggregatePagedResult = collection.aggregate([
    { $match: { user_id: NumberInt(1001) } },
    { $sort: { _id: -1 } },
    { $skip: 0 },   // 跳过前 0 条（第 1 页）
    { $limit: 5 }   // 限制返回 5 条
]).toArray();
print('[聚合-分页] aggregate $skip + $limit 分页结果：');
printjson(aggregatePagedResult);


// -------------------------------------------------------------------
// 5.5 聚合-多阶段复杂统计（$match + $group + $project + $sort + $limit）
// 用途：组合多个聚合阶段完成复杂业务统计
// 场景：统计每个用户使用每个模型的对话数量，并取对话数前 3 的组合
// -------------------------------------------------------------------
var complexAggregateResult = collection.aggregate([
    // 阶段1：过滤有效记录
    { $match: { user_id: { $gte: NumberInt(1001) } } },
    // 阶段2：按 user_id 与 model_name 复合分组
    {
        $group: {
            _id: { user_id: '$user_id', model_name: '$model_name' },
            chat_count: { $sum: 1 },
            chat_list: { $push: '$chat_name' }
        }
    },
    // 阶段3：投影整理输出字段
    {
        $project: {
            _id: 0,
            user_id: '$_id.user_id',
            model_name: '$_id.model_name',
            chat_count: 1,
            chat_list: 1
        }
    },
    // 阶段4：按对话数量降序排序
    { $sort: { chat_count: -1 } },
    // 阶段5：仅返回前 3 条
    { $limit: 3 }
]).toArray();
print('[聚合-多阶段] aggregate 复杂统计结果（用户-模型使用情况 Top3）：');
printjson(complexAggregateResult);


// -------------------------------------------------------------------
// 5.6 聚合-按对话名称分组并统计内容长度（$group + $sum + $push）
// 用途：统计每个对话名称下的对话轮数与总内容长度
// 场景：分析对话深度与内容丰富度
// -------------------------------------------------------------------
var chatStatsResult = collection.aggregate([
    {
        $group: {
            _id: '$chat_name',
            round_count: { $sum: 1 },                       // 对话轮数
            user_ids: { $addToSet: '$user_id' },            // 参与该对话的用户集合（去重）
            models: { $addToSet: '$model_name' }            // 该对话使用的模型集合（去重）
        }
    },
    {
        $project: {
            _id: 0,
            chat_name: '$_id',
            round_count: 1,
            user_count: { $size: '$user_ids' },             // 参与用户数
            model_count: { $size: '$models' },              // 使用模型数
            user_ids: 1,
            models: 1
        }
    },
    { $sort: { round_count: -1 } }
]).toArray();
print('[聚合-对话统计] aggregate 按对话名称分组统计：');
printjson(chatStatsResult);


// -------------------------------------------------------------------
// 5.7 聚合-$unwind 展开数组（演示用法）
// 用途：将数组字段拆分为多个文档，每条对应数组中的一个元素
// 场景：对 $group 生成的数组字段进一步分析
// 说明：此处先按用户分组生成 chat_names 数组，再 $unwind 展开统计
// -------------------------------------------------------------------
var unwindResult = collection.aggregate([
    { $match: { user_id: NumberInt(1001) } },
    {
        $group: {
            _id: '$user_id',
            chat_names: { $push: '$chat_name' }
        }
    },
    { $unwind: '$chat_names' }, // 展开 chat_names 数组，每个元素生成一条文档
    {
        $project: {
            _id: 0,
            user_id: '$_id',
            chat_name: '$chat_names'
        }
    }
]).toArray();
print('[聚合-$unwind] aggregate 数组展开结果：');
printjson(unwindResult);


// -------------------------------------------------------------------
// 5.8 聚合-$count 阶段
// 用途：在聚合管道中统计文档数量
// 场景：统计满足条件的文档总数（等价于 countDocuments）
// -------------------------------------------------------------------
var countStageResult = collection.aggregate([
    { $match: { user_id: NumberInt(1001) } },
    { $count: 'total_chat_count' } // 将统计结果输出到 total_chat_count 字段
]).toArray();
print('[聚合-$count] aggregate $count 统计结果：');
printjson(countStageResult);


// ===================================================================
// 六、执行结果汇总
// ===================================================================
print('========== 脚本执行完毕 ==========');
print('数据库：' + db.getName());
print('集合：chatting_records');
print('当前集合索引列表：');
printjson(collection.getIndexes());
print('当前集合文档总数：' + collection.countDocuments({}));
