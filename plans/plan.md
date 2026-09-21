# FFJ 广告账户管理系统
# Frontend Domain Prototype — Master Development Plan

## 0. 项目目标

FFJ 是一个广告账户运营管理平台。

它不是广告投放平台本身，也不是简单 BI Dashboard，更不是把现有 Excel 搬到网页。

系统核心职责是：

管理上游渠道提供的广告账户资产，
记录账户进入公司后的分配、使用、产品归属、消耗、状态和流转，
管理团队的账户需求，
并通过数据分析和预警辅助账户运营。

核心业务链：

Channel
↓
渠道提供账户
↓
Ad Account
↓
Account Pool
↓
Team Account Demand
↓
Demand Allocation
↓
Account Assignment
↓
Team / Member
↓
Product
↓
Spend / Status
↓
Performance
↓
Transfer / Recycle / Disable
↓
Alert

当内部账户库存不足时（**必须先匹配池，禁止跳过直接下单**）：

Team Demand
↓
Matching Account Pool（先能分尽分 → Allocate）
↓
发现 Shortage（remaining − poolMatch）
↓
预警信号（Team / Pool Shortage；正式 Alert 闭环见 STEP 12）
↓
Channel Account Order
↓
Telegram 与渠道沟通（通讯层；业务对象仍是 Order）
↓
渠道交付账户
↓
确认入库（Confirm Delivery → AdAccount AVAILABLE + sourceChannelId）
↓
Account Pool
↓
再 Allocate → 满足 Team Demand

原则：

下单补库 ≠ 自动满足 Demand。
入库只进入账户池；由账户中心调度再次 Allocate 才闭合需求。


====================================================
1. 当前开发阶段
====================================================

当前处于：

Phase 1 — Frontend Domain Prototype

技术栈：

Vue 3
Nuxt 4
Composition API
TypeScript
Nuxt UI

未来数据库：

PostgreSQL

但当前明确：

不建立 PostgreSQL
不安装 ORM
不实现正式 Database API
不接 Meta API
不接 Google API
不接 TikTok API
不接 Telegram Bot

当前开发目标：

先验证并冻结：

1. 信息架构
2. UI架构
3. Domain Model
4. Query Model
5. Service Interface
6. 核心业务流程
7. 页面之间的业务关系

**Domain 同步约定（强制）**

- Frontend Domain 的冻结细节以 [`phase_one.txt`](phase_one.txt) 为准。
- 各阶段执行计划见：`phase_2.md` / `phase_3.md` / …（与本文 §40 STEP 对齐）。
- 若本文与 `phase_one.txt` 冲突，**以 phase_one 为准**，并回写本文。
- 下文 §2.1 / §6 / §8 / §8.1–§8.3 / §12–§13 / §21 / §25 / §25.1 / §25.3 / §26 / §30–§31 已按业务校准同步，后续 Phase 不得再引入 ProductCategory 推导或 `AdAccount.bmId`；需求补库必须池优先（先 Allocate，Shortage 后再 Channel Order；入库回池后再 Allocate；正式 Shortage Alert = STEP 12）；中心级二级导航统一 §2.1（UNavigationMenu highlight，与系统管理一致）。

前端 Prototype 阶段路线（与 §40 STEP 一致）：

STEP 2 → Account Center — All Accounts（见 phase_2.md）
STEP 3 → Account Detail（见 phase_3.md）
…
STEP 15 → Domain Checkpoint（会签冻结；不建库）
STEP 16 → Channel / Team UX Parity
STEP 17–24 → Signoff Mock / 模拟 TG / Media·Finance Mock / E2E 闸门
STEP 25+ → PostgreSQL / Server API / 真实 Media Connector / 真实 Telegram

（旧表述「Phase 2 = PostgreSQL」已废弃；旧「STEP 16 = ERD」已重排，见 §40。）


====================================================
2. 当前一级导航
====================================================

现有左侧业务导航保持：

运营总览
渠道中心
账户中心
团队中心
预警与待办

系统管理：

数据接入
产品与客户
组织与成员
用户与权限
规则配置
数据字典
  （媒体主数据等；正式 CRUD 见 STEP 19 Mock，此前只读 / 占位）
日志中心
  ├ 操作日志
  └ 同步日志

原则：

不要继续增加大量一级导航。

复杂业务放在：

Page
→ 二级 Tab（见下）
→ Detail
→ Drawer / Modal

中完成。


----------------------------------------------------
2.1 二级导航 UI 约定（强制统一）
----------------------------------------------------

凡「一个一级中心、多个并列工作台」的模块，统一采用与
系统管理相同的二级 Tab 形态，禁止另造 pill Tabs / 侧栏堆子项
作为主入口（侧栏子项仅系统管理保留，属模板既有双入口）。

结构：

UDashboardPanel
├ #header
│  ├ UDashboardNavbar（中心标题）
│  └ UDashboardToolbar
│       └ UNavigationMenu（items + highlight）
└ #body
     └ 页面正文（禁止把正文放进 Panel 默认插槽，否则 #header 不渲染）

参考实现：

系统管理 → [app/pages/settings.vue](app/pages/settings.vue)
账户中心 → [AccountCenterNav.vue](app/components/accounts/AccountCenterNav.vue)
  （全部账户 / 账户池 / 需求调度；媒体资产、账户分析同挂此条）
渠道中心 → ChannelCenterNav（STEP 16：概览列表 / 订单工作台等；须与账户中心同构）
团队中心 → TeamCenterNav（STEP 16：概览列表 / 需求等；须与账户中心同构）

