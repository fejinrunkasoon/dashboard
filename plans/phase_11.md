---
name: Phase 11 Platform Asset Completed
overview: Phase 11 已完成账户中心「媒体资产」只读工作台 — 分页读模型、Nav、下钻全部账户。无 CRUD / Connector / Alert。
todos:
  - id: asset-read-model
    content: PlatformAssetListItem + getPlatformAssetList（分页/渠道名/关联账户数）；保留 getPlatformAssets
    status: completed
  - id: assets-page
    content: /accounts/assets 列表 + Search/快筛/Chips/Pagination + URL Query
    status: completed
  - id: nav-wire
    content: AccountCenterNav 增加「媒体资产」
    status: completed
  - id: drilldown
    content: 行操作跳转 /accounts?platformAssetIds=
    status: completed
  - id: accept-phase11
    content: 验收；Completed + Proposed Phase 12 Alerts
    status: completed
isProject: false
---

# Phase 11 — Platform Asset（Completed）

对齐 [plan.md](plan.md) STEP 11 / §6 / §25.4 / §2.1。

## 交付

| 项 | 路径 |
|----|------|
| 读模型 | [media/types.ts](app/services/media/types.ts) `PlatformAssetListItem` / 扩展 `PlatformAssetQuery` |
| Mock 列表 | [media/mock.ts](app/services/media/mock.ts) `getPlatformAssetList`（分页 + typeName/channelName/linkedAccountCount） |
| 页面 | [accounts/assets.vue](app/pages/accounts/assets.vue) |
| Nav | [AccountCenterNav.vue](app/components/accounts/AccountCenterNav.vue)「媒体资产」 |
| 下钻 | `/accounts?platformAssetIds=`（既有 `useAccountFilters` + account list 过滤） |

**保留**：`getPlatformAssets` 供渠道详情 Assets Tab / Confirm Delivery 绑定。

**原则**：类型名来自 `PlatformAssetType`；含 Snapchat Organization；非写死 BM Management。

## 明确未做

- Platform Asset CRUD / 迁移写 UI
- `/accounts/assets/:id` 详情 / Credential 关联
- Media Connector（STEP 21+）
- 账户分析 Pivot（STEP 13）
- 正式 Alerts（STEP 12）
- PostgreSQL

## 风险

- 种子仅约 5 条资产；分页契约已按 server-style 写好
- `linkedAccountCount` 依赖当前 Assignment（`endedAt == null`）

## 下一步

见 [phase_12.md](phase_12.md) Phase 12 — Alerts（Completed）。
