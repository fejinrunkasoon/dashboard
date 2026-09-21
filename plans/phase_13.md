---
name: Phase 13 Account Analytics Completed
overview: Phase 13 已完成共享质量聚合 analyticsService + 账户分析页 + 渠道/团队质量 Tab；Spend 仅为 Media Spend；行下钻全部账户。
todos:
  - id: analytics-service
    content: analyticsService getQualityPivot（单维 groupBy + Media Spend）
    status: completed
  - id: account-analytics-page
    content: /accounts/analytics + AccountCenterNav「账户分析」+ 预置视图
    status: completed
  - id: quality-tabs
    content: 渠道/团队详情 Quality Tab + QualityPivotTable
    status: completed
  - id: drilldown-accounts
    content: 行下钻 /accounts 映射 groupBy → AccountQuery
    status: completed
  - id: accept-phase13
    content: 验收；Completed + Proposed Phase 14 Dashboard
    status: completed
isProject: false
---

# Phase 13 — Account Analytics（Completed）

对齐 [plan.md](plan.md) STEP 13 / §25.5 / §27 / §29。

## 交付

| 项 | 路径 |
|----|------|
| Service | [analytics/types.ts](app/services/analytics/types.ts) · [mock.ts](app/services/analytics/mock.ts) |
| 表格组件 | [QualityPivotTable.vue](app/components/analytics/QualityPivotTable.vue) |
| 账户分析 | [accounts/analytics.vue](app/pages/accounts/analytics.vue) |
| Nav | [AccountCenterNav.vue](app/components/accounts/AccountCenterNav.vue)「账户分析」 |
| 渠道质量 | [channels/[id].vue](app/pages/channels/[id].vue) Tab `quality`（锁 channelIds） |
| 团队质量 | [teams/[id].vue](app/pages/teams/[id].vue) Tab `quality`（锁 teamIds） |

**原则**：一底座三入口；单维 groupBy；Spend = Media only（无 Fee）；`(none)` 桶不可下钻。

**预置视图**：按渠道 Ban Rate / 按媒体 Spend（仅改 groupBy + sort）。

## 明确未做

- Service Fee / settlementCost 混入质量 Spend
- 列表级渠道/团队质量页
- 双维 / 拖拽透视、持久 Saved View
- PostgreSQL / Connector

## 风险

- mock 全量 list（pageSize 500）聚合；契约按 server-side 书写
- `(none)` 维度不下钻

## 下一步

见 [phase_14.md](phase_14.md) Phase 14 — Dashboard Data Integration（Completed）。
