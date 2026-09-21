---
name: Phase 24 E2E Walkthrough Gate
overview: Phase 24 Completed。主链 Mock 走查通过（Demand→池分→Shortage→模拟 TG→入库→再 Allocate→闲置回收→Alert）。未改 Finance、未建库。下一步 Phase 25 ERD。
todos:
  - id: walkthrough-script
    content: 用 jiti 脚本跑通审批、池分配、Shortage 建单、模拟 TG 入库、再 Allocate、闲置回收与 Alert 反例
    status: completed
  - id: browser-chain
    content: 调度、渠道订单、预警页可打开；点击链受环境限制未在浏览器内点选
    status: completed
  - id: fix-blockers
    content: 主链无产品阻断；未做 STEP 23、未建库
    status: completed
  - id: accept-phase24
    content: 验收写入本文；允许进入 phase_25 ERD
    status: completed
isProject: false
---

# Phase 24 — E2E Business Walkthrough Gate

**Status: Completed**

对齐 [plan.md](plan.md) STEP 24 / §41。前置 Phase 17–22 已完成。本闸门不实现 STEP 23 Finance，不建 PostgreSQL。

可重复脚本：[scripts/phase24-e2e-walkthrough.ts](scripts/phase24-e2e-walkthrough.ts)

```bash
node_modules/.pnpm/node_modules/.bin/jiti scripts/phase24-e2e-walkthrough.ts
```

## 验收记录

脚本结果：**42 passed, 0 failed**。新造数据，不改种子文件。

1. **审批。** 成员 `createDemand` + `submit` → `SUBMITTED`。非负责人 `mem-lisi` 审批失败。未审批 `allocate` 失败。Team A 负责人 `mem-wangwu` 通过后为 `APPROVED`。
2. **池分配。** `acc-banned-1` 不在 Matching Pool，Allocate 拒绝。种子 `acc-pool-meta-1`（`apiAccessStatus=LOST`）仍可分配，并写出 `CREDENTIAL_EXPIRED`。主链分配 `acc-pool-meta-2` 一次写入 Team / Member / Product / 户管，当前 Assignment 无 `endedAt`，Demand 为 `PARTIALLY_ALLOCATED`。
3. **Shortage 建单。** 申请 3、池内匹配 1、分配 1 后 `shortage=2`，`POOL_SHORTAGE` 可按 `relatedDemandItemId` 筛到。缺 Demand 或未知 Item 建单失败。成功单带 `externalOrderNo` 与 `relatedDemandItemId`。
4. **模拟 TG。** `sendMockInquiry` → `acceptMockInquiry` → 部分 Reply → `confirmDeliveryFromDraft`。入库户 `AVAILABLE`、`sourceChannelId=ch-alpha`、无进行中 Assignment。续交带 `OVERFLOW` 警告后至 `DELIVERED`，`deliveredQuantity` 不超过申请量，超交户进池且当时不增加本 Demand 的 `allocatedQuantity`。已交付取消为 `PARTIAL_CLOSED`，已入库户不撤回。
5. **再 Allocate。** 用部分交付与续交户闭合同一 Demand Item → `FULFILLED`。对应 Shortage Alert 经 `resolveShortageAlertsForDemandItem` 关闭。
6. **闲置回收（独立 Demand，申请量 2 只分配 1，避免 `FULFILLED` 不可取消）。** 分配后有消耗不回收。相对 `MOCK_TODAY`（2026-09-16）闲置超过 1 天自动回 Pool。不超过 1 天进入 `pendingManualAccountIds`，`confirmManualIdleRecycle` 后回 Matching Pool。种子日消耗会挡住闲置判断，脚本在断言前清掉该户分配日之后的 spend 行，不改 `spend-daily.ts`。
7. **Alert。** Shortage 待办带 `relatedDemandItemId`，页面可跳 `/accounts/scheduling` 与 `openOrder=1`。`acknowledge` → `IN_PROGRESS`，`resolve` → `RESOLVED`。Credential Alert 与 Shortage 并存。

反例一并通过：Confirm Delivery 后 Demand 仍为部分分配；无 Demand 不能建 Order；BANNED 不进池。

## 页面

本环境无浏览器自动化工具。Dev server 在 `NODE_OPTIONS=--experimental-require-module` 下启动后，下列路由返回 200：

- `/teams/demands`（标题「团队需求」）
- `/teams/team-a`
- `/accounts/scheduling`（标题「需求调度」）
- `/channels/ch-alpha?tab=orders`
- `/alerts`（标题「预警与待办」）

未在浏览器里点选提交、分配、询单、确认入库。交互入口已在源码中：调度页「去分配」/ LOST「确认并分配」/ Shortage 建单；渠道详情「发送模拟询单」与人工确认入库；预警页 `goAllocate` / `goCreateOrder`。闲置 `>1` 天分支以脚本为准。

非阻断：团队详情与渠道详情的 `load()` 内调用 `useSeoMeta` 会打出 Nuxt E1001，页面仍返回 200。未改。

## 不做

- STEP 23（打款地址审核、Policy/Tier CRUD、Refund、Ledger、正式对账）
- PostgreSQL / ORM / Server API / 真实 Telegram / 真实 Media API
- 新页面、新领域对象、改一级导航

主链无产品缺陷需要修。通过本闸门后允许开始 [phase_25.md](phase_25.md) ERD，不在本阶段做 Migration。

## 下一步

STEP 25 — PostgreSQL ERD。
