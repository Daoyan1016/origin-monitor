# Origin Monitor

`Origin Monitor` 是把现有 `LGNS` 监控页整理成可维护前端工程的第一版，当前重点是：

- 保留原监控台的主要模块和信息结构
- 将单文件页面拆成 `HTML + CSS + JS + Data`
- 先以 `mock-data.json` 跑通静态版本
- 为后续接真实链上同步、境外数据镜像和国内部署预留清晰接口

## 目录结构

```text
project/
├─ index.html
├─ css/
│  └─ styles.css
├─ js/
│  ├─ app.js
│  ├─ data-service.js
│  └─ render.js
├─ data/
│  └─ mock-data.json
├─ lgns_monitor_v3_fixed.html
├─ update_site.bat
└─ README.md
```

说明：

- `index.html`：站点入口，保留语义化骨架
- `css/styles.css`：统一样式
- `js/app.js`：页面初始化、按钮交互、数据源切换
- `js/data-service.js`：数据读取层，已预留 `loadMockData()` 与 `loadLiveData()`
- `js/render.js`：各模块单独渲染函数
- `data/mock-data.json`：静态演示数据
- `lgns_monitor_v3_fixed.html`：历史单文件版本，保留作参考

## 已完成模块

- 顶部标题区
- 操作区
- 核心数据区
- DAI 储备可视化
- 交易量分析
- 大户追踪
- Treasury 监控
- 清仓规则
- 手动检查链接

## 本地运行

### 方式 1：直接打开

可以直接双击 `index.html` 打开。

说明：

- 某些浏览器在 `file://` 下不允许直接读取 `data/mock-data.json`
- 当前代码已经内置了降级 mock 数据
- 因此即使直接双击，页面也能展示
- 但如果你希望严格按 `mock-data.json` 读取，建议使用本地静态服务

### 方式 2：本地静态服务

如果你本机安装了 Python：

```powershell
cd "d:\我的\codex\26.3.10 lgns监测网页"
py -m http.server 8080
```

然后浏览器打开：

```text
http://localhost:8080/
```

这种方式下，页面会直接读取 `data/mock-data.json`。

## 数据层说明

当前项目已经把数据层从页面结构里拆出来。

### 已有接口

```js
loadMockData()
loadLiveData()
```

### 当前行为

- `loadMockData()`：优先请求 `data/mock-data.json`
- 如果浏览器处于 `file://` 环境且读取失败，会自动回退到 JS 内置 mock 数据
- `loadLiveData()`：当前只预留接口，尚未接入真实外部数据

### 后续接真实数据时建议

- 在 `loadLiveData()` 中请求你自己的同步接口
- 保持返回结构尽量与 `mock-data.json` 一致
- 尽量只改 `data-service.js`，不要把接口逻辑重新写回 HTML 或渲染层

## 按钮逻辑说明

- `开启浏览器通知`：当前已接通知权限申请
- `API Key`：当前仅保存到浏览器 `localStorage`
- `全部刷新`：当前重新拉取 mock 数据并刷新页面

这些交互都已经留好位置，后续接真实接口时不需要改页面结构。

## GitHub Pages 部署

当前项目已经适合直接部署为静态站点。

### 部署步骤

1. 推送代码到 GitHub 仓库
2. 打开仓库 `Settings`
3. 进入 `Pages`
4. 在 `Build and deployment` 中选择：
   - `Source`: `Deploy from a branch`
   - `Branch`: `main`
   - `Folder`: `/ (root)`
5. 保存后等待 GitHub Pages 构建完成

根据 GitHub 官方文档，Pages 可以直接从分支发布，推送后会自动部署：
<https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site>

### 更新站点

当前仓库里已有 `update_site.bat`。

改完文件后，双击运行即可完成：

- `git add .`
- `git commit`
- `git push`

GitHub Pages 会自动更新。

## 后续迁移到国内静态托管

这个工程已经按“纯静态前端”组织，后续迁移到国内部署时不需要改页面结构，只要改部署方式和数据源。

### 通用迁移方式

把以下文件整体上传到国内静态站点根目录即可：

- `index.html`
- `css/`
- `js/`
- `data/`

### 适合的国内部署方向

- 阿里云 OSS 静态网站
- 腾讯云 COS / 静态托管
- 国内云服务器 Nginx
- 已备案域名 + 国内 CDN

### 国内迁移时建议

- 前端继续保持纯静态
- 境外数据同步逻辑放到独立脚本或服务端任务里
- 国内站点只消费同步后的 JSON 数据
- 页面端只负责渲染，不直接承担复杂跨境抓取逻辑

### OSS / COS 注意点

- 阿里云 OSS 官方文档说明，若直接使用桶域名访问 HTML，浏览器可能会下载而不是直接渲染；通常需要启用静态网站托管并结合自定义域名使用：
  <https://www.alibabacloud.com/help/en/oss/user-guide/overview-71/>
- 腾讯云 COS 官方文档说明，可以用静态网站能力托管静态页面，但默认域名与预览行为存在限制，生产环境更适合自定义域名：
  <https://www.tencentcloud.com/document/product/436/9512>

因此，后续如果目标是“国内用户稳定直接访问”，推荐路线是：

1. 先保留当前 GitHub 仓库做代码源
2. 国内部署单独使用 OSS / COS / Nginx
3. 再把真实同步数据写入国内可访问的 JSON 文件

## 下一步建议

这版完成的是“可维护工程版”。

后续可以继续按下面顺序推进：

1. 在 `loadLiveData()` 中接真实接口
2. 增加国内同步脚本，定时写入 JSON
3. 将 `mock-data.json` 切换为同步生成的 `live-data.json`
4. 再接入国内静态托管与自动发布
