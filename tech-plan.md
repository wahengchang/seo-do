# SEO CLI 工具技术方案（`tech-plan.md`）

## 1. 背景与目标分析

### 1.1 项目定位

本项目是一个面向**个人使用场景**的小型 SEO CLI 工具，目标是对小规模网站进行：

1. 站内 URL 抓取
2. 页面级 SEO / 结构信号审计

根据 `Requirements.md`，该工具明确具备以下边界：

- 目标站点规模：小于 `100` 页
- 抓取并发：`1`，单线程串行执行
- 运行方式：命令行工具
- 使用优先级：简单、可维护、结果可解释、支持人工介入

这意味着该项目不应朝通用型爬虫平台发展，而应聚焦为一个**透明、可控、便于个人反复使用**的轻量审计工具。

### 1.2 需求目标拆解

从业务目标看，系统需要解决两个独立但连续的问题：

- **Crawler 阶段**：从一个种子 URL 出发，发现同域页面并输出 URL 列表
- **Audit 阶段**：读取 URL 列表，对每个页面抽取 SEO 相关字段，输出结构化结果

需求文档特别强调了一个重要能力：  
抓取完成后，用户可以手动编辑 `done.txt`，再把整理后的 URL 列表用于审计。这说明系统必须天然支持：

- 流程分阶段
- 中间结果可读可改
- 不依赖数据库
- 输出稳定可复跑

### 1.3 当前需求与样例结果的差异

`Requirements.md` 中定义了较基础的审计字段，例如：

- `status_code`
- `content_type`
- `title`
- `meta_description`
- `h1`
- `canonical`
- `meta_robots`
- `word_count`

但仓库中的 `sample.csv` 已经体现出实际目标输出更接近一个**增强版页面结构审计结果**，包含：

- heading 计数与文本：`h1Count`, `h1Text`, `h2Count`, `h2Text`, `h3Count`, `h3Text`
- 跟踪脚本识别：`ga4Count`, `ga4Ids`, `gtmCount`, `gtmIds`
- 页面类型与结构信号：`isBreadcrumb`, `isBlogPosting`, `isArticle`, `isFaq`, `isLogo`, `isSsr`, `countStructureData`
- 页面基础信息：`url`, `title`, `description`, `canonical`, `isRedirect`, `size`

因此，本技术方案采用以下决策：

- **以 `sample.csv` 作为 audit 输出契约基准**
- `Requirements.md` 中的 audit 字段作为业务语义背景和 v1 基础能力说明

这能保证技术方案更贴近真实交付物，而不是停留在早期字段定义。

### 1.4 总体设计目标

本项目技术方案的总体目标如下：

- 用最少组件完成可用工具
- 保持抓取与审计阶段解耦
- 明确 CLI 接口与输入/输出契约
- 用稳定规则替代复杂推断
- 为未来新增检测项保留扩展点

---

## 2. 技术栈决策

### 2.1 推荐技术栈

建议采用以下技术栈：

- 运行时：`Node.js 22 LTS`
- 语言：`TypeScript`
- CLI 框架：`commander`
- HTTP 客户端：`undici`
- HTML 解析：`cheerio`
- CSV 输出：轻量 CSV Writer（可自实现）或 `csv-stringify`
- 测试框架：`vitest`
- 代码规范：`eslint` + `prettier`

### 2.2 选择理由

#### Node.js + TypeScript

需求文档已指定 Node.js。使用 TypeScript 的价值在于：

- 对 URL 归一化、状态文件、CSV schema 进行强约束
- 降低字段遗漏、字段命名不一致等低级错误
- 更利于后续扩展 audit 字段

#### commander

CLI 命令数量少、结构简单，仅涉及 `crawl` 和 `audit` 两个主命令。  
`commander` 足以支撑参数解析、帮助文档和默认值处理，不会引入额外复杂度。

#### undici

该项目不需要浏览器渲染，也不需要复杂抓取调度。  
`undici` 足以满足：

- 获取 HTML 页面
- 读取状态码与响应头
- 判断 `content-type`
- 支持重定向处理

#### cheerio

页面分析需求主要基于静态 HTML：

- 提取 `<title>`
- 提取 `<meta>`
- 提取 heading
- 提取 canonical
- 分析 JSON-LD / 结构化标记

