# SEO Links Pages Scrape Audit

一个基于 `Node.js + TypeScript` 的轻量 SEO CLI 工具，用于小型网站的：

- 站内页面抓取
- 页面结构与 SEO 信号审计

适用场景：

- 小于 `100` 页的网站
- 需要手动编辑 URL 列表再审计
- 想快速得到 CSV 结果做分析

---

## 1. 安装与准备

确保本机已安装：

- `Node.js 22+`
- `npm`

安装依赖：

```bash
npm install
```

---

## 2. 构建项目

构建 CLI：

```bash
npm run build
```

开发模式直接运行：

```bash
npm run dev -- --help
```

构建后可执行：

```bash
node dist/cli.js --help
```

---

## 3. CLI 命令

### 抓取页面

从一个种子 URL 开始抓取同域页面：

```bash
node dist/cli.js crawl https://example.com
```

可选参数：

```bash
node dist/cli.js crawl https://example.com --state-dir ./state --max-pages 100
```

参数说明：

- `--state-dir`：状态文件目录，默认 `./state`
- `--max-pages`：最大抓取页数，默认 `100`

---

### 审计页面

读取 URL 列表并输出 CSV：

```bash
node dist/cli.js audit ./state/done.txt
```

可选参数：

```bash
node dist/cli.js audit ./state/done.txt --output ./state/audit.csv
```

```bash
node dist/cli.js audit ./state/done.txt --output ./state/audit.csv --origin https://example.com
```

参数说明：

- `--output`：输出 CSV 文件，默认 `./state/audit.csv`
- `--origin`：手动指定站点 origin；未传时默认使用输入文件第一条 URL 的 origin

---

## 4. 推荐使用流程

推荐按下面的标准流程使用：

```text
crawl -> 检查 done.txt -> 手动删掉不想审计的 URL -> audit -> 分析 CSV
```

示例：

### 第一步：抓取

```bash
node dist/cli.js crawl https://www.example.com
```

### 第二步：检查并编辑 URL 列表

打开：

```text
./state/done.txt
```

可以删除不想审计的页面，例如：

- 参数页
- 动态页
- 重复内容页

### 第三步：执行审计

```bash
node dist/cli.js audit ./state/done.txt
```

### 第四步：查看结果

打开：

```text
./state/audit.csv
```

---

## 5. 输出文件说明

抓取阶段会生成：

```text
state/
  queue.txt
  done.txt
  skipped.txt
  error.txt
```

审计阶段会生成：

```text
state/
  audit.csv
```

### 文件含义

- `queue.txt`：新发现并入队的 URL
- `done.txt`：成功抓取的页面 URL
- `skipped.txt`：被跳过的 URL 与原因
- `error.txt`：抓取或审计失败的页面与错误信息
- `audit.csv`：最终审计结果

---

## 6. `audit.csv` 主要字段

当前输出字段与仓库中的 `sample.csv` 对齐，主要包括：

- 页面基础信息：`url`, `title`, `description`, `canonical`, `isRedirect`, `size`
- Heading 结构：`h1Count`, `h1Text`, `h2Count`, `h2Text`, `h3Count`, `h3Text`
- 跟踪脚本：`ga4Count`, `ga4Ids`, `gtmCount`, `gtmIds`
- 结构化信号：`isBreadcrumb`, `isBlogPosting`, `isArticle`, `isFaq`, `isLogo`, `isSsr`, `countStructureData`

---

## 7. 工具当前行为

当前版本默认：

- 仅抓取同 origin 页面
- 自动跳过外链
- 自动跳过常见非 HTML 资源，例如 `.pdf`、`.jpg`、`.png`、`.zip`
- 自动去掉 URL 中的 `utm_*` 参数
- 自动去掉 fragment，例如 `#section`
- 单线程串行执行
- 单页失败不会中断整批任务

---

## 8. 常见命令

安装依赖：

```bash
npm install
```

运行测试：

```bash
npm test
```

构建：

```bash
npm run build
```

查看帮助：

```bash
node dist/cli.js --help
```

---

## 9. 注意事项

- 本工具不执行 JavaScript，不适合强依赖前端渲染的页面
- 更适合静态站点、内容站、企业站、小型产品站
- `isSsr` 和部分结构化字段为启发式判断，适合做快速排查，不代表搜索引擎级别的绝对判断

---

## 10. 一个完整示例

```bash
npm install
npm run build
node dist/cli.js crawl https://www.example.com
node dist/cli.js audit ./state/done.txt --output ./state/audit.csv
```

执行完成后查看：

```text
./state/audit.csv
```
