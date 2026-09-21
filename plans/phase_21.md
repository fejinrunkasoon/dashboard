---
name: Phase 21 Media Sync
overview: Phase 21 Completed。Media Sync Mock：Meta 发现、去重、人工确认导入账户库，以及 FFJ 有而媒体无的存在性预警。无真实 OAuth / API，不做 Excel 导入。
todos:
  - id: domain-sync
    content: SyncJob / SyncLog / DiscoveredAccount domain
    status: completed
  - id: service-mock
    content: MediaSyncService Mock 与共享入库 intakeAdAccount
    status: completed
  - id: alert-wire
    content: API_ACCESS_LOST / SYNC_FAILED 接线与预警筛选项
    status: completed
  - id: sync-ui
    content: /settings/sync 工作台、导航与导入 Modal
    status: completed
  - id: accept-phase21
    content: Mock 验收发现 / 导入 / 对账；写 phase_21.md
    status: completed
isProject: false
---

# Phase 21 — Media Sync Mock

**Status: Completed**

对齐 [plan.md](plan.md) STEP 21 / §15 / §16 / §31 / §32.1 / §41。前置 [phase_20.md](phase_20.md) Connector 配置底座。

## 已做

1. Domain：[app/domain/sync.ts](app/domain/sync.ts) — `SyncJob` / `SyncLog` / `DiscoveredAccount`（`NEW` | `ALREADY_IN_FFJ` | `CONFLICT`；导入 `PENDING` | `IMPORTED` | `SKIPPED`）
2. Meta 发现目录：[app/services/connectors/meta/mock-catalog.ts](app/services/connectors/meta/mock-catalog.ts)（3 条已在库 + 4 条 NEW；故意不含 `act_300001`）
3. `mediaSyncService`：[app/services/media-sync/mock.ts](app/services/media-sync/mock.ts)
   - 仅 Meta + `MOCK_CONNECTED` + `discoverAccounts` + `DISCOVERY`
   - 去重 `(mediaId, externalAccountId)`
   - 确认导入走共享 [app/services/accounts/intake.ts](app/services/accounts/intake.ts)（`AVAILABLE`，不 Allocate）
   - 应用 ACTIVE `ACCOUNT_MAP`
   - 对账：FFJ 有而媒体无 → `apiAccessStatus=LOST` + `API_ACCESS_LOST`
   - 作业失败 → `SYNC_FAILED`
4. 预警中心类型筛选项增加 `API_ACCESS_LOST` / `SYNC_FAILED` / `CREDENTIAL_EXPIRED`
5. `/settings/sync` 工作台 + 系统管理「媒体同步」；日志中心「同步日志」指向同一页
6. 数据接入页去掉「不执行 Sync」；发现开关链到同步页
7. 账户详情 API Data Tab 展示 `lastSyncAt` / `apiAccessStatus` 与相关 Sync Log

## 不做

- Excel 批量导入（STEP 22）
- 真实 OAuth / Media API（STEP 30）
- Spend / Status 真实拉取
- PostgreSQL

## 验收记录

Mock Service（Meta credential `mcred-meta-ops`）：

1. 发现成功：7 条 = NEW 4 + 已在库 3；`missingInMedia` 1
2. 确认导入 1 条 → `acc-sync-*`，`AVAILABLE`，在 Matching Pool
3. 未确认的 NEW 外部 ID 不在账户库
4. 再次导入同一条被拒绝（状态已 `IMPORTED`）
5. `acc-case-d`（`act_300001`）对账为 `API_ACCESS_LOST`，`apiAccessStatus=LOST`
6. Google credential 拒绝发现（非 Meta）

本环境未开浏览器自动化；页面行为由 Service 验收覆盖。

## 下一步

STEP 22 — Batch Import / 数据治理（Excel 模板；缺失 Account ID 走异常队列）。与本步发现确认入库是两条进户通道。