`cheerio` 对此完全够用，无需 headless browser。

### 2.3 明确不引入的技术

本期不建议引入：

- `puppeteer` / `playwright`
- 数据库（如 `sqlite`、`postgres`）
- 队列系统（如 `redis` / `bullmq`）
- 分布式 worker
- 复杂 IOC / DI 容器
- 微服务拆分

原因很简单：这些都超出了当前需求规模，会显著增加维护成本。

---

## 3. 输入 / 输出数据设计

## 3.1 输入数据

系统有两类输入：

### A. 抓取输入

来自 CLI：

```bash
seo crawl <url>
```

输入为一个种子 URL，例如：

```bash
seo crawl https://abc.com
```

### B. 审计输入

来自文本文件：

```bash
seo audit <file>
```

例如：

```bash
seo audit ./state/done.txt
```

该文件为一行一个 URL 的纯文本文件，通常由 crawler 输出，也允许用户手工编辑。

---

## 3.2 输出数据

### Crawler 输出

按照需求，状态目录结构如下：

```text
state/
  queue.txt
  done.txt
  skipped.txt
  error.txt
```

建议进一步明确格式：

- `queue.txt`：待抓取 URL，一行一个
- `done.txt`：已成功抓取 URL，一行一个规范化后的 URL
- `skipped.txt`：`url<TAB>reason`
- `error.txt`：`url<TAB>stage<TAB>message`

### Audit 输出

Audit 最终输出为：

```text
state/audit.csv
```

字段以仓库中的 `sample.csv` 为基准，建议固定列顺序如下：

```text
url,title,description,canonical,isRedirect,h1Count,h1Text,h2Count,h2Text,h3Count,h3Text,size,ga4Count,ga4Ids,gtmCount,gtmIds,isBreadcrumb,isBlogPosting,isArticle,isFaq,isLogo,isSsr,countStructureData
```

---

## 3.3 CSV 字段分组设计

为便于实现和后续维护，建议将输出字段按职责分组：

### A. 页面基础信息

- `url`
- `title`
- `description`
- `canonical`
- `isRedirect`
- `size`

### B. Heading 结构

- `h1Count`
- `h1Text`
- `h2Count`
- `h2Text`
- `h3Count`
- `h3Text`

### C. 跟踪脚本检测

- `ga4Count`
- `ga4Ids`
- `gtmCount`
- `gtmIds`

### D. 结构化 / 页面类型信号

- `isBreadcrumb`
- `isBlogPosting`
- `isArticle`
- `isFaq`
- `isLogo`
- `isSsr`
- `countStructureData`

---

## 3.4 字段输出约定

为避免实现歧义，建议在技术方案中固定以下规则：

- 所有列顺序固定，不能按对象遍历顺序动态生成
- 字符串缺失时输出空字符串
- 布尔值统一输出 `TRUE/FALSE`
- 数值字段输出整数或浮点数，不输出空格
- 多值字段（如 `ga4Ids`, `gtmIds`, `h2Text`, `h3Text`）统一使用逗号拼接
- `canonical` 不存在时输出空字符串，不输出 `undefined`

---

## 4. CLI 接口设计

## 4.1 对外 CLI Interface

这里的 CLI interface 指的是**用户在命令行中直接调用的命令契约**。

推荐定义如下：

### 1）抓取命令

```bash
seo crawl <url> [--state-dir <path>] [--max-pages <n>]
```

参数说明：

- `<url>`：抓取种子 URL，必填
- `--state-dir`：状态文件输出目录，默认 `./state`
- `--max-pages`：最大抓取页数，默认 `100`

### 2）审计命令

```bash
seo audit <input-file> [--output <file>] [--origin <url>]
```

参数说明：

- `<input-file>`：待审计 URL 列表文件，必填
- `--output`：CSV 输出路径，默认 `./state/audit.csv`
- `--origin`：指定站点 origin；未传时，从输入文件第一条 URL 推导

---

## 4.2 CLI 行为约定

为保证工具可预测，建议明确以下行为：

- `seo crawl` 只负责抓取，不自动触发 audit
- `seo audit` 只读取输入文件，不回写 `done.txt`
- 任一页面抓取或审计失败时，记录到 `error.txt`，整体继续执行
- CLI 标准输出只显示摘要进度和最终统计