要求：

- 组件：UNavigationMenu + highlight（下划线激活态），与系统管理视觉一致
- 路由：用 to / exact，不用 UTabs 充当中心级二级导航
- 正文必须使用 #body（或保证 #header 始终挂载）
- 新中心（若有）先复用此模式，再考虑是否在侧栏加 children
- **渠道中心、团队中心必须遵守本约定**（列表筛选套件、分页、CenterNav），不得停留在仅 keyword 的初步列表

不做：

- 为账户池 / 需求调度再增加左侧一级菜单
- 账户中心与系统管理 / 渠道 / 团队使用两套二级导航视觉语言


====================================================
3. 五个核心业务域
====================================================

3.1 运营总览

负责：

整体账户情况
整体消耗
自家/外接消耗
账户资源结构
渠道概览
团队概览
重要异常
待办

Dashboard只负责：

观察
发现
穿透

不承担复杂业务操作。


3.2 渠道中心

负责：

上游渠道
渠道提供账户
渠道支持媒体
渠道下户
渠道媒体资产
渠道质量表现

未来还包括：

渠道资金
支付资料
对账

但资金/支付/对账业务尚未完成业务访谈。

当前不要实现真实逻辑。


3.3 账户中心

这是整个 FFJ 的核心。

负责：

账户资产
账户池
账户查询
账户状态
媒体资产
账户分配
账户划转
账户回收
户管
产品归属
消耗
账户生命周期
需求调度


3.4 团队中心

负责：

团队
成员
账户使用情况
成员表现
产品结构
账户需求

团队负责：

“我要什么账户。”

账户中心负责：

“具体给你什么账户。”


3.5 预警与待办

负责：

发现问题
指派
处理
完成
留下结果

预警不是通知。

必须最终形成：

发现
→ 处理
→ 业务动作
→ 解决

闭环。


====================================================
4. 核心业务对象
====================================================

前端必须建立独立 Domain Types。

至少包括：

MediaPlatform

PlatformAssetType

PlatformAsset

Channel

AdAccount

Team

Member

Product（含 ownershipType：INTERNAL | EXTERNAL；**无 ProductCategory**）

Customer

AccountAssignment

AccountManagerAssignment

AccountProductAssignment

AccountPlatformAssetAssignment

AccountChannelAssignment

AccountServiceFeePolicyAssignment

AccountSpendDaily

AccountSpendMetrics（Read Model）

ServiceFeePolicy

ServiceFeeTier

AccountMonthlySettlement / ChannelMonthlySettlementSummary（Read Model）

ChannelPrepayment

ChannelPaymentAddress
  （渠道打款地址；CRYPTO | FIAT；可多条；启用前须团队负责人审核 — 见 §34 / STEP 23）

ChannelRefund

AccountDemand

AccountDemandItem

AccountDemandAllocation

Alert

ChannelAccountOrder


====================================================
5. Media Platform 核心原则
====================================================

绝对禁止写死：

Meta
Google
TikTok

它们只是当前存在的数据。

未来可能增加：

Snapchat
Microsoft Ads
X Ads
其他平台

因此 Media 必须类似：

MediaPlatform {
  id
  code
  name
  logoUrl
}

页面上的媒体：

Tabs
Filters
Select
Badge

全部从 Media 数据动态生成。

管理方式（与「动态读取」分开）：

动态 Media ≠ 早期前端 CRUD。

业务 STEP（账户 / 团队 / 渠道等）阶段：
媒体作为只读主数据供筛选、Tabs、Select 消费即可。

正式能力按 §40 重排（先 Mock 跑通，再 Postgres）：

STEP 15
Domain Checkpoint：MediaPlatform / PlatformAssetType 为可管理主数据
明确权限、停用规则、以及对渠道 supportedMedia、账户筛选、申请单 media-specific 字段的影响

STEP 19
系统管理「数据字典」接通 Media 主数据 CRUD（Mock）

STEP 20
Media Connector Framework（Mock）
完整「加新媒体」= 主数据 + Connector 注册 + Asset Type + 媒体专属字段配置

STEP 25–28
Schema / Migration / Server API / 替换 MockService

可选：业务确认前可用 Mock 写接口把字典页做成原型验证，不作为正式能力。

正式加新媒体仍改种子 / 后端数据或走上述管理端，不得把 Meta | Google | TikTok 写回类型联合。


====================================================
6. Platform Asset 抽象
====================================================

不同媒体存在不同账户管理实体。

例如：

Meta
→ BM

Google
→ MCC

TikTok
→ Business Center

未来媒体可能还有其他结构。

系统统一抽象：

PlatformAsset

不能在 AdAccount 核心模型中写死：

bmId

应该是：

platformAsset


未来：

PlatformAssetType
→ BM
→ MCC
→ Business Center
→ Other


====================================================
7. 三种账户责任关系必须分开
====================================================

对于一个账户：

Channel
=
谁提供这个账户。

Team
=
公司内部哪个团队拥有当前使用权。

Member
=
谁实际使用账户进行广告投放。

Account Manager / 户管
=
谁负责账户本身的维护、绑定、权限、BM等账户管理工作。

必须保证：

Member ≠ Account Manager

账户划转 Member 时：

不得自动改变 Account Manager。


====================================================
8. Product 业务模型
====================================================

产品统一通过：

Product
↓
ProductCategory

决定：

INTERNAL
自家

或者：

EXTERNAL
外接

外接 Product：

可以关联 Customer。

禁止：

AdAccount.internal = true

禁止：

