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

当内部账户库存不足时：

Team Demand
↓
Account Pool
↓
发现 Shortage
↓
Channel Account Order
↓
Telegram 与渠道沟通
↓
渠道交付账户
↓
确认入库
↓
Account Pool
↓
满足 Team Demand


====================================================
1. 当前开发阶段
====================================================

当前处于：

Phase 1 — Frontend Domain Prototype

技术栈：

Vue 3
Nuxt
Composition API

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

业务确认后：

Phase 2
→ PostgreSQL Schema

Phase 3
→ Nuxt Server API

Phase 4
→ Media Connector

Phase 5
→ Telegram Automation


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
日志中心
  ├ 操作日志
  └ 同步日志

原则：

不要继续增加大量一级导航。

复杂业务放在：

Page
→ Tabs
→ Detail
→ Drawer / Modal

中完成。


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

Channel

PlatformAsset

AdAccount

Team

Member

ProductCategory

Product

Customer

AccountAssignment

AccountManagerAssignment

AccountProductAssignment

AccountDemand

AccountDemandItem

AccountDemandAllocation

AccountSpend

AccountStatusHistory

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
Allocated 6
Shortage 4

管理员：

选择6个账户
→ Allocate

不足的4个：

→ Channel Account Order


====================================================
13. Channel Account Order
====================================================

当前真实业务通过 Telegram 与渠道沟通下户。

未来目标：

Demand Shortage
↓
创建 Channel Account Order
↓
生成标准Telegram订单
↓
渠道回复
↓
解析Account / Platform Asset
↓
人工确认
↓
Account入库

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

不要第一阶段实现。

未来分三步：

Stage A：

FFJ生成标准Channel Order。

人工通过Telegram沟通。


Stage B：

Telegram Bot自动发送标准订单。


Stage C：

Telegram Bot读取渠道回复。

AI可用于解析：

Account ID
Platform Asset
Timezone
其他信息

但：

AI解析
↓
必须人工确认
↓
正式入库

禁止AI直接修改正式Account资产。


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

库存不足：

Create Channel Order。


25.4 Media Assets

不要叫BM Management。

根据Media动态显示：

Meta → BM
Google → MCC
TikTok → Business Center


25.5 Account Analytics

用于替代原Excel Pivot。

提供：

按Media
Channel
Timezone
Team
Member
Account Manager
Product
Status

分析：

Account Count
Active Count
Idle
Banned
Spend
Ban Rate


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
Finance
Reconciliation
Profile


Finance/Reconciliation：

暂不实现真实业务。


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


库存不足时：

Account Demand
→ Create Channel Order


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
34. Finance暂缓
====================================================

已经识别未来可能存在：

Channel Fund Account
Payment Address
Payment
Fund Ledger
Billing Statement
Reconciliation

但目前：

资金
支付资料
余额
对账

尚需进一步业务访谈。

当前Frontend Prototype阶段：

只保留入口。

不要擅自定义完整财务逻辑。


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

↓

STEP 11
Platform Asset

↓

STEP 12
Alerts

↓

STEP 13
Account Analytics / Pivot Replacement

↓

STEP 14
Dashboard Data Integration

↓

业务确认

↓

STEP 15
Freeze Domain Model

↓

STEP 16
PostgreSQL ERD

↓

STEP 17
Database Migration

↓

STEP 18
Nuxt Server API

↓

STEP 19
Replace MockService with ApiService

↓

STEP 20
Media Connector Framework

↓

STEP 21
Meta Connector

↓

STEP 22
其他Media Connector

↓

STEP 23
Telegram Integration

↓

STEP 24
Finance / Reconciliation