建议退出码：

- `0`：全部成功
- `1`：参数错误、输入文件不存在、初始化失败
- `2`：任务完成，但存在部分页面抓取或审计失败

---

## 4.3 CLI 示例

```bash
seo crawl https://www.example.com
```

```bash
seo crawl https://www.example.com --state-dir ./tmp/state --max-pages 80
```

```bash
seo audit ./state/done.txt
```

```bash
seo audit ./state/done.txt --output ./state/sample.csv
```

---

## 4.4 CLI 的内部接口位置

除了用户看到的命令行 interface，技术方案还需要定义代码层的 CLI 接口位置。

建议项目内部结构如下：

```text
src/
  cli/
    index.ts
  commands/
    crawl.ts
    audit.ts
  crawler/
  audit/
  io/
  shared/
  core/
```

职责如下：

- `src/cli/index.ts`：注册命令、解析参数、处理帮助文档
- `src/commands/crawl.ts`：接收 CLI 参数并调用 crawler service
- `src/commands/audit.ts`：接收 CLI 参数并调用 audit service

因此，**CLI 的 interface 在文档层体现为命令契约，在代码层体现为 `src/cli/` 与 `src/commands/`。**

---

## 5. 系统架构与设计模式

## 5.1 架构模式

推荐使用：

- **分阶段架构**
- **模块化分层**
- **Pipeline（管道式处理）**

端到端流程如下：

```text
seed URL
   |
   v
seo crawl
   |
   v
state/done.txt
   |
   v
manual edit
   |
   v
seo audit
   |
   v
state/audit.csv
```

此架构的优点：

- 中间结果可人工干预
- 单步骤失败不会污染整条流程
- 易于调试与复跑
- 非常适合个人工具场景

---

## 5.2 推荐设计模式

### A. Pipeline 模式

适用于 crawler 与 audit 的每一步顺序处理。

Crawler：

```text
raw url
 -> normalize
 -> filter
 -> fetch
 -> extract links
 -> dedupe
 -> persist
```

Audit：

```text
url
 -> fetch
 -> parse html
 -> extract fields
 -> map to csv row
 -> write output
```

### B. Strategy 模式（轻量）

适合将页面规则与检测器拆分为可扩展策略：

- URL 过滤策略
- tracking script 检测策略
- structured data 类型识别策略

例如：

- `shouldSkipUrl(url): SkipReason | null`
- `detectGa4(html): DetectionResult`
- `detectStructuredData(html): StructuredDataResult`

### C. File Gateway 模式

由于系统完全依赖文件状态，建议将状态文件读写统一封装：

- `readQueue()`
- `appendDone()`
- `appendSkipped()`
- `appendError()`
- `writeAuditRows()`

这样可以避免业务逻辑直接散落读写文件代码。

---

## 5.3 不推荐的模式

当前项目不建议使用：

- 复杂类继承体系
- 事件总线
- 领域驱动建模（DDD）
- 插件系统
- 中间件链框架

这些模式对当前问题规模来说收益很低，反而会拖慢开发。

---

## 6. 模块划分与内部接口

## 6.1 模块划分

建议模块结构如下：

```text
src/
  cli/
  commands/
  crawler/
  audit/
  io/
  shared/
  core/
```

### `cli/`

负责命令注册和参数解析。

### `commands/`

负责 CLI 命令到业务流程的衔接。

### `crawler/`

负责：

- 页面请求
- 链接提取
- URL 规范化
- 过滤与去重
- 抓取循环

### `audit/`

负责：

- 页面请求
- DOM 解析
- 字段抽取
- 结构化数据分析
- CSV record 构造

### `io/`

负责：

- 状态文件读写
- CSV 写入

### `shared/`

负责通用能力：

- URL 工具
- 字符串处理
- 文本清洗
- heading / script / JSON-LD 辅助函数

### `core/`

负责：

- 类型定义
- 配置定义
- 错误模型

---

## 6.2 建议的内部函数接口

建议采用函数式接口优先，而不是面向对象层层封装。

核心接口建议如下：

