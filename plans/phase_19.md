---
name: Phase 19 Media CRUD
overview: Phase 19 Completed。系统管理「数据字典」接通 MediaPlatform / PlatformAssetType Mock 增改停用；筛选与新建只消费 ACTIVE。无真实 Media API。
todos:
  - id: domain-status
    content: PlatformAssetType 增加 EntityStatus；种子补 ACTIVE
    status: completed
  - id: service-writes
    content: MediaService 增改停用/启用 + 按 status 读；引用则禁止删除
    status: completed
  - id: dictionary-ui
    content: 重写数据字典页为媒体与 Asset Type 主数据工作台
    status: completed
  - id: downstream-selects
    content: 筛选与新建 Select 只消费 ACTIVE；名称解析仍含停用
    status: completed
  - id: accept-phase19
    content: 验收增改停用再启用；写 phase_19.md
    status: completed
isProject: false
---

# Phase 19 — 数据字典 / Media 主数据 CRUD（Mock）

**Status: Completed**

对齐 [plan.md](plan.md) STEP 19 / §5；Media 边界见 [phase_15.md](phase_15.md)。真实 Connector = STEP 20–21 / 30。

## 已做

- Domain：`PlatformAssetType.status: EntityStatus`；种子四条类型补 `ACTIVE`
- `MediaService`：`getMediaPlatforms` / `getPlatformAssetTypes` 支持 `{ status }`（默认全量，供名称解析）；`create` / `update` / `setStatus`（`ACTIVE` | `DISABLED`）；无物理删除
- 字典页 [`app/pages/settings/dictionary.vue`](app/pages/settings/dictionary.vue)：媒体平台表 + 当前媒体的 Asset Type 表；Modal 增改；停用 / 启用
- Composable [`useMediaMaster.ts`](app/composables/useMediaMaster.ts)；组件在 `app/components/settings/`
- 筛选与新建 Select（账户 / 池 / 分析 / 资产 / 渠道 / 订单 / 需求 / 申请 / 建单）只拿 `ACTIVE`；申请与建单 Modal 打开时重拉 ACTIVE
- 调度 / 详情等名称解析仍用全量列表

## 不做

- 真实 Media API / OAuth / Connector / Sync
- §32.6 普通枚举 CRUD；Policy/Tier；渠道 `supportedMediaIds` 编辑
- PostgreSQL；修正操作日志误链（范围外）

## 验收记录

1. `/settings/dictionary` SSR：四家媒体（含 Snapchat）+ Asset Type 文案（BM / MCC / Business Center / Organization），非写死三家假卡片
2. Mock Service：新增 `X_ADS` + 类型；重复 code 拒绝；停用后不在 ACTIVE 列表、全量仍可解析名称；再启用恢复；停用不删 `platformAssets`
3. 浏览器 MCP 本环境不可用；筛选页 UI 点击未在本机自动化，逻辑由 Select 接线 + Service 覆盖

## 下一步

STEP 20 — Media Connector Framework（Mock）。执行时再建 `phase_20.md`。
