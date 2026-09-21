---
name: Phase 20 Media Connector Framework
overview: Phase 20 Completed。Media Connector 配置底座（Mock）：注册实现绑定、专属字段、Credential 与同步范围。无真实 OAuth / Sync。
todos:
  - id: domain-service
    content: connector domain、注册表、ConnectorService Mock 与种子
    status: completed
  - id: settings-ui
    content: 数据接入页替换为 Connector 配置工作台
    status: completed
  - id: demand-fields
    content: 申请单 media-specific 字段读 Connector 配置
    status: completed
  - id: accept-phase20
    content: 验收绑定 / 字段出现在申请弹窗 / Mock Credential 不发起同步
    status: completed
isProject: false
---

# Phase 20 — Media Connector Framework（Mock）

**Status: Completed**

对齐 [plan.md](plan.md) STEP 20 / §5 / §15 / §16 / §32.1 / §41。前置 STEP 19 媒体主数据 CRUD 已在数据字典。

## 已做

1. Domain：[app/domain/connector.ts](app/domain/connector.ts) — Binding / Field / Credential / SyncScope
2. 代码注册表：`meta` / `google` / `tiktok` / `snapchat` / `generic`（[app/services/connectors/registry.ts](app/services/connectors/registry.ts)）
3. `connectorService` Mock：绑定、字段 CRUD、Credential 状态、同步范围；校验 ACTIVE 媒体 / Asset Type / 唯一 ACTIVE 绑定
4. 种子：四条绑定 + Meta/Snapchat DEMAND 字段 + Meta MOCK_CONNECTED / Google EXPIRED Credential
5. `/settings` 数据接入页：绑定表 + 专属字段 + Credential/同步范围（替换旧渠道打款卡片）
6. 申请单：`getDemandRequirementFields(mediaId, mediaSpecific)`；media-specific 来自 `connectorService.getDemandFields`

## 不做

- Discovery / Sync Job / 导入（STEP 21）
- 真实 OAuth（STEP 30）
- PostgreSQL；改一级导航；改数据字典 Media CRUD

## 下一步

STEP 21 — Media Sync Mock（发现、去重、导入；Meta 优先）。
