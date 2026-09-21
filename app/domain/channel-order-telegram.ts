import type { ChannelOrderRejectReason } from './channel-order'

export type MockInquiryButtonState = 'OPEN' | 'ACCEPTED' | 'REJECTED' | 'TIMEOUT'

export interface MockTelegramInquiry {
  orderId: string
  messageId: string
  sentAt: string
  buttonState: MockInquiryButtonState
}

export interface MockTelegramDeliveryReply {
  orderId: string
  replyToMessageId: string
  rawText: string
  receivedAt: string
}

export interface DeliveryParseDraftAccount {
  externalAccountId: string
  name?: string | null
}

export interface DeliveryParseDraft {
  orderId: string
  externalOrderNo: string | null
  claimedQuantity: number | null
  accountIds: DeliveryParseDraftAccount[]
  bmIds: string[]
  confidence: number
  rawText: string
  parsedAt: string
}

export type DeliveryValidationIssueCode =
  | 'EMPTY_PARSE'
  | 'MISSING_ACCOUNT_ID'
  | 'INVALID_ACCOUNT_FORMAT'
  | 'DUPLICATE_IN_BATCH'
  | 'DUPLICATE_IN_POOL'
  | 'QUANTITY_MISMATCH'
  | 'EXTERNAL_ORDER_MISMATCH'
  | 'OVERFLOW'

export interface DeliveryValidationIssue {
  code: DeliveryValidationIssueCode
  message: string
}

export interface DeliveryValidationResult {
  ok: boolean
  /** Soft warnings (e.g. overflow) — still allow human confirm. */
  warnings: DeliveryValidationIssue[]
  /** Hard errors — block confirm; may map to PARSING/QUANTITY_EXCEPTION. */
  errors: DeliveryValidationIssue[]
  exceptionStatus: 'PARSING_EXCEPTION' | 'QUANTITY_EXCEPTION' | null
}

export const CHANNEL_ORDER_REJECT_REASON_OPTIONS: {
  value: ChannelOrderRejectReason
  label: string
}[] = [
  { value: 'OUT_OF_STOCK', label: '暂时无货' },
  { value: 'INSUFFICIENT_QTY', label: '数量不足' },
  { value: 'SPEC_MISMATCH', label: '规格无法满足' },
  { value: 'PAUSE_SUPPLY', label: '暂停下户' },
  { value: 'OTHER', label: '其他' }
]

/** Sample Reply text for Mock Delivery panel (check.txt style). */
export const MOCK_DELIVERY_REPLY_SAMPLE = `开户申请 - 部分完成
下户ID：827
平台：Facebook
账户数：7
已下户：4

Alpha Ads (act_100001)
Beta Ads (act_100002)
Gamma Ads (act_100003)
Delta Ads (act_100004)

BM：
bm_9001
bm_9002`
