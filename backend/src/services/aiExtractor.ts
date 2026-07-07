import Groq from 'groq-sdk';
import {
  CrmRecord,
  RawCsvRow,
  BatchExtractionResult,
  CRM_STATUS_VALUES,
  DATA_SOURCE_VALUES,
} from '../types/crm';

// Lazy initialization — avoids throwing at startup if key is placeholder
let _groqClient: Groq | null = null;

function getGroqClient(): Groq {
  if (!_groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === 'your_groq_api_key_here') {
      throw new Error(
        'GROQ_API_KEY is not set. Please add your Groq API key to backend/.env'
      );
    }
    _groqClient = new Groq({ apiKey });
  }
  return _groqClient;
}

const MODEL = 'llama-3.3-70b-versatile';

/**
 * The system prompt instructs the AI exactly how to map any CSV columns
 * to GrowEasy CRM fields. This is the core of the intelligent extraction.
 */
const getSystemPrompt = () => `You are a CRM data extraction expert for GrowEasy, a real estate CRM platform.
Today's date is ${new Date().toISOString().split('T')[0]}.

Your task is to map CSV rows (with ANY column names) to the GrowEasy CRM format.

## Output Format
Return ONLY a valid JSON object with this exact structure:
{
  "success": [ ...array of CRM records... ],
  "skipped": [ ...array of { "row": {original row object}, "reason": "why skipped" }... ]
}

## GrowEasy CRM Fields
Each CRM record must have these fields (use empty string "" if not found):
- created_at: Lead creation date. Must be JS new Date() compatible (ISO 8601). If missing, use today's date: ${new Date().toISOString()}.
- name: Full name of the lead. Look for: name, full_name, contact_name, person, lead_name, first+last name combined
- email: Primary email. Look for: email, email_address, mail, e-mail
- country_code: Phone country code (e.g., "+91", "+1"). Look for: country_code, code, phone_code, isd_code
- mobile_without_country_code: Mobile number WITHOUT country code. Look for: mobile, phone, contact, number, cell, telephone
- company: Company/organization name. Look for: company, organization, firm, business, employer, agency
- city: City name. Look for: city, location, town, place
- state: State/province. Look for: state, province, region
- country: Country name. Look for: country, nation
- lead_owner: Person responsible for the lead. Look for: lead_owner, owner, assigned_to, agent, salesperson, rep
- crm_status: MUST be one of: GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE. 
  Map intelligently: "interested" → GOOD_LEAD_FOLLOW_UP, "no answer/busy/not available" → DID_NOT_CONNECT, "not interested/invalid" → BAD_LEAD, "closed/sold/deal" → SALE_DONE. Use "" if unclear.
- crm_note: Combine: remarks, notes, comments, follow-up notes, extra emails, extra phone numbers, any other useful info not fitting elsewhere
- data_source: MUST be one of: leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots. Use "" if none match confidently.
- possession_time: Property possession timeline. Look for: possession, timeline, handover, delivery_date
- description: Any additional description or details about the lead

## Critical Rules
1. SKIP records that have NEITHER an email NOR a mobile number. Add them to "skipped" with reason "No email or mobile number".
2. If multiple emails exist: use the FIRST as email, append rest to crm_note.
3. If multiple phone numbers exist: use the FIRST as mobile_without_country_code, append rest to crm_note.
4. Strip country code from mobile: if mobile is "+919876543210", country_code="+91", mobile_without_country_code="9876543210"
5. crm_status: ONLY use the 4 allowed values or empty string. NEVER invent other values.
6. data_source: ONLY use the 5 allowed values or empty string. NEVER invent other values.
7. created_at must be a valid ISO 8601 date string. If the source date is ambiguous or invalid, default to today's date: ${new Date().toISOString()}.
8. Return ONLY the JSON object. No markdown, no explanation, no code blocks.`;

/**
 * Builds the user message for a batch of raw CSV rows.
 * We include the column headers so the AI understands the data structure.
 */
export function buildUserMessage(rows: RawCsvRow[]): string {
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  return `Extract CRM records from these ${rows.length} CSV rows.

Available columns: ${headers.join(', ')}

Rows to process:
${JSON.stringify(rows, null, 2)}`;
}

/**
 * Validates and cleans a single CRM record returned by the AI.
 * Ensures enum values are valid, strips invalid ones.
 */
export function validateCrmRecord(record: Partial<CrmRecord>): CrmRecord {
  const crm_status = CRM_STATUS_VALUES.includes(record.crm_status as any)
    ? (record.crm_status as CrmRecord['crm_status'])
    : '';

  const data_source = DATA_SOURCE_VALUES.includes(record.data_source as any)
    ? (record.data_source as CrmRecord['data_source'])
    : '';

  // Backend safety net for dates: validate and fallback to today if invalid
  const rawDate = record.created_at || '';
  const parsedDate = new Date(rawDate);
  const created_at =
    rawDate && !isNaN(parsedDate.getTime())
      ? parsedDate.toISOString()
      : new Date().toISOString();

  return {
    created_at,
    name: record.name || '',
    email: record.email || '',
    country_code: record.country_code || '',
    mobile_without_country_code: record.mobile_without_country_code || '',
    company: record.company || '',
    city: record.city || '',
    state: record.state || '',
    country: record.country || '',
    lead_owner: record.lead_owner || '',
    crm_status,
    crm_note: record.crm_note || '',
    data_source,
    possession_time: record.possession_time || '',
    description: record.description || '',
  };
}

/**
 * Extracts CRM records from a batch of raw CSV rows using Groq Llama 3.3.
 * Returns both successfully extracted records and skipped records with reasons.
 */
export async function extractCrmRecords(
  rows: RawCsvRow[]
): Promise<BatchExtractionResult> {
  if (rows.length === 0) {
    return { success: [], skipped: [] };
  }

  const userMessage = buildUserMessage(rows);

  const chatCompletion = await getGroqClient().chat.completions.create({
    messages: [
      {
        role: 'system',
        content: getSystemPrompt(),
      },
      {
        role: 'user',
        content: userMessage,
      },
    ],
    model: MODEL,
    temperature: 0.1,       // low temperature for consistent, precise extraction
    max_tokens: 8192,       // allow enough tokens for large batches
    response_format: { type: 'json_object' }, // enforce JSON output
  });

  const content = chatCompletion.choices[0]?.message?.content;

  if (!content) {
    throw new Error('AI returned empty response');
  }

  let parsed: BatchExtractionResult;
  try {
    parsed = JSON.parse(content) as BatchExtractionResult;
  } catch {
    throw new Error(`AI returned invalid JSON: ${content.substring(0, 200)}`);
  }

  // Validate and clean each returned record
  const rawSuccess = parsed.success || [];
  const validatedSuccess: CrmRecord[] = [];
  const skipped = parsed.skipped || [];

  for (const record of rawSuccess) {
    const validRecord = validateCrmRecord(record);
    
    // Strict backend enforcement: Skip if no email AND no mobile
    if (!validRecord.email && !validRecord.mobile_without_country_code) {
      skipped.push({
        row: record as unknown as RawCsvRow,
        reason: 'No email or mobile number (Filtered by backend)',
      });
    } else {
      validatedSuccess.push(validRecord);
    }
  }

  return {
    success: validatedSuccess,
    skipped,
  };
}