```ts
runCrawl(seedUrl, options): Promise<void>
runAudit(inputFile, options): Promise<void>
normalizeUrl(rawUrl, origin): string | null
extractLinks(html, baseUrl): string[]
fetchPage(url): Promise<HttpPage>
auditPage(page, origin): Promise<AuditRecord>
writeAuditRows(filePath, rows): Promise<void>
```

配套类型建议包括：

- `AuditRecord`
- `CrawlOptions`
- `AuditOptions`
- `FetchResult`
- `SkipReason`
- `StructuredDataSignal`

---

## 7. 关键流程设计

## 7.1 Crawl 流程

```text
+------------------+
| seo crawl <url>  |
+------------------+
          |
          v
+------------------+
| init state files |
+------------------+
          |
          v
+------------------+
| enqueue seed url |
+------------------+
          |
          v
+----------------------+
| while queue not empty|
+----------------------+
          |
          v
+----------------------+
| fetch current url    |
+----------------------+
          |
    +-----+------+
    |            |
    v            v
 error        parse links
    |            |
    v            v
record       normalize/filter
error            |
                 v
           dedupe/enqueue
                 |
                 v
             move to done
```

### Crawl 关键规则

- 仅允许 same-origin URL
- 丢弃 `mailto:`, `tel:`, `javascript:`
- 去掉 fragment
- 去掉指定 `utm_*` 参数
- 过滤明显非 HTML 资源
- 去重后才写入队列
- 单次仅处理一个 URL

---

## 7.2 Audit 流程

```text
+----------------------+
| seo audit done.txt   |
+----------------------+
          |
          v
+----------------------+
| read input urls      |
+----------------------+
          |
          v
+----------------------+
| fetch each page      |
+----------------------+
          |
    +-----+------+
    |            |
    v            v
 error       parse html/content
    |            |
    v            v
record      extract fields
error            |
                 v
            map csv row
                 |
                 v
             append csv
```

### Audit 关键规则

- 页面失败不终止整批任务
- 重定向页面记录 `isRedirect`
- 非 HTML 页面基础字段可留空
- 结构化字段统一使用稳定规则提取
- 输出列顺序固定

---

## 8. 审计字段实现策略

## 8.1 页面基础字段

### `title`

提取 `<title>` 文本，去除多余空白。

### `description`

提取：

```html
<meta name="description">
```

### `canonical`

提取：

```html
<link rel="canonical">
```

### `isRedirect`

基于 HTTP 请求过程中是否发生重定向判断。

### `size`

建议定义为 HTML 响应体大小，单位由实现层固定；若沿用 `sample.csv` 风格，可记录为 MB 或近似大小值，但需在实现中统一口径。

---

## 8.2 Heading 结构字段

提取策略：

- `h1Count`：页面中 `<h1>` 数量
- `h1Text`：多个 `<h1>` 文本逗号拼接
- `h2Count` / `h2Text`
- `h3Count` / `h3Text`

建议在提取时：

- 去掉多余空格
- 过滤空文本 heading
- 保留原页面顺序

---

## 8.3 跟踪脚本检测字段

### `ga4Count` / `ga4Ids`

建议通过以下模式识别：

- `G-XXXXXXXXXX` 格式 ID
- `gtag('config', 'G-...')`

### `gtmCount` / `gtmIds`

建议识别：

- `GTM-XXXXXXX`
- GTM script / iframe 标记

实现原则：

- 去重统计
- 保持稳定字符串顺序

---

## 8.4 结构化数据与页面类型字段

### `countStructureData`

统计页面中结构化数据块数量，建议包括：

- `application/ld+json`
- 可选 microdata / RDFa 检测（若实现复杂，可先聚焦 JSON-LD）

### `isBreadcrumb`

若 JSON-LD 中出现 `BreadcrumbList`，则为 `TRUE`。

### `isBlogPosting`

若出现 `BlogPosting`，则为 `TRUE`。

### `isArticle`

若出现 `Article`，则为 `TRUE`。

### `isFaq`

若出现 `FAQPage`，则为 `TRUE`。

### `isLogo`

若结构化数据中出现 `Organization` / `WebSite` 中的 `logo` 字段，可判为 `TRUE`。

### `isSsr`

该字段是当前最容易产生歧义的字段。建议在文档中明确：

