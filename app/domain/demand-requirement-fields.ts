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

export const DEMAND_TIMEZONE_OPTIONS: { label: string; value: string }[] = [
  { label: 'GMT+8', value: 'GMT+8' },
  { label: 'GMT+0', value: 'GMT+0' },
  { label: 'GMT-5', value: 'GMT-5' },
  { label: 'GMT-7', value: 'GMT-7' },
  { label: 'GMT-8', value: 'GMT-8' }
]

const commonTimezoneField: DemandRequirementFieldDef = {
  key: 'timezone',
  label: 'Timezone',
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
