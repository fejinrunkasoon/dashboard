---
name: Phase 22 Batch Import
overview: Phase 22 Completed。账户中心 Excel/CSV 批量导入与异常队列（缺失 Account ID 补录）Mock。入库 AVAILABLE，不自动 Allocate。
todos:
  - id: domain-intake
    content: batch-import domain、accountIntake、CSV import-table
    status: completed
  - id: batch-import-service
    content: batchImportService Mock：模板、校验、确认、异常补录、种子 Job
    status: completed
  - id: accounts-import-ui
    content: AccountCenterNav + /accounts/import
    status: completed
  - id: accept-phase22
    content: 验收进池不 Allocate、缺失 ID 走队列补录
    status: completed
isProject: false
---

# Phase 22 — Batch Import / 数据治理（Mock）

**Status: Completed**

对齐 [plan.md](plan.md) STEP 22 / §41 进户通道与 [check.txt](check.txt)「八、Excel 批量导入账户」「九、缺失账户 ID」。前置 STEP 20。STEP 21 Media Sync 仍未落地；本阶段抽出可复用进户内核，不实现 Sync。

## 已做

1. Domain：[app/domain/batch-import.ts](app/domain/batch-import.ts) — Job / Row / IssueCode；模板列冻结
2. 共享进户：[app/services/accounts/intake.ts](app/services/accounts/intake.ts) — `intakeAdAccount`（`ORDER` | `BATCH_IMPORT` | `MEDIA_SYNC`）；写 `AVAILABLE` + 渠道段 + 可选 PlatformAsset 段；不写 Team/Demand Assignment。Order 确认入库改为调用该函数
3. CSV 解析：[app/utils/import-table.ts](app/utils/import-table.ts)（UTF-8 BOM、引号）。模板下载复用 [app/utils/export-table.ts](app/utils/export-table.ts)
4. `batchImportService`：上传 CSV → 校验预览 → 确认合法行 → 异常队列补录后再校验。种子 Job `bij-seed-001`（合法 / 缺失 ID / 已存在 / 文件内重复）
5. 账户中心二级导航「数据导入」→ [`/accounts/import`](app/pages/accounts/import.vue)：导入向导与异常队列同页

## 不做

- Media Sync Job / Discovery（STEP 21）
- 团队 Excel 导入、Google Sheets / WPS
- 独立「缺失 Account ID」菜单
- xlsx 上传解析（仅下载 xlsx 模板；上传为 CSV）
- 新 Alert 类型；PostgreSQL；真实对象存储

## 验收记录

Service 脚本（jiti 加载 Mock）：

1. 种子 5 行：合法 2、异常 3（`MISSING_ACCOUNT_ID` / `ALREADY_IN_FFJ` / `DUPLICATE_IN_FILE`）
2. 确认导入写入 `acc-imp-*`，`assetStatus = AVAILABLE`，无进行中 Assignment
3. 补录缺失 ID 后再次确认，新户进池且未分配
4. 上传 CSV：未知媒体与空 Account ID 进异常，合法行可入库

页面：本环境 dev server 未保持监听，浏览器未点选。逻辑由 Service 验收覆盖。

## 下一步

STEP 23 — Finance / Reconciliation（Mock 完整交互）。
