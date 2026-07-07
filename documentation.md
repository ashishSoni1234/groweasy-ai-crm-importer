# 🏗️ GrowEasy AI CRM Importer — Architecture & Documentation

Welcome to the technical documentation for the GrowEasy AI CRM Importer. This document explains the system architecture, the technology stack chosen, the trade-offs made during development, and the overall data flow.

---

## 💻 Tech Stack

### Frontend (Client-Side)
- **Framework:** Next.js (App Router) + React 18
- **Styling:** Tailwind CSS
- **Icons & UI:** Lucide React, Framer Motion (for smooth animations)
- **Features:** 
  - Drag-and-drop file upload zone.
  - Multi-step visual progress indicator.
  - Real-time animated processing view.
  - Interactive data table to review extracted CRM records.

### Backend (Server-Side)
- **Runtime & Framework:** Node.js + Express.js + TypeScript
- **AI Integration:** Groq SDK (Powered by `llama-3.3-70b-versatile`)
- **Data Parsing:** `csv-parse` (streaming parser) and `multer` (for handling multipart form data)
- **Testing:** Jest + `ts-jest` for robust backend unit tests.

### Infrastructure & Tooling
- **Containerization:** Docker + Docker Compose (ensuring consistency across environments)
- **Code Quality:** ESLint & TypeScript strictly configured.

---

## 🏛️ System Architecture

The application is built on a decoupled Client-Server architecture.

### Data Flow
1. **Upload Phase:** The user uploads an unstructured CSV file via the Next.js frontend.
2. **Transmission:** The frontend POSTs the file as multipart/form-data to the `/api/import` endpoint on the Express backend.
3. **Parsing:** The backend parses the CSV strictly into JSON row objects using `csv-parse`. Empty lines and bad encodings (like UTF-8 BOM) are handled automatically.
4. **Batch Processing:** 
   - To prevent overwhelming the LLM context window and hitting token limits, the backend chunks the CSV rows into **batches of 10**.
   - Each batch is sent asynchronously to the AI service.
5. **AI Extraction (`llama-3.3-70b` via Groq):** 
   - A highly optimized System Prompt dynamically maps ambiguous column names (e.g., "Full_Name", "Cell", "Source") into the 15 standard CRM fields.
   - The LLM forces output in strict JSON format (`response_format: { type: 'json_object' }`).
6. **Validation & Fallback:**
   - The returned records run through a strict validation layer (`validateCrmRecord`).
   - *Date Fallbacks:* If the AI fails to determine a date, the backend automatically intercepts and injects the current ISO date.
   - *Enum Verification:* Statuses like `crm_status` and `data_source` are checked against allowed enums; invalid ones are stripped.
   - *Skip Logic:* Any row missing both an email and a phone number is flagged and segregated into a `skipped` array.
7. **Response Aggregation:** Once all batches complete, the backend aggregates the successful and skipped records and returns them to the frontend.
8. **Review & Download:** The frontend displays the results in a data table and provides a 1-click option to download the final standardized CSV.

---

## ⚖️ Trade-Offs & Decisions

### 1. Choice of AI Model: Llama-3.3-70B via Groq
- **Trade-off:** We could have used OpenAI (GPT-4o), but Groq's LPU infrastructure provides unprecedented inference speeds. For a data processing pipeline where users wait synchronously for a CSV upload, **latency is king**. Llama-3.3-70B is smart enough to handle complex semantic mapping, and Groq ensures it finishes in milliseconds.
- **Cost:** Groq is significantly more cost-effective for batch processing large datasets compared to GPT-4.

### 2. Batch Processing Size (10 rows per batch)
- **Trade-off:** Processing the entire CSV in one giant prompt is risky. It increases the chance of hallucination, exceeds token limits, and makes retry logic harder.
- **Decision:** We chunked the data into sizes of 10. If one batch fails due to a rate limit or bad parse, only those 10 rows are retried (up to 3 times with exponential backoff), leaving the rest of the extraction unaffected.

### 3. Backend Safety Net (Defense in Depth)
- **Trade-off:** Trusting LLM output blindly is dangerous, even with strong prompts.
- **Decision:** We implemented a two-tier rule system. The LLM is instructed to format data and apply skip logic, but the Express backend **re-verifies** every single field. If the LLM forgets to use today's date, the backend catches it and fixes it via `new Date().toISOString()`. This guarantees the database receives 100% compliant data.

### 4. Client-Side Rendering vs Streaming
- **Trade-off:** We currently use a standard POST request and wait for a single JSON response. For massive CSVs (10,000+ rows), this could cause an HTTP timeout.
- **Future Improvement:** Transition the API from a standard REST endpoint to Server-Sent Events (SSE) or WebSockets. This would allow the frontend to stream records into the UI one batch at a time, providing a true real-time experience.

---

## 🧪 Testing Strategy
We focused our unit tests on the most critical parts of the application: the **Data pipeline**.
- **`aiExtractor.test.ts`**: Ensures enum constraints, date fallback logic, and structure integrity never break.
- **`batchProcessor.test.ts`**: Validates the batch chunking logic, retry-on-failure backoff, and aggregated skipped vs. imported logic.
- **`csvParser.test.ts`**: Ensures resilient CSV reading (ignoring BOMs, trailing spaces, empty lines, and carriage returns).
