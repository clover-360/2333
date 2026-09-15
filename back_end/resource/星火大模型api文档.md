# 星火大模型 API 文档

## 接口地址

```
https://spark-api-open.xf-yun.com/v1/chat/completions
```

## 请求方式

POST

## 请求头

```
Authorization: Bearer <你的APIPassword>
Content-Type: application/json
```

> **注意**：`<你的APIPassword>` 需要替换成你在星火平台申请的 API Password。

## 可用模型

- `generalv3.5`：星火大模型 3.5 版本
- `generalv3`：星火大模型 3.0 版本
- `4.0Ultra`：星火大模型 4.0 Ultra 版本

## 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `model` | string | 是 | 模型名称，如 `generalv3.5` |
| `messages` | array | 是 | 对话消息列表 |
| `messages[].role` | string | 是 | 角色，可选 `user`、`assistant`、`system` |
| `messages[].content` | string | 是 | 消息内容 |
| `stream` | boolean | 否 | 是否流式输出，默认 `false` |
| `temperature` | float | 否 | 温度，控制随机性，范围 0~1 |
| `max_tokens` | int | 否 | 最大输出 token 数 |

## 非流式请求示例

```python
import requests

url = "https://spark-api-open.xf-yun.com/v1/chat/completions"
data = {
    "model": "generalv3.5",
    "messages": [
        {
            "role": "user",
            "content": "你是谁"
        }
    ]
}
header = {
    "Authorization": "Bearer 123456"  # 替换为你的APIPassword
}
response = requests.post(url, headers=header, json=data)
print(response.text)
```

## 流式请求示例

```python
import requests

url = "https://spark-api-open.xf-yun.com/v1/chat/completions"
data = {
    "model": "generalv3.5",
    "messages": [
        {
            "role": "user",
            "content": "你是谁"
        }
    ],
    "stream": True
}
header = {
    "Authorization": "Bearer HvHgMQsoacUJBLETrAZG:PDSjOvtqzmHLFnITTNmO"  # 替换为你的APIPassword
}
response = requests.post(url, headers=header, json=data, stream=True)

# 流式响应解析示例
response.encoding = "utf-8"
for line in response.iter_lines(decode_unicode="utf-8"):
    print(line)
```

## 响应格式

### 非流式响应

```json
{
    "code": 0,
    "message": "Success",
    "data": {
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": "我是星火认知大模型..."
                }
            }
        ]
    }
}
```

### 流式响应

每行以 `data: ` 开头，内容为 JSON 片段，以 `data: [DONE]` 结束。

## 注意事项

1. `Authorization` 头中的 `Bearer ` 后面必须跟你在星火平台申请的 **API Password**，不是 API Key
2. 不同的模型名对应不同的能力，`generalv3.5` 是常用版本
3. 流式输出适合实时显示，非流式适合一次性获取完整回答