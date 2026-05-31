# Dify API 配置

## 部署地址

```
DIFY_BASE_URL=http://localhost/v1
```

## Agent API Key

| Agent | API Key |
|-------|---------|
| 单餐分析 (Chatflow) | `app-7KEiqiEnPZXO6XnsvfoziUVf` |
| 每日总结 (Workflow) | `app-vzVHXSMqSYkSXEk6YGinzGJK` |
| 每周分析 (Workflow) | `app-fRlZkywhdY44j2GnsUOW6whL` |

## 运行配置

实际运行时在项目根目录创建 `.env.local` 文件，内容如下：

```
DIFY_BASE_URL=http://localhost/v1
DIFY_API_KEY_MEAL=app-7KEiqiEnPZXO6XnsvfoziUVf
DIFY_API_KEY_DAILY=app-vzVHXSMqSYkSXEk6YGinzGJK
DIFY_API_KEY_WEEKLY=app-fRlZkywhdY44j2GnsUOW6whL
```

> `.env.local` 已在 `.gitignore` 中排除，不会提交到 git。
