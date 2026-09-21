---
name: Phase 9 Channel Center Completed
overview: Phase 9 已完成渠道中心 List/Detail、结算只读、ACTIVE 打款地址种子、登记 Prepayment（必选地址）。地址审核与对账归 STEP 25。
todos:
  - id: channel-read-model
    content: ChannelListItem/Metrics/DetailBundle
    status: completed
  - id: payment-address-domain
    content: ChannelPaymentAddress + Prepayment 扩展
    status: completed
  - id: prepayment-write
    content: createPrepayment mock 写
    status: completed
  - id: channel-list-page
    content: channels/index.vue；删除遗留页
    status: completed
  - id: channel-detail-page
    content: [id] 七 Tab + 登记打款 Modal
    status: completed
  - id: accept-phase9
    content: 验收；Proposed Phase 10
    status: completed
isProject: false
---

# Phase 9 — Channel Center（Completed）

对齐 [plan.md](plan.md) STEP 9 / §29 / §34、[`finance_arg.txt`](finance_arg.txt)。

## 交付

| 项 | 路径 |
|----|------|
| 读模型 | [channels/types.ts](app/services/channels/types.ts) · [mock.ts](app/services/channels/mock.ts) |
| 打款地址 Domain | [finance.ts](app/domain/finance.ts) `ChannelPaymentAddress`；种子 [entities.ts](app/mocks/entities.ts) |
| 列表 | [channels/index.vue](app/pages/channels/index.vue) |
| 详情 | [channels/[id].vue](app/pages/channels/[id].vue) + [ChannelDetailHeader.vue](app/components/channels/ChannelDetailHeader.vue) |
| 登记打款 | `createPrepayment`：渠道 + ACTIVE 地址 + 业务归属 + 金额 |

**指标**：交户 scope = `sourceChannelId`；列表/Overview Spend = **Media Spend only**。  
**Finance**：月度结算摘要（`channelSettlementService`）+ 地址只读 + 打款明细/登记 + 退款只读。  
**Reconciliation**：占位 → STEP 23 Finance Mock（原 STEP 25 已重排）。

## 明确未做

- 打款地址新增/团队负责人审核
- Ledger / 余额 / Refund 写 / 正式对账
- Channel Account Order 写（STEP 10）
- 遗留假充值（已删除 `channels.vue`）

## 下一步

见 [phase_10.md](phase_10.md) Phase 10 — Channel Account Order（Completed）。

**Reconciliation / 地址审核**：占位 → STEP 23 Finance Mock（原 STEP 25 已重排）。

## Signoff / UX Delta

列表壳、ChannelCenterNav、Filters、分页 → [phase_16.md](phase_16.md)。
禁止无 Demand 补库等规则 → [plan.md](plan.md) §41 / STEP 17。