用户直接把账户标记成“自家/外接”。

系统必须通过当前 Product 自动推导。


====================================================
9. Account History 原则
====================================================

所有会随时间发生改变的重要关系：

不得覆盖历史。

例如：

Account：
张三
→
李四

不能简单 Update。

概念上必须形成：

AccountAssignment #1
张三
start
end

AccountAssignment #2
李四
start
NULL


同理：

Product变更
→ AccountProductAssignment

户管变更
→ AccountManagerAssignment

Platform Asset迁移
→ AccountPlatformAssetAssignment

Account Status
→ Status History

当前前端 Mock 也应该遵循这个业务语义。


====================================================
10. Account Pool 原则
====================================================

账户池不是人工维护列表。

不能设计：

is_pool = true

账户池应该是动态视图。

概念：

Account可用
AND
没有Current Assignment
AND
满足媒体状态要求

=
Available Account Pool


====================================================
11. Team Demand 原则
====================================================

团队存在主动申请账户的真实业务。

流程：

Team
↓
Account Demand
↓
Demand Item
↓
Approval
↓
Demand Allocation
↓
Account Assignment


Demand Header：

Team
Requester
Expected Date
Priority
Reason
Status


Demand Item：

Media
Product
Quantity
Media-specific Requirement


状态：

DRAFT
SUBMITTED
APPROVED
PARTIALLY_ALLOCATED
FULFILLED
REJECTED
CANCELLED


团队只负责表达：

我要：

什么Media
多少Account
什么Product
什么Timezone
什么条件

团队不能直接选择具体账户。


====================================================
12. Demand Allocation 原则
====================================================

账户中心负责：

把具体Account分配给Demand。

**强制顺序（池优先）**：

1. 打开 Demand Item → 计算 Matching Account Pool
2. 池内有符合条件的户 → 先 Allocate（能分尽分）
3. 仍不足 → 记 Shortage，发出预警信号，再走 Channel Account Order
4. 禁止：未看池 / 未尝试分配，直接对渠道下单

例如：

Demand：

Meta
GMT+5:30
Product A
10户

Account Pool：

符合要求6户

系统显示：

Demand 10
Allocated / 可分配 6
Shortage 4

管理员：

选择6个账户
→ Allocate

不足的4个：

→ Shortage 预警信号（调度页高亮 / 后续正式 Alert）
→ Channel Account Order（关联 relatedDemandItemId）

Shortage 定义（调度读模型）：

shortage = max(0, remainingQuantity − poolMatchCount)

remainingQuantity = requested − alreadyAllocated


====================================================
13. Channel Account Order
====================================================

前置条件：已存在 Demand Shortage。禁止无 Demand 的主动补库单（可对渠道做补货提醒，但不建无 Demand 的 Order）。

当前真实业务通过 Telegram 与渠道沟通下户。Telegram 不是业务主对象。

完整闭环：

Demand Shortage（池已匹配、仍不足）
↓
Create Channel Account Order（必挂 relatedDemandItemId）
内部单号 orderNo + 外部单号 externalOrderNo（渠道 Bot「下户 ID」）
↓
Stage A：生成标准订单摘要（人工复制到 Telegram）
模拟 TG 协议见 STEP 18；真实 Bot 见 STEP 29（需求源 check.txt）
↓
渠道回复交付信息（须能映射到本 Order）
↓
Confirm Delivery（人工确认；禁止 AI/Bot 直接改正式资产）
↓
Account 入库（AVAILABLE，写入 sourceChannelId / ChannelAssignment）
↓
回到 Account Pool
↓
调度再次 Allocate → 满足 Demand

禁止：

Confirm Delivery 后自动 Allocate 给 Demand（入库 ≠ 分配）。
把 Telegram 会话当成业务主对象。

系统必须最终知道：

Account到底来自哪个Channel。

Telegram只是通讯渠道。

业务对象应该叫：

Channel Account Order

而不是：

Telegram Order。


====================================================
14. Telegram 自动化策略
====================================================

需求源：[check.txt](check.txt)「TG Bot 自动下户工作流」。
不采用 FFJ 原型里的「TG 群组 / 关键词 / 自动化规则」设计。

Telegram 只是通讯层。业务对象永远是 Channel Account Order。

分阶段：

Stage A（Prototype 已有，可保留至真实 Bot 上线前）：

FFJ 生成标准 Channel Order 摘要。
人工复制到 Telegram 沟通。


STEP 18 — Mock Telegram（建库前必须跑通）：

在系统内模拟 check.txt 协议，不接真实 Bot Token：

系统创建 Order
↓
模拟询单卡片（确认接单 / 拒绝接单）
↓
ACCEPTED → PROCESSING
↓
模拟供应商 Reply 原询单消息（订单归属不靠 AI 猜测）
↓
Parser 草稿（Account ID / BM / 数量 / externalOrderNo）
↓
Validator
↓
人工确认 → 入库 Pool
禁止 AI 直接修改正式 Account。

订单状态至少覆盖：

PENDING_CONFIRM
ACCEPTED
REJECTED
TIMEOUT
PROCESSING
PARTIAL_DELIVERED
DELIVERED
PARTIAL_CLOSED
PARSING_EXCEPTION / QUANTITY_EXCEPTION
CANCELLED

部分交付是一等状态：同一 Order 续交直到满。
可配置每日提醒。人可取消剩余未交；已交付部分不可撤回。
超交账户入库进 Pool，不挂本 Demand。


STEP 29 — Real Telegram：

真实 Bot 发送询单、Inline Buttons、Webhook。
复用 STEP 18 状态机与 UI。
履约指标（接单率、部分交付率等）沉淀，供渠道评分，不在本步做评分引擎。


禁止：

把 Telegram 会话当成业务主对象。
AI 直接入库。


====================================================
15. Media API架构
====================================================

未来不能试图使用一个统一API实现所有媒体。

架构：

FFJ Internal Domain
↓
Media Connector Interface
↓
Meta Connector
Google Connector
TikTok Connector
Future Connector


可复用：

Credential Management
Discovery Framework
Sync Job
Error Handling
Internal Models


不可直接复用：

OAuth细节
API endpoint
Permission
Object Model
Fields


====================================================
16. API Access 与 Asset Ownership 解耦
====================================================

未来必须区分：

Account是谁
=
AdAccount

Account现在挂在哪个管理资产
=
AccountPlatformAssetAssignment

FFJ现在通过哪个Credential可以访问Account
=
CredentialAccountAccess


例如Account从：

BM_A
→
BM_B

Account ID不变。

Platform Asset Relationship改变。

Credential Access可能改变。

不能把三件事混成一件。


====================================================
17. Frontend Architecture
====================================================

当前没有Database。

禁止：

Page
→ Mock Array

正确结构：

Page
↓
Components
↓
Composable
↓
Service Interface
↓
Mock Service


未来：

Page
↓
Components
↓
Composable
↓
API Service
↓
Nuxt Server API
↓
PostgreSQL

替换数据源时：

UI不应重写。


====================================================
18. Mock原则
====================================================

允许Mock Data。

但：

Mock不得直接耦合Page。

Mock应该存在于：

Mock Service / Repository。

例如：

AccountService

getAccounts(query)
getAccountStats()
getAccountById()

当前实现：

MockAccountService

未来：

ApiAccountService


Mock Response必须模拟未来：

Server-side Pagination
Filtering
Sorting

返回：

data
pagination
meta


====================================================
19. 全系统列表UI规范
====================================================

统一使用：

Page Header
↓
KPI（需要时）
↓
Search
↓
3~5个Quick Filters
↓
Advanced Filter
↓
Active Filter Chips
↓
Data Table
↓
Pagination


禁止把：

10~20个下拉框

全部铺在页面顶部。


====================================================
20. Filter UX
====================================================

默认显示高频筛选。

例如Account：

Search

Media
Status
Channel
Team

+ 筛选


Advanced Filter打开Drawer。

Filter分类：

Object
Relation
Business
Status
Performance
Time
Media-specific attributes


所有激活条件显示：

Filter Chips。


====================================================
21. Filtering Architecture
====================================================

Filter状态应该形成 Query Model。

例如：

AccountQuery {
 keyword

 mediaIds
 channelIds
 teamIds
 memberIds
 managerIds

 timezone
 platformAssetIds

 productOwnership
 productIds
 customerIds

 assetStatuses
 mediaStatuses
 apiAccessStatuses

 todaySpendMin
 todaySpendMax

 spend7dMin
 spend7dMax

 lastSpendPreset

 receivedFrom
 receivedTo

 page
 pageSize

 sortBy
 sortOrder
}


Filter必须同步 URL Query。

刷新不能丢失。


====================================================
22. 大数据原则
====================================================

未来可能存在：

几万
几十万
甚至更多Account。

因此所有页面从Prototype开始按照：

Server-side Filtering
Server-side Sorting
Server-side Pagination

设计。

禁止UI依赖：

获取所有账户
→ Browser filter


Mock Service可以内部Array.filter。

但UI调用方式必须模拟Server。


====================================================
23. Select大数据原则
====================================================

小数据：

Media
Status

可以一次加载。


大数据：

Account
PlatformAsset
Member
Product
Customer

未来必须支持：

Server-side Search。

因此Select组件接口要允许：

search(keyword)
limit


====================================================
24. Saved View
====================================================

账户等高频运营页面未来支持：

保存当前筛选。

例如：

我的Meta账户
Nova GMT-5
48h无消耗
外接账户
今日异常

第一阶段可以只预留接口或轻量实现。

不要建立复杂数据库。


====================================================
25. 账户中心信息架构
====================================================

Account Center：

全部账户
账户池
需求调度
媒体资产
账户分析

二级入口 UI：统一走 §2.1（UDashboardToolbar + UNavigationMenu highlight）。
实现组件：[AccountCenterNav.vue](app/components/accounts/AccountCenterNav.vue)。
媒体资产 / 账户分析落地时追加到同一 Nav，不新开一级侧栏。


25.1 全部账户

核心工作台。

展示：

Account ID
Media
Channel
Platform Asset
Timezone
Rate
Product
Internal/External
Team
Member
Account Manager
Asset Status
Media Status
Today Spend
7D Spend
Last Spend
Received At


主要动作：

Transfer
More


More：

Detail
Assign
Recycle
Change Product
Change Account Manager
Disable


25.2 Account Pool

展示：

可以立即分配的账户。

核心：

库存
媒体
时区
渠道


操作：

分配给Demand
直接分配


25.3 Demand Scheduling

左侧：

Demand。

右侧：

Matching Account Pool。

操作顺序：

1. 查看池匹配数 / Shortage
2. 有匹配 → Allocate（主路径）
3. Shortage > 0 → 预警信号 +「创建 Channel Order」（补库路径）
4. 渠道交付入库回池后 → 再回到本页 Allocate

库存不足：

Create Channel Order（关联 Demand Item；不替代先查池）。


25.4 Media Assets

不要叫BM Management。

根据Media动态显示：

Meta → BM
Google → MCC
TikTok → Business Center


25.5 Account Analytics（质量分析 — 一底座、三入口）

用于替代原 Excel Pivot，并支撑「账户 / 渠道 / 团队」宏观质量评估。

原则：

底层同一套聚合逻辑与 Service（Query + groupBy + metrics）。
前端分三处入口展示，避免三套计算分叉；也避免只有账户中心有分析、渠道/团队只能看列表 KPI。


共享聚合底座（概念）：

groupBy：
Media | Channel | Timezone | Team | Member | Account Manager | Product | Status
（可扩展第二维度，第一版可先单维）

metrics（质量相关，账户为事实粒度）：
Account Count
Active / Valid Count
In Use
Idle
Banned
Ban Rate
Usage Rate（可选）
Spend（期间 Media Spend：今日 / 7D / 30D / 自定义；不含 Service Fee）

filters / period：
与 AccountQuery / Spend 窗口语义对齐；模拟 server-side 聚合。


三处前端入口：

1. 账户中心 →「账户分析」页（完整 Pivot）
   - 行维度可选（上述 groupBy）
   - 跨渠、跨团对比；可预置 Saved View（如「按渠道 Ban Rate」）
   - 点行下钻 → /accounts 带对应筛选

2. 渠道中心 → 详情（或列表级）「质量」Tab
   - 默认 groupBy = Channel（全渠对比）；进入单渠时可锁 channelId，再切 Media / Timezone / Status
   - 同一聚合 API；UI 仅预锁维度与文案
   - 下钻 → 账户列表 channelIds=

3. 团队中心 → 详情（或列表级）「质量」Tab
   - 默认 groupBy = Team；进入单团时可锁 teamId，再切 Member / Product
   - 同一聚合 API
   - 下钻 → 账户列表 teamIds=


不做（本能力范围）：

把渠道结算成本（Media Spend + Service Fee）混进质量 Spend。
为三处各写一套独立聚合实现。
复杂拖拽式任意透视（可后补）；第一版固定度量列 + 可选行维度即可。


落地 STEP：

STEP 13 — 共享聚合 Service + 账户分析页 + 渠道/团队「质量」Tab 接线。


====================================================
26. Account Detail
====================================================

未来URL：

/accounts/:id

Header：

Account
Media
Channel
Platform Asset
Timezone

Current Team
Current Member
Current Manager
Current Product

Asset Status
Media Status
API Access


KPI：

Today Spend
7D
30D
Lifetime
Usage Days


Tabs：

Overview
Spend
Assignment
Product
Status
API Data


必须有统一Timeline：

Imported
Assigned
Transferred
Recycled
Product Changed
Manager Changed
Platform Asset Changed
Status Changed
Disabled


====================================================
27. Team Center
====================================================

Team不是账户调度中心。

定位：

需求
使用
表现


Team List：

Team
Leader
Members
Accounts
In Use
Idle
Usage Rate
Today Spend
7D Spend
Internal
External
Ban Rate
Unfulfilled Demand


Team Detail：

Overview
Accounts
Members
Product Performance
Account Demand
质量（Quality）
  — 与账户分析共用聚合 API；默认按 Team / 本团下 Member·Product 切片（见 §25.5）


====================================================
28. Account Demand UI
====================================================

Team Detail：

+ 申请账户


申请：

Media
Quantity
Product
Timezone
Media-specific Requirements
Expected Date
Priority
Reason


Media-specific requirements未来根据Media动态配置。

不要把Meta字段写死给所有媒体。


====================================================
29. Channel Center
====================================================

Channel List：

Channel
Supported Media
Delivered Accounts
Current Valid
In Use
Abnormal
Average Lifetime
30D Spend
Status


Channel Detail：

Overview
Account Orders
Accounts
Media Assets
质量（Quality）
  — 与账户分析共用聚合 API；默认按 Channel / 本渠下 Media·Timezone·Status 切片（见 §25.5）
Finance
Reconciliation
Profile


Finance（Prototype / STEP 9）：

只读月度结算摘要（Media Spend + Service Fee + Settlement Cost）
打款明细（ChannelPrepayment）
登记打款：选择渠道已启用打款地址 + 业务归属 + 金额（见 §34）
退款明细只读

Service Fee Policy（多梯度）交互 CRUD：

→ STEP 23（见 §34.3；原 STEP 25 已重排）；Prototype 仅 Mock 种子 + 结算时命中档，不做政策编辑 UI

Reconciliation：

正式对账 → STEP 23（原 STEP 25 已重排）；此前仅占位入口。


====================================================
30. Channel Account Order UI
====================================================

字段：

Order No
Channel
Media
Quantity
Timezone
Related Demand
Requested At
Delivered Quantity
Status


状态：

Draft
Pending
Processing
Partially Delivered
Completed
Cancelled


库存不足时（已先匹配池仍 Shortage）：

Account Demand
→ Create Channel Order
→ Confirm Delivery → 入库 Pool
→ 再 Allocate

入口：

需求调度（Shortage CTA，带 relatedDemandItemId）
渠道详情 Orders Tab（必须关联 Demand；禁止无 Demand 补库单）


====================================================
31. Alert Center
====================================================

Alert类型未来包括：

Account Banned
Account Restricted
No Spend 24/48h
Team Account Shortage
Account Pool Shortage
Platform Asset Risk
API Access Lost
Credential Expired
Sync Failed
Demand Overdue
Channel Delivery Overdue

