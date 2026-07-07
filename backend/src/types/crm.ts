// CRM Field Types for GrowEasy
export const CRM_STATUS_VALUES = [
  'GOOD_LEAD_FOLLOW_UP',
  'DID_NOT_CONNECT',
  'BAD_LEAD',
  'SALE_DONE',
] as const;

export const DATA_SOURCE_VALUES = [
  'leads_on_demand',
  'meridian_tower',
  'eden_park',
  'varah_swamy',
  'sarjapur_plots',
] as const;

export type CrmStatus = (typeof CRM_STATUS_VALUES)[number];
export type DataSource = (typeof DATA_SOURCE_VALUES)[number];

/**
 * GrowEasy CRM Record — the final structured format
 */
export interface CrmRecord {
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: CrmStatus | '';
  crm_note: string;
  data_source: DataSource | '';
  possession_time: string;
  description: string;
}

/**
 * A raw row from the uploaded CSV — keys are original column headers
 */
export type RawCsvRow = Record<string, string>;

/**
 * Response from the import API
 */
export interface ImportResponse {
  success: CrmRecord[];
  skipped: {
    row: RawCsvRow;
    reason: string;
  }[];
  total_imported: number;
  total_skipped: number;
}

/**
 * Single batch result from AI extraction
 */
export interface BatchExtractionResult {
  success: CrmRecord[];
  skipped: {
    row: RawCsvRow;
    reason: string;
  }[];
}
