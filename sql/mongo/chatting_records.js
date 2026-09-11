// ===================================================================
// 脚本名称：chatting_records.js
// 脚本描述：创建 AICode 数据库及对话记录集合，并生成必要索引
// 创建日期：2026-09-04
// 集合说明：存储用户与 AI 模型的对话记录
// ===================================================================

// -------------------------------------------------------------------
// 一、切换到 AICode 数据库
// 说明：MongoDB 中数据库在首次写入数据时自动创建，
//       此处通过 use 命令切换（在 mongo shell 中使用）
// -------------------------------------------------------------------
db = db.getSiblingDB('AICode');
print('========== 当前使用数据库：' + db.getName() + ' ==========');


// -------------------------------------------------------------------
// 二、判断并创建对话记录集合 chatting_records
// 集合字段说明：
//   user_id       : 用户id（INT 类型，对应 MongoDB 中 32 位整数）
//   chat_name     : 对话名称（字符串）
//   model_name    : 模型名称（字符串）
//   chat_content  : 对话内容（字符串，存储完整对话文本）
// -------------------------------------------------------------------
var collectionName = 'chatting_records';

// 判断集合是否已存在
var existingCollections = db.getCollectionNames();
if (existingCollections.indexOf(collectionName) === -1) {
    // 集合不存在，创建集合
    db.createCollection(collectionName, {
        // 使用 WiredTiger 存储引擎默认配置
        autoIndexId: true
    });
    print('[成功] 集合 "' + collectionName + '" 创建完成');
} else {
    print('[提示] 集合 "' + collectionName + '" 已存在，跳过创建');
}


// -------------------------------------------------------------------
// 三、判断并生成索引
// 索引设计说明：
//   1. user_id 索引    ：对话记录频繁按用户查询，必须建立索引
//   2. chat_name 索引  ：常按对话名称检索，建立索引提升查询效率
//   3. model_name 索引 ：按模型分类统计查询，建立索引
//   4. 复合索引 user_id + chat_name：按用户查询其指定对话的常用场景
//   5. 文本索引 chat_content：支持对话内容全文搜索（不建普通索引因内容过长）
// -------------------------------------------------------------------
var collection = db.getCollection(collectionName);

// 获取当前集合已存在的索引列表
var existingIndexes = collection.getIndexes().map(function (idx) {
    return idx.name;
});

// 定义需要创建的索引列表
var indexesToCreate = [
    {
        keys: { user_id: 1 },
        options: { name: 'idx_user_id', background: true },
        comment: '用户id单字段索引（升序），加速按用户查询对话记录'
    },
    {
        keys: { chat_name: 1 },
        options: { name: 'idx_chat_name', background: true },
        comment: '对话名称单字段索引，加速按对话名称检索'
    },
    {
        keys: { model_name: 1 },
        options: { name: 'idx_model_name', background: true },
        comment: '模型名称单字段索引，加速按模型分类统计'
    },
    {
        keys: { user_id: 1, chat_name: 1 },
        options: { name: 'idx_user_id_chat_name', background: true },
        comment: '用户id与对话名称复合索引，加速按用户查询指定对话'
    },
    {
        keys: { chat_content: 'text' },
        options: { name: 'idx_chat_content_text', background: true },
        comment: '对话内容文本索引，支持全文搜索（内容字段不建普通索引）'
    }
];

// 遍历创建索引
indexesToCreate.forEach(function (indexItem) {
    if (existingIndexes.indexOf(indexItem.options.name) === -1) {
        // 索引不存在，创建索引
        collection.createIndex(indexItem.keys, indexItem.options);
        print('[成功] 索引 "' + indexItem.options.name + '" 创建完成 —— ' + indexItem.comment);
    } else {
        print('[提示] 索引 "' + indexItem.options.name + '" 已存在，跳过创建');
    }
});


// -------------------------------------------------------------------
// 四、输出执行结果汇总
// -------------------------------------------------------------------
print('========== 执行结果汇总 ==========');
print('数据库：' + db.getName());
print('集合：' + collectionName);
print('当前集合索引列表：');
printjson(collection.getIndexes());
print('========== 脚本执行完毕 ==========');
