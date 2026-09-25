import type { AccountAssetStatus } from '~/domain'
import type { QualityGroupBy, QualityPivotRow } from '~/services'

/** Build /accounts query for quality pivot drill-down. Returns null when not drillable. */
export function buildQualityDrilldownQuery(
  groupBy: QualityGroupBy,
  row: QualityPivotRow,
  lockedQuery: Record<string, string | string[]> = {}
): Record<string, string | string[]> | null {
  if (!row.drillable) return null

  const query: Record<string, string | string[]> = { ...lockedQuery }

  switch (groupBy) {
    case 'media':
      query.mediaIds = row.key
      break
    case 'channel':
      query.channelIds = row.key
      break
    case 'timezone':
      query.timezone = row.key
      break
    case 'team':
      query.teamIds = row.key
      break
    case 'member':
      query.memberIds = row.key
      break
    case 'manager':
      query.managerIds = row.key
      break
    case 'product':
      query.productIds = row.key
      break
    case 'assetStatus':
      query.assetStatuses = row.key as AccountAssetStatus
      break
  }

  return query
}

export function navigateQualityDrilldown(
  groupBy: QualityGroupBy,
  row: QualityPivotRow,
  lockedQuery: Record<string, string | string[]> = {}
) {
  const query = buildQualityDrilldownQuery(groupBy, row, lockedQuery)
  if (!query) return
  return navigateTo({ path: '/accounts', query })
}