- v1 将其定义为**页面首屏 HTML 是否包含主要内容信号**
- 若 HTML 中已能直接提取标题、heading、结构数据等主体信息，则可判定为 `TRUE`
- 否则为 `FALSE`

这是启发式判断，不追求框架层 SSR 精准识别。

---

## 9. 分步执行计划

## 第 1 步：初始化工程

- 创建 TypeScript Node CLI 工程
- 配置基础目录结构
- 安装核心依赖与测试工具

## 第 2 步：定义类型与输出契约

- 固定 `AuditRecord` 字段
- 固定 CSV 列顺序
- 定义状态文件路径与错误格式

## 第 3 步：实现 URL 规范化与过滤

- 相对 URL 转绝对 URL
- 去 fragment
- 去 `utm_*`
- same-origin 过滤
- 非 HTML 资源过滤

## 第 4 步：实现 crawler

- 初始化状态文件
- 单线程抓取循环
- 链接提取与入队
- done / skipped / error 持久化

## 第 5 步：实现 audit

- 读取输入 URL
- 请求页面
- 提取基础 SEO 字段
- 提取 heading、tracking、structured data
- 生成 CSV 行

## 第 6 步：实现 CLI 命令层

- `seo crawl`
- `seo audit`
- 参数校验与退出码
- 帮助文档与示例

## 第 7 步：测试与验收

- 单元测试：URL、提取器、CSV 映射
- 集成测试：crawl → edit → audit
- 校验输出与 `sample.csv` schema 一致

---

## 10. 测试方案与验收标准

## 10.1 单元测试

重点覆盖：

- URL 归一化
- UTM 参数清理
- same-origin 过滤
- 非 HTML 资源识别
- heading 提取
- canonical 提取
- GA4 / GTM 检测
- JSON-LD 类型识别
- CSV 行映射

---

## 10.2 集成测试场景

至少准备以下场景：

1. 单页站点
2. 含相对链接与 fragment 的页面
3. 含 UTM 参数链接的页面
4. 含 PDF / JPG / ZIP 外链的页面
5. 含重定向页面
6. 含 Breadcrumb / Article / FAQ JSON-LD 的页面
7. 含 GA4 / GTM 的页面
8. 缺失 title / description / heading 的页面

---

## 10.3 验收标准

满足以下条件即可视为 v1 完成：

- `seo crawl <url>` 可稳定输出状态文件
- 用户可人工修改 `done.txt`
- `seo audit <file>` 能生成结构稳定的 CSV
- CSV 列顺序与 `sample.csv` 契约一致
- 单个页面失败不会中断全量任务
- 对小于 100 页网站可稳定串行完成

---

## 11. 风险与后续演进

## 11.1 当前风险点

### `isSsr` 定义天然带有启发式

无法在不借助浏览器环境的情况下百分百判断 SSR。  
因此需要在文档中明确这是“页面首屏 HTML 内容完备度”的近似判断。

### 结构化数据格式可能不统一

部分站点会混用 JSON-LD、microdata、RDFa。  
v1 建议先以 JSON-LD 为主，减少实现复杂度。

### `sample.csv` 的个别字段格式需进一步标准化

例如：

- `canonical` 不应输出 `undefined`
- `size` 的单位需要固定
- 布尔值大小写需要统一

这些应在实现前锁定。

---

## 11.2 后续可扩展方向

基于当前架构，未来可以较平滑地扩展：

- broken link detection
- redirect chain analysis
- duplicate metadata detection
- thin content detection
- sitemap 对比
- 输出 HTML / Markdown 报告

由于当前方案已采用分阶段和模块化设计，这些能力可在不破坏 CLI 主流程的前提下逐步加入。

---

## 12. 结论

本方案建议将该项目定位为一个：

- 小型
- 单线程
- 文件驱动
- 可人工介入
- 输出可审计

的 SEO CLI 工具。

在技术实现上，最优解不是“更复杂”，而是“更稳定、可追踪、可维护”。  
因此推荐采用：

- `Node.js + TypeScript`
- `commander + undici + cheerio`
- 文件状态驱动
- Pipeline + Strategy + File Gateway 组合模式

最终形成以下清晰工作流：

```text
crawl -> review/edit urls -> audit -> analyze csv
```

这是最符合当前需求、实现成本和长期维护平衡的技术方案。
