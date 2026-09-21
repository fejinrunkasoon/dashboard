---
name: Phase 15 Domain Checkpoint Completed
overview: Phase 15 已完成 Domain 检查点。规则以 plan §41 冻结；代码缺口按 STEP 16/17/18/25 后置。不建库。下一步 Phase 16 UX Parity。
todos:
  - id: domain-freeze-doc
    content: 冻结文档对齐 plan §41（Order/回收/Credential/闲置/户管/Product type）
    status: completed
  - id: media-master-rules
    content: 明确 MediaPlatform / PlatformAssetType 可管理边界、停用策略、下游影响面
    status: completed
  - id: gap-checklist
    content: Prototype → 后续 Mock/ERD 差距清单（externalOrderNo、状态机、闲置时钟、Credential 警告）
    status: completed
  - id: accept-phase15
    content: 验收；Completed + Proposed Phase 16 UX Parity（非 ERD）
    status: completed
isProject: false
---

# Phase 15 — Domain Checkpoint（Completed）

对齐 [plan.md](plan.md) STEP 15 / §41。Phase 14 Dashboard 已完成。

本步是文档闸门。**验收通过不等于代码已实现。** 下一步是 [phase_16.md](phase_16.md) Channel / Team UX Parity，不是 PostgreSQL ERD。建库在 STEP 24 E2E 通过之后（[phase_25.md](phase_25.md)）。

## 已冻结（以 plan §41 为准）

| 主题 | 规则 |
|------|------|
| Demand | 团队成员可建；团队管理者审批；可改可取消；不能挑具体账户 |
| 申请字段 | Media、Quantity、Product、Timezone（`GMT+N`/`GMT-N`）、Expected Date、Priority、Reason + 按 media 配置的 media-specific |
| Product | INTERNAL/EXTERNAL = Product type；不用细 ProductCategory 推导归属 |
| Allocate | 一次写齐 Team / Member / Product / 户管；改 Member 不自动改户管 |
| 池资格 | BANNED 不进 Matching Pool |
| Credential | 失效时列表仍可展示；点击 Allocate 必须提醒重连；仍允许分库存户；并行 Alert |
| Order | 业务主对象；`orderNo` + `externalOrderNo`；必挂 Demand；禁止无 Demand 补库 |
| 交付 | 入库 ≠ 分配；同单续交至满；超交进 Pool 不挂本 Demand；已交付不可撤回；AI 只出草稿 |
| TG | 通讯层。模拟 = STEP 18；真实 Bot = STEP 29。需求源 [check.txt](check.txt) |
| 回收 | 有消耗不回收；取消后 ≤1 天闲置须人工批量回收；>1 天闲置可自动回 Pool |
| 历史 | 划转/回收/换产品/换户管/BM 迁移全部走历史段；旧段不可删；当前态必须更新 |
| 关系 | 渠道提供方 / 团队使用权 / 户管维护三者分开；不写死 `AdAccount.bmId` |
| Finance | 结算 = Media Spend + Service Fee；资金 = 打款/退款/账本。细则 STEP 23 |
| Dashboard | 只观察、发现、下钻，不在总览改资产 |

账户生命周期：进户 → `AVAILABLE`（可匹配）→ Allocate → `IN_USE` → 回收回 `AVAILABLE`，或 `BANNED` / `RESTRICTED` / `DISABLED`（默认不进 Matching Pool）。

## Media 主数据边界

对照 [app/domain/media.ts](app/domain/media.ts) 的 `MediaPlatform` / `PlatformAssetType`。

- 可停用，不物理删除已被渠道、账户或申请单引用的记录。
- 停用后：新申请、新筛选、新 Connector 绑定不可再选；已有账户与历史单保留。
- 谁可改：系统管理数据字典，实现在 STEP 19 Mock。本步不做 CRUD 页。
- 下游：渠道 `supportedMedia`、账户筛选、Demand media-specific 字段都读主数据，不得写死 Meta / Google / TikTok 联合类型。

## 代码差距（本步不改行为）

| 缺口 | 现状 | 落地 |
|------|------|------|
| `externalOrderNo` 与 §14 状态机 | [channel-order.ts](app/domain/channel-order.ts) 只有 `orderNo`；状态为 `DRAFT/PENDING/PROCESSING/PARTIALLY_DELIVERED/COMPLETED/CANCELLED`，缺 `PENDING_CONFIRM/ACCEPTED/REJECTED/TIMEOUT/PARTIAL_CLOSED` 等 | STEP 17–18 |
| 仅团队管理者可审批 | [demand.ts](app/domain/demand.ts) 有 `SUBMITTED/APPROVED`，无审批人写规则 | STEP 17 |
| 闲置时钟、>1 天自动回收、Allocate 前 Credential 警告、BANNED 排除 Matching | 类型未成文 | STEP 17 |
| 渠道/团队 CenterNav、Filters、分页 | 列表仍是 keyword | STEP 16，见 [phase_16.md](phase_16.md) |
| Postgres 表（`external_order_no`、闲置字段、媒体主数据） | 无库 | STEP 25，见 [phase_25.md](phase_25.md) |

## 本步回写

- [phase_one.txt](phase_one.txt) 文首：建库顺序指向 plan §40。
- [phase_one.txt](phase_one.txt)「四十五」：补 `externalOrderNo`、禁止无 Demand 补库、模拟/真实 TG 分步。

## 不做

- Vue 页面、Mock 写路径、筛选或导航
- 给 `ChannelAccountOrder` 加字段（Phase 17）
- PostgreSQL、真实 Telegram、真实 Media API

## 下一步

见 [phase_16.md](phase_16.md) Proposed Phase 16 — Channel / Team UX Parity。
