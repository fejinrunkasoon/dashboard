---
name: Phase 23 Finance Reconciliation
overview: Phase 23 Completed。渠道 Finance / Reconciliation Mock：打款地址审核、Service Fee Policy+Tier CRUD、账户换绑、退款登记确认、账单对系统 Media Spend 对账。无账本。
todos:
  - id: address-approval
    content: 打款地址提交/变更/团队负责人审核，并加固仅 ACTIVE 可登记打款
    status: completed
  - id: policy-crud
    content: 渠道内 Policy+Tier CRUD、区间校验、账户历史段换绑；月结展示命中档
    status: completed
  - id: refund-write
    content: 退款登记与确认/驳回；不回写余额
    status: completed
  - id: reconciliation-mock
    content: 渠道对账 Tab：账单 vs 系统 Media Spend，差异超阈值写 Alert
    status: completed
  - id: accept-phase23
    content: Service 验收；写 phase_23.md
    status: completed
isProject: false
---

# Phase 23 — Finance / Reconciliation（Mock）

**Status: Completed**

对齐 [plan.md](plan.md) STEP 23 / §34 / §41。前置 [phase_22.md](phase_22.md)。结算与资金分开；不做 Fund Ledger / Available Balance。

## 已做

1. Domain：[app/domain/finance.ts](app/domain/finance.ts)
   - `ChannelPaymentAddress` 审核字段（`approverTeamId`、提交/审核人、备注）
   - `ChannelReconciliation`
   - `FINANCE_OPERATOR_MEMBER_IDS` / `RECONCILIATION_VARIANCE_THRESHOLD` / `isFinanceOperator`
2. Tier 校验：[app/utils/service-fee-calculator.ts](app/utils/service-fee-calculator.ts) `assertServiceFeeTiers`（无空洞/重叠，末档可开区间）
3. `channelService` 写路径：[app/services/channels/mock.ts](app/services/channels/mock.ts)
   - 地址：submit / update（回待审）/ approve·reject（团队负责人）/ disable
   - Prepayment：仅 ACTIVE 地址
   - Policy+Tier CRUD；停用后不可新绑
   - Refund 登记 / 确认 / 驳回（不改结算）
   - Reconciliation：账单录入 → 系统 Media Spend（结算 Service）→ 差异；>|5%| 写 `RECONCILIATION_VARIANCE`
4. 账户换绑：`accountService.changeFeePolicy` 结束旧段、开新段，更新当前 `serviceFeePolicyId`
5. UI：渠道详情 Finance Tab（政策 / 地址 / 打款 / 退款）+ Reconciliation Tab；账户详情 Product Tab「换绑政策」
6. 预警筛选项增加 `RECONCILIATION_VARIANCE`

## 不做

- Fund Ledger / Available Balance
- 复杂 RBAC / PostgreSQL / 真实支付
- Policy 进数据字典
- 累进拆档、假余额充值、对账 PDF / 文件解析
- TG 开户费草稿实体

## 验收记录

`./node_modules/.pnpm/node_modules/.bin/jiti ./scripts/phase23-accept.mts`：

1. 待审地址不能登记打款；非负责人不能通过；负责人通过后可打款
2. Tier 空洞拒绝；停用政策不能换绑
3. 换绑开新历史段；月结按月初中点命中旧档（月中换绑不改写当月结算）
4. 退款确认不改变 settlementCost
5. 对账差异超 5% 写 Alert；可确认对账单

页面：本环境未做浏览器点选；交互由 Service 验收覆盖。

## 下一步

STEP 24 — E2E Business Walkthrough Gate（见 [phase_24.md](phase_24.md)）。未通过不得建库。
