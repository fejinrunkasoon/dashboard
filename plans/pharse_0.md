Phase 0（STEP 0 项目代码审计）已完成，在此停下，等你确认后再做 Phase 1。

对照 plan.md 看过现有 Nuxt 原型。完整对照表在 Phase 0 代码审计，可在对话旁打开（这是一份独立的结构化审计，比纯文字表格更好扫）。

结论：可以进 Phase 1，但不要直接继续堆页面。 导航和运营总览壳已经能用；Domain / Service / Query 层几乎还没有。

已经对齐

技术栈：Nuxt 4 + Vue 3 + Nuxt UI，暗色 + green primary
未接 PostgreSQL / ORM / 真实 Media / Telegram（符合当前禁止项）
一级导航与系统管理子项名称已按计划改过
Dashboard 视觉（KPI、趋势、自家/外接、资产结构）可保留，后期再接 Domain 数据
账户列表、预警认领/处理有雏形
主要缺口（Phase 1 要先打地基）

媒体写死：Media = 'Meta' | 'Google' | 'TikTok'，筛选和图表同样硬编码，与计划冲突
Domain 不完整：缺 MediaPlatform、PlatformAsset、户管与投放成员分离、产品品类/客户、分配历史、渠道下户单等；账户上直接存 productType
没有 Service 边界：页面 useFetch('/api/...')，逻辑堆在 pages/*.vue（账户页约 560 行）；/api/demands 有数据但 UI 没用
账户中心 IA 未展开：账户池、需求调度、媒体资产、分析、/accounts/:id 都不存在
越界与分叉：渠道充值、对账表已做成业务；/settings/members|notifications|security 是死路由/副本；总览「+」仍链到这些旧页
确认后建议的 Phase 1（仅 STEP 1 Foundation）

动态 MediaPlatform + 核心 Domain Types
Service Interface + 内存 Mock（页面不再直连 Nitro API）
Query / Filter / Table 薄封装和目录分层
清死路由；财务只留入口
请回复是否按上述范围进入 Phase 1，或要先改审计范围。FFJ Phase 0 — 项目代码审计
对照 plan.md STEP 0。范围：现有 Nuxt UI Dashboard 原型 vs Frontend Domain Prototype 目标。采样时间 2026-09-15。未改代码。

结论：可以进入 Phase 1，但不能直接堆页面
一级导航和运营总览壳已经对齐。Domain / Service / Query / 组件分层几乎不存在。 Phase 1（STEP 1 Frontend Foundation）应先建类型与 Mock Service，再动账户中心。
对齐
一级导航 / Dashboard 壳
部分
账户 / 预警页面
缺失
Domain + Service 层
越界
财务 / 死路由 / 写死媒体
对照 plan 的覆盖度
权重按计划优先级估算，不是行数。绿色 = 已有可复用壳；黄 = 页面有、模型不对；灰 = 未做。

Frontend Prototype 覆盖（粗估 28%）
可复用壳 28 · 错位实现 22 · 未建 50
现状：技术栈与边界
项	现状	相对 plan
栈
Nuxt 4.5 / Vue 3 / Nuxt UI 4 / pnpm	符合
视觉
暗色 + green primary（app.config.ts）	符合，Dashboard 暂勿大改
PostgreSQL / ORM
未安装	符合禁止项
真实 Media / Telegram
未接入	符合禁止项
数据
server/api/*.ts 内存假数据 + useFetch	Phase 1 应改为前端 MockService
Zod
依赖已装，业务未用	可留给 Query / Form，不要提前抽象
信息架构：路由 vs 计划
计划入口	现有路由	判定
运营总览
/	可保留视觉，数据未接 Domain
渠道中心
/channels	卡片列表 + 充值弹窗，缺 Detail / Order / Asset
账户中心 · 全部账户
/accounts	单页表格 + Modal，缺子 IA
账户池 / 需求调度 / 媒体资产 / 分析
无	未建
账户详情 /accounts/:id
Modal 代替	未建独立页与 Timeline
团队中心
/teams	卡片 + 成员弹窗，无 Demand 工作台
预警与待办
/alerts	认领/处理闭环有雏形
系统管理子导航
/settings/* 多数已接	死路由与重复页仍在
必须在 Phase 1 前记住的死路由
侧栏已改到新产品与组织路径，但运营总览右上角「+」仍指向模板残留： `/settings/members`、`/settings/notifications`、`/settings/security`。 这三页分别是 organization / products / rules 的近副本。侧栏底部仍有 Nuxt 模板的 GitHub「使用帮助」和「查看页面源码」。

Domain Model 缺口
计划要求独立 Domain Types。现有 `app/types/index.d.ts` 是页面 DTO：扁平、写死媒体、把关系摊在账户上。

计划对象	代码	问题
MediaPlatform
type Media = Meta|Google|TikTok	写死三家；筛选和图表同样硬编码
PlatformAsset
无	没有 BM/MCC/BC 抽象
AdAccount
有，但扁平	无 timezone / manager / platformAsset；productType 存在账户上
Product / ProductCategory / Customer
Product 仅 name+type	自家/外接应经品类推导，禁止账户上打标
AccountAssignment 等历史
AllocationHistory 未接线	转移/回收直接改对象字段
AccountDemand*
Demand + /api/demands	API 存在，UI 零引用
ChannelAccountOrder
无	库存不足链路断
AccountSpend
ConsumptionRecord	仅 Dashboard 趋势用
Member vs Account Manager
仅 TeamMember	计划明确二者不得混
Payment / Reconciliation
类型+页面都有	Finance 本阶段只保留入口
架构层：计划要求 vs 实际目录
应有
domain types / service interfaces / mock services

query models / filter + table framework

`components/accounts|channels|teams|alerts|common|filters`

`useAccounts` / `useAccountFilters` / `useTeams` / `useChannels`

实际
几乎全部逻辑在 `pages/*.vue`（账户页约 560 行）

composables 只有 `useDashboard`（globalFilter 未使用）

业务组件仅 `components/home/*`

页面直接 `useFetch('/api/...')`，无 Service 边界

页面实现质量（相对 Prototype 目标）
面	已有行为	相对计划的偏差
Dashboard	6 KPI、消耗趋势、自家/外接、资产结构	图表系列写死三媒体；缺渠道/团队概览与重要预警下钻；日期范围未真正驱动数据
账户中心	搜索+媒体/状态/类型筛选；转移/回收 toast	媒体选项写死；无户管/资产/时区；无 Clear Filters / Loading / Error；More 动作不全
渠道中心	渠道卡 + 充值改余额	充值属 Finance，本阶段越界；缺订单/资产/详情 Tabs
团队中心	使用率/缺口数字 + 成员弹窗	不能申请账户；Demand 未接入
预警	分类/状态筛选；认领、处理、忽略	处理结果未形成业务动作（划转/下户等）；缺统一空态
系统管理	导航结构已换成计划名称	数据接入页实为渠道资金卡；字典枚举与 Domain AssetStatus 不一致；规则页含对账表
可复用资产（Phase 1 不要推倒）
Phase 1 建议范围（STEP 1 Foundation）
确认后才开工
下列只做地基。不做 PostgreSQL、真实 API、完整财务、复杂 RBAC，也不开始 STEP 2 账户中心重构，除非你明确扩大范围。
#	工作项	目的
1	MediaPlatform 动态模型，去掉 Media 联合类型	筛选/Tabs/图表从数据生成
2	补齐核心 Domain Types（含历史关系，不含完整财务）	冻结信息结构
3	Service Interface + 内存 MockService	页面不再直连 /api
4	Query Model + Filter / Table 薄封装	给账户中心复用
5	目录：domain / services / composables / components/{common,filters}	禁止继续把逻辑堆进 pages
6	清死路由与模板链接；Finance 只留入口	避免原型继续分叉