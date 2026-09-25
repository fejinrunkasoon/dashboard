/**
 * Media-specific Account Demand requirement field definitions.
 * Common timezone stays here; media-specific fields come from ConnectorService (STEP 20).
 */

export type DemandRequirementFieldType = 'text' | 'select'

export interface DemandRequirementFieldDef {
  key: string
  label: string
  type: DemandRequirementFieldType
  required?: boolean
  options?: { label: string; value: string }[]
}

/** Integer GMT offsets (-12 … +14) plus common fractional zones. */
function buildGmtTimezoneOptions(): { label: string; value: string }[] {
  const totalMinutes = new Set<number>()

  for (let hour = -12; hour <= 14; hour++) {
    totalMinutes.add(hour * 60)
  }

  // Common half-/quarter-hour offsets used worldwide
  for (const minutes of [
    -9 * 60 - 30,
    -3 * 60 - 30,
    3 * 60 + 30,
    4 * 60 + 30,
    5 * 60 + 30,
    5 * 60 + 45,
    6 * 60 + 30,
    8 * 60 + 45,
    9 * 60 + 30,
    10 * 60 + 30,
    12 * 60 + 45
  ]) {
    totalMinutes.add(minutes)
  }

  return [...totalMinutes]
    .sort((a, b) => a - b)
    .map((minutes) => {
      const sign = minutes >= 0 ? '+' : '-'
      const abs = Math.abs(minutes)
      const h = Math.floor(abs / 60)
      const m = abs % 60
      const label = m === 0
        ? `GMT${sign}${h}`
        : `GMT${sign}${h}:${String(m).padStart(2, '0')}`
      return { label, value: label }
    })
}

export const DEMAND_TIMEZONE_OPTIONS: { label: string; value: string }[] = buildGmtTimezoneOptions()

const commonTimezoneField: DemandRequirementFieldDef = {
  key: 'timezone',
  label: '时区',
  type: 'select',
  required: true,
  options: DEMAND_TIMEZONE_OPTIONS
}

/** Common timezone only. Pass media-specific fields from connectorService.getDemandFields. */
export function getDemandRequirementFields(
  mediaId: string | null | undefined,
  mediaSpecific: DemandRequirementFieldDef[] = []
): DemandRequirementFieldDef[] {
  if (!mediaId) return [commonTimezoneField]
  return [commonTimezoneField, ...mediaSpecific]
}