与需求调度的关系：

调度 Shortage 是运营信号（数字 / CTA）。
Team Account Shortage / Account Pool Shortage 的正式 Alert
（发现 → 指派 → 处理 → 可链到建单 / 分配）属 STEP 12。
STEP 10 建单不替代预警中心闭环。


Alert状态：

OPEN
IN_PROGRESS
RESOLVED
IGNORED


Alert必须可以关联：

Account
Team
Channel
Demand
Platform Asset
Credential


====================================================
32. System Management
====================================================

32.1 Data Integration

未来：

Media
Connector
Credential
Sync Job


32.2 Products & Customers

Product
Product Category
Customer


32.3 Organization

Team
Member


32.4 Users & Permissions

User
Role
Permission
Data Scope


32.5 Rules

Account Rules
Inventory Rules
Alert Rules
Sync Rules


32.6 Dictionary

只管理普通业务枚举。

例如：

Transfer Reason
Recycle Reason
Disable Reason
Priority
Tags


Media不是Dictionary。

Product不是Dictionary。

Team不是Dictionary。

ServiceFeePolicy / ServiceFeeTier 不是Dictionary。
（挂在渠道下维护；见 §34.3 / STEP 23）


32.7 Logs

Operation Log

Sync Log


====================================================
33. Dashboard
====================================================

当前Dashboard视觉基本完成。

暂时不要大规模修改。

后期接真实Domain数据。

最终包括：

Account Count
In Use
Usage Rate
Today Spend
Today Banned
Open Alerts

Spend Trend

Internal / External Spend

Account Resource Structure

Channel Overview

Team Overview

Important Alerts


Dashboard只用于：

Observe
Discover
Drill Down


====================================================
34. Finance / 打款地址 / 费率政策 — 分阶段（非一次做完）
====================================================

资金与结算必须分开（详见 finance_arg）：

结算 = Media Spend + Service Fee（月度）
资金 = Prepayment / Refund /（未来）Ledger Balance

已识别对象：

ChannelPaymentAddress（打款地址，可多条）
ChannelPrepayment（打款/预付登记）
ChannelRefund
Channel Fund Account / Fund Ledger（未来）
Billing Statement / Reconciliation（未来）


34.1 ChannelPaymentAddress（业务规则）

一个 Channel 可有多条打款地址。

类型至少区分：

CRYPTO（数字货币地址）
FIAT（法定货币收款信息）

地址生命周期（概念）：

DRAFT / PENDING_APPROVAL
→ 团队负责人二次审核
→ ACTIVE（可被打款登记选用）
或 REJECTED / DISABLED

添加或变更打款地址：

提交人发起
→ 指定/关联团队的负责人（Team.leaderMemberId）二次审核通过
→ 方可 ACTIVE

禁止：

未审核通过的地址用于「登记打款」。


34.2 与前端 Prototype STEP 对齐

STEP 9 — Channel Center（已完成 Prototype）

Domain + Mock 种子：ChannelPaymentAddress（每渠可多条 CRYPTO/FIAT，状态已为 ACTIVE）
Finance Tab：结算只读 + 打款明细
登记打款（create Prepayment）：必选该渠 ACTIVE 地址、业务归属（INTERNAL|EXTERNAL）、金额 USD
录入日期 / paymentNo / CONFIRMED 由系统生成
Service Fee：Mock 已含多档 Alpha + 单档 Beta；结算用 Calculator；无 Policy/Tier 编辑 UI
不做：新增地址 UI、审核流、Ledger、对账、Refund 写、假余额充值、Policy CRUD

STEP 23 — Finance / Reconciliation（Mock 完整交互；编号已重排，原 STEP 25）

打款地址：新增/编辑提交 → PENDING_APPROVAL → 团队负责人通过/驳回
Service Fee Policy + Tier 多梯度交互 CRUD（§34.3）+ 账户换绑政策
Prepayment 与地址、审批态的完整校验（若 Prototype 已接线则加固）
Refund 登记与确认
Fund Ledger / Available Balance（若业务访谈完成）
Reconciliation 正式对账
Payment Address 支付资料维护与权限

此前不要擅自实现完整账本或对账引擎。


34.3 Service Fee Policy — 多梯度 CRUD（交互 UI）

Domain 已定（finance_arg）：

ServiceFeePolicy（归属 Channel）
→ ServiceFeeTier[]（minSpend / maxSpend / rate / sortOrder）

算法：

NON_PROGRESSIVE_TIER
整段档位：按账户当月 Media Spend 命中唯一 Tier，整笔 × rate；禁止累进拆档。

单档政策 = 仅一条 Tier（minSpend=0，maxSpend=null）。
多档政策 = 多条有序、半开区间衔接的 Tier（例：0–10k @2% / 10k–50k @1.5% / 50k+ @1%）。

禁止：

在 ServiceFeePolicy 上再挂顶层 rate（与 Tier 冲突）。
把 Policy/Tier 放进「数据字典」枚举页。


STEP 23 必须提供交互 CRUD（渠道中心内，非字典；原 STEP 25 已重排）：

Policy：

创建 / 更新 / 停用（DISABLE）
字段：code、name、channelId、effectiveFrom/To、note、status

Tier 表（同一 Policy 下可增删改行）：

每一行：minSpend、maxSpend（末档可空=无上限）、rate（内部小数，UI 可显示为 %）、sortOrder
保存时校验：
- 按 sortOrder / minSpend 排序后区间无重叠、无空洞（或产品确认允许空洞并明确规则）
- rate ∈ (0, 1]（或业务约定上限）
- 至少保留 1 条 Tier

