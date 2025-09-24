# Markdown Editor (Flask + Upstash Redis)

这是一个基于 **Flask** 的在线 Markdown 编辑器，支持用户注册 / 登录、图片上传、网页标题提取、Markdown 导出等功能。  
数据存储使用 **Upstash Redis**（云端 Redis 无需自建服务器）。  
支持一键部署到 **Vercel**。

---

## 🚀 功能

- 用户注册 / 登录（自动注册新用户）
- 图片上传与存储
- 自动提取网页标题
- 导出 Markdown 文件（打包成 ZIP 下载）
- 定时清理过期文件与用户数据（APScheduler）
- Upstash Redis 数据存储（替代原版的 SQLite）
- 支持 `.env` 环境变量配置

---

## 📦 安装依赖

```bash
pip install -r requirements.txt
```

---

## ⚙️ 环境变量配置

在项目根目录新建 `.env` 文件：

```env
FLASK_SECRET_KEY=change-it-when-it-is-production
# upstash数据库url
## 示例: rediss://default:your-token@your-host:6379
## 在网页端选择TCP复制地址
UPSTASH_REDIS_URL=your-upstash-url
# upstash数据库token
UPSTASH_REDIS_TOKEN=your-upstash-token
```

⚠️ 说明：

* `FLASK_SECRET_KEY`：Flask 会话密钥，可随便生成一个随机字符串。
* `UPSTASH_REDIS_URL`：在 Upstash 控制台获取，复制完整的连接 URL（推荐使用带密码的 rediss\:// 格式，这样无需额外写 TOKEN）。

---

## 🗄️ Upstash Redis 配置

1. 打开 [Upstash](https://console.upstash.com/) 控制台。
2. 点击 **Create Database**。
3. 选择 **Redis**，Region 建议选和 Vercel 项目同一区域。
4. 创建完成后，在 **Details** 里找到：

   * **REST URL**
   * **Password**
5. 复制 **rediss\://...** 格式的 URL，填入 `.env` 的 `UPSTASH_REDIS_URL`。

例如：

```
UPSTASH_REDIS_URL=rediss://default:abcdef1234567890@apn1-shiny-owl-12345.upstash.io:6379
```

## ▲ 部署到 Vercel

1. Fork 本项目到你的 GitHub。
2. 打开 [Vercel](https://vercel.com/)，点击 **New Project**。
3. 选择刚刚 Fork 的仓库。
4. 在 **Environment Variables** 里添加：

   * `FLASK_SECRET_KEY` → 随机密钥
   * `UPSTASH_REDIS_URL` → Upstash 复制的 Redis URL
5. 点击 Deploy。


---

## 🛠️ 常见问题

### 1. 报错 `unexpected keyword argument 'ssl'`

请确认 `redis-py` 版本 >= 4.2，并且连接 Upstash 时直接用：

```python
redis_client = redis.Redis.from_url(os.getenv("UPSTASH_REDIS_URL"))
```

### 2. 用户数据不持久？

这是因为 Vercel 部署无持久化存储，所以必须使用 **Upstash Redis** 才能保存用户信息。

---

## 📜 License

MIT