展示：

渠道详情展示该渠全部 Policy + 展开 Tier 阶梯表
月结明细展示 appliedRate / matchedTier（命中档），并链到 Policy 定义

账户绑定：

Account ↔ Policy（AccountServiceFeePolicyAssignment 历史段）
换绑政策须结束旧段、开新段；历史月结仍按当时 Policy/Tier 计算

权限（与打款地址类似，可简化）：

谁可编辑 Policy/Tier；停用中的 Policy 不可再绑新账户


====================================================
35. UI视觉原则
====================================================

沿用当前项目暗色Design System。

特点：

Dark background
Subtle border
Green primary accent
Low-noise cards
Dense professional table
Status badges

不要：

大量渐变
巨大圆角
消费级App视觉
过多动画
每块数据都做Card

这是一个高密度专业运营后台。


====================================================
36. 页面状态
====================================================

所有业务页面必须考虑：

Loading

Empty

Filtered Empty

Error

Permission Denied（后续）

Disabled State


Filtered Empty必须允许：

Clear Filters。


====================================================
37. Desktop Priority
====================================================

本系统主要为Desktop运营使用。

优先：

1440px+
1920px

兼容：

1280px

大型DataTable允许：

Horizontal Scroll。

不要为了手机响应式牺牲桌面数据密度。


====================================================
38. 开发组件原则
====================================================

优先复用现有components。

业务组件：

components/accounts
components/channels
components/teams
components/alerts

通用组件：

components/common
components/filters


中心级二级导航：

统一 §2.1：UDashboardToolbar + UNavigationMenu highlight
参考 settings.vue / AccountCenterNav.vue
页面正文用 #body，勿用 Panel 默认插槽挤掉 #header


Composable：

useAccounts
useAccountFilters
useTeams
useChannels
...


不要：

所有代码写pages/*.vue。


====================================================
39. 当前阶段不要做的事情
====================================================

禁止：

建立PostgreSQL
安装ORM
真实Media API
真实Telegram
Finance真实逻辑
复杂RBAC
复杂AI Parsing

禁止因为“以后可能用到”提前制造大量抽象。

当前重点：

验证业务。


====================================================
40. 开发路线
====================================================

STEP 0
项目代码审计

↓

STEP 1
Frontend Foundation

Domain Types
Service Interfaces
Mock Services
Query Models
Filter Framework
Table Framework

↓

STEP 2
Account Center — All Accounts

↓

STEP 3
Account Detail

↓

STEP 4
Account Pool

↓

STEP 5
Team Center

↓

STEP 6
Account Demand

↓

STEP 7
Demand Scheduling

↓

STEP 8
Account Transfer / Recycle / Product / Manager

↓

STEP 9
Channel Center

↓

STEP 10
Channel Account Order

前置：Phase 7 调度已池优先（Matching Pool → Allocate；Shortage 占位）。
本步：Shortage → 建单 → 人工确认交付入库 → 回池；不自动 Allocate；不做 Telegram Bot。
正式 Shortage Alert 闭环留给 STEP 12。

↓

STEP 11
Platform Asset

↓

STEP 12
Alerts

含：Team Account Shortage / Account Pool Shortage 与调度 Shortage 衔接
（可关联 Demand / Channel Order；处理动作可指向建单或 Allocate）。

↓

STEP 13
Account Analytics / Pivot Replacement

含：
1. 共享质量聚合 Service（groupBy + metrics + spend period；账户为事实粒度）
2. 账户中心「账户分析」完整 Pivot 页（行维度可选）
3. 渠道中心「质量」Tab、团队中心「质量」Tab（同一 API，维度预锁；见 §25.5）
4. 行下钻到全部账户列表（带 channelIds / teamIds 等筛选）

Spend 度量仅为 Media Spend；不含 Service Fee / settlementCost。

↓

STEP 14
Dashboard Data Integration

↓

业务确认（规则全文见 §41）

↓

编号说明：下列 STEP 15–30 已重排。旧「STEP 16 = ERD / STEP 24 = Telegram / STEP 25 = Finance」作废。

STEP 15
Domain Checkpoint

会签冻结（§41）。含 MediaPlatform / PlatformAssetType 可管理边界。
不建 PostgreSQL。下一步是 STEP 16 UX，不是 ERD。

↓

STEP 16
Channel / Team UX Parity

对齐账户中心：CenterNav、#header/#body、Filters、分页、团队路由 /teams。
见 phase_16.md。不改一级侧栏、不建库、不接真实 TG。

↓

STEP 17
Signoff Mock Closure

Mock 落地 §41：externalOrderNo、部分/超交、闲置回收、Credential×Allocate 警告、
BANNED 出池、Demand 管理者审批、批量生命周期基础。

↓

STEP 18
Mock Telegram Order Workflow

按 check.txt / §14 模拟询单→接单/拒单→Reply 交付→人工确认入库。
无真实 Bot Token。

↓

STEP 19
数据字典 / Media 主数据 CRUD（Mock）

MediaPlatform 与 PlatformAssetType 增删改或停用。不接真实 Media API。

↓

STEP 20
Media Connector Framework（Mock）

Connector 注册、绑定 MediaPlatform、Asset Type / 专属字段配置。无真实 OAuth。

↓

STEP 21
Media Sync Mock

发现、去重、导入账户库；媒体侧存在性预警。Meta 优先。

↓

STEP 22
Batch Import / 数据治理（Mock）

Excel 模板导入。缺失 Account ID 不单独立项，走异常队列。

↓

STEP 23
Finance / Reconciliation（Mock 完整交互）

1. ChannelPaymentAddress 新增/变更 + 团队负责人二次审核
2. Service Fee Policy + Tier CRUD
3. Refund 登记与确认；Prepayment 约束加固
4. Fund Ledger / Available Balance（访谈完成后）
5. Reconciliation 正式对账（可仍为 Mock）
6. 支付资料与权限

开户费等来自 TG 回执的费用进费用草稿，不进 AdAccount 核心态。

↓

STEP 24
E2E Business Walkthrough Gate

书面验收主链（Demand→池分→Shortage→模拟 TG→入库→再 Allocate→回收/闲置→Alert）。
未通过不得建库。

↓

STEP 25
PostgreSQL ERD

含 media_platforms、platform_asset_types、external_order_no、Order 状态扩展、闲置字段。

↓

STEP 26
Database Migration

媒体主数据表与种子（Meta / Google / TikTok / Snapchat 等）。

↓

STEP 27
Nuxt Server API

含 Media 主数据读写 API。

↓

STEP 28
Replace MockService with ApiService

↓

STEP 29
Real Telegram Integration

复用 STEP 18 状态机与 UI。接真实 Bot。

↓

STEP 30
Real Media Connectors

复用 STEP 20–21。Meta 为首个真实 Connector，再扩其他媒体。


====================================================
41. Business Signoff（STEP 15 闸门）
====================================================

需求源：本轮会签 + [check.txt](check.txt) TG Bot 工作流。
与旧表述冲突时，以本节为准，并回写上文。

角色与成功标准：

团队申请人：按时拿到符合条件的账户。
账户中心调度：先吃池，不足再 Order；Demand 由 Allocate 闭合。
渠道对接：Order 履约、确认入库、知道户来自哪条渠。
户管：账户全生命周期操作责任人；超级管理员同等权限。

Demand：

团队成员（含管理者/户管）可建。团队管理者审批。状态可改、可取消。
团队不能挑选具体账户。
申请字段基线：Media、Quantity、Product、Timezone（GMT+N / GMT-N，不用地区名）、
Expected Date、Priority、Reason，以及按 media 配置的 media-specific 字段。
INTERNAL/EXTERNAL = Product type。不再用细 ProductCategory 推导归属。

Allocate：

一次写齐 Team / Member / Product / 户管。
改 Member 绝不自动改户管。户管变更走历史段，日志可查。
BANNED 禁止进入 Matching Pool。
Credential 失效：列表仍可展示可分配户；点击 Allocate 必须提醒重连 Credential；
库存事实仍允许分配；并行 Alert 给有权限的人修复。

进户与 Order：

禁止无 Demand 主动补库单。
进户通道：Order 确认入库 / 批量导入 / Media Sync 确认。
业务真相在 AdAccount / Order / Assignment。TG 与 Media API 只是进数通道。
账户展示字段可来自媒体同步，但归属关系只在 FFJ。
orderNo 为内部单号；externalOrderNo 记录渠道下户 ID，一对一映射。
入库 ≠ 分配。Confirm Delivery 禁止自动 Allocate。
部分交付：同一 Order 续交至满；每日提醒时间可人工配置；
可取消剩余未交；已交付不可撤回。
超交：多出的户进 Pool，不挂本 Demand。
AI/Bot 只出草稿；人工确认才入库。

回收与状态：

划转 / 回收 / 换产品 / 换户管全部走历史段，不得覆盖；当前态必须更新。
取消 Demand：已 Allocate 且已有消耗 → 不回收。
取消后 ≤1 天闲置未消耗 → 人工确认批量回收。
>1 天闲置未消耗 → 可自动回 Pool。
回收后回 Pool，解除 Member/Demand 后可再分配。
封禁 / 受限 / 停用由户管改状态并触发 Alert。封禁态不可进 Pool。
BM_A → BM_B：Account ID 不变；只追加 PlatformAsset 历史段；旧段不可删。
全生命周期动作需要支持批量处理（实现可在 STEP 17 起逐步落地）。

三种关系永远分开：渠道提供方 / 团队使用权 / 户管维护。
PlatformAsset 不写死在 AdAccount.bmId。
Media 可扩展；申请单字段按媒体配置。

Alert：Shortage / 交付逾期 / Credential / Sync / 闲置待回收进入正式待办，
动作可指向建单或 Allocate。

Finance 边界：结算 = Media Spend + Service Fee；资金 = 打款 / 退款 / 账本。细则 STEP 23。
Dashboard 只 Observe / Discover / Drill Down，不在总览改资产。

账户生命周期（会签图）：

进户（Order 确认 / 导入 / Sync 确认）
→ AVAILABLE（在池，可匹配）
→ Allocate
→ IN_USE
→ 回收回 AVAILABLE
或 BANNED / RESTRICTED / DISABLED（默认不进 Matching Pool）

Media 接入分工：

Connector 实现由研发按平台交付。
Credential、同步范围、字段映射由系统使用者在配置底座完成（STEP 19–20 Mock，STEP 30 真实）。
不得要求每接一个已有平台的账户数据都改后端代码。

Sync：以媒体侧存在性为准。FFJ 有而媒体无 → 导入异常预警 + 人工审核。
API 可见范围大于本公司库存时，未确认入库的户不得进入可分配 Pool。

STEP 15 验收：本节与 check.txt TG 主路径无冲突；Domain 差距清单见 phase_15.md。
建库前必须通过 STEP 24 E2E。