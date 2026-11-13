# MedFlow AI — SYHF MEDATHON (Jeddah) Working MVP

**Arabic-First Emergency Department Self-Intake Kiosk, OpenAI Whisper Voice Transcription, Bilingual SOAP Structurer, and Live FHIR R4 Triage Handover.**

Built for the **Saudi Youth Healthcare Forum (SYHF) MEDATHON in Jeddah** (King Faisal Conference Center), aligned with **Saudi Vision 2030** Healthcare Transformation goals.

---

## 🎯 SYHF MEDATHON Track Alignment

MedFlow AI directly bridges two core SYHF MEDATHON tracks:

1. **Track 1 — Healthcare Crowd & Patient Flow Management:**
   * **Problem in Jeddah EDs & Pilgrim Gateways:** Emergency Department waiting rooms face severe bottlenecks during seasonal/Umrah/Hajj surges and multilingual presentations. Triage nurses spend 4–7 minutes per patient manually typing basic chief complaints, allergies, and current medications before clinical triage even begins.
   * **MedFlow Solution:** A 40-second Arabic-first tablet intake kiosk that captures the patient's voice before they reach the triage desk, flags immediate life-threatening red flags in <1 second, and streams a prioritized queue live to the clinician dashboard.
2. **Track 2 — Healthcare Digital Transformation:**
   * **Problem:** Arabic patient statements (including Hejazi/Gulf dialect phrasing) must be rapidly understood by multinational clinical teams and structured into interoperable electronic medical records.
   * **MedFlow Solution:** Combines **OpenAI Speech-to-Text (`gpt-4o-mini-transcribe` / `whisper-1`)** with **OpenAI Structured Outputs (`gpt-4o-mini`)** and a **deterministic clinical safety floor** to generate bilingual (Arabic + English) SOAP notes, auto-extract allergies/medications, preserve strict data provenance, and export **NPHIES-aligned HL7 FHIR R4 Document Bundles** with LOINC-coded observations.

---

## ✨ What Was Upgraded for the MVP

| Feature | Previous Static Prototype | Upgraded SYHF MEDATHON MVP |
| :--- | :--- | :--- |
| **Voice Transcription (`window.transcribeAudio`)** | Stubbed (`"speech recognition service not connected"`) | **3-Tier Real STT Pipeline:**<br>1. **OpenAI Audio API** (`gpt-4o-mini-transcribe` / `whisper-1`) via `POST /api/transcribe`<br>2. **Live Browser Speech Recognition** (`ar-SA` / `en-US`) parallel fallback<br>3. **1-Click Simulated Arabic Voice** for noisy hackathon stage demos |
| **Clinical NLP & Bilingual Handover** | Raw string concatenation | **AI Clinical Structurer (`POST /api/structure`):** Extracts English & Arabic clinical summaries, Onset/Duration, Pertinent Positives (`+`), Pertinent Negatives (`−`), and auto-fills **Allergies, Medications, and History** mentioned in speech |
| **Clinical Safety Guardrails** | Basic regex only | **Hybrid Safety Floor:** Deterministic vitals + Arabic/English regex with negation detection (`لا أعاني من ألم في الصدر`) acts as an un-bypassable floor; AI can escalate urgency, never downgrade a red flag |
| **Kiosk ↔ Clinician Sync** | Single-tab `localStorage` only | **Real-Time Multi-Device Sync** via Node.js backend (`server.js`) + **Server-Sent Events (`/api/events`)** + persistent local DB (`data/medflow-db.json`) |
| **Jeddah ED Scenarios** | 1 static demo scenario | **4 Realistic Jeddah ED Scenarios:**<br>1. *Acute Chest Pain & Dyspnea (Red Flag · Arabic)*<br>2. *Umrah Visitor Acute Wheezing (Red Flag · Arabic)*<br>3. *High Fever & Persistent Vomiting (Priority · Bilingual)*<br>4. *Minor Sports Ankle Sprain · North Obhur (Standard)* |

---

## 🚀 Quick Start (Zero External NPM Dependencies Required)

Requires **Node.js v20+** (tested on Node v24).

```bash
# 1. (Optional) Configure your OpenAI API key in .env
cp .env.example .env
# Edit .env and set OPENAI_API_KEY=sk-...
# (Or paste your key live inside the web UI by clicking "AI Engine · Setup" in the top bar!)

# 2. Start the MedFlow AI Server
npm start
```

Then open **`http://localhost:3000`** in Chrome or Edge.

> **Standalone Fallback:** You can also open [UPDATEDindex.html](file:///c:/Users/junai/Development/Medathon/UPDATEDindex.html) directly in a browser—it includes the full upgraded UI, client-side OpenAI Whisper support, Browser Speech Recognition, and local hybrid clinical NLP!

### Run Automated Verification Tests
```bash
npm test                  # app/API checks (16) + clinical scenario baseline check (30)
npm run test:scenarios    # re-run the 30 synthetic scenarios, regenerate TEST_REPORT.md + test-results.json
```

### 🧪 Testing & Validation System (30 synthetic scenarios)
Open **http://localhost:3000/testing.html** (or the footer link in the app) and press **▶ Run Tests** to execute 30 fictional patient statements live against the exact clinical engine the app runs (`public/medflow-core.js`):

| Group | Focus |
|---|---|
| A | English symptom statements & alternative wording ("trouble breathing", "pain in my chest") |
| B | English negation ("I deny chest pain", "no chest pain or shortness of breath") |
| C | Modern Standard Arabic, incl. negation and ة/ه spelling variants |
| D | Saudi colloquial Arabic («وجع قلبي», «ما في وجع في صدري») |
| E | Vital-sign thresholds, boundaries and invalid input |

**Current result: 30 / 30 software requirements met.** The suite originally exposed 7 real gaps (missed emergencies and false alarms on negated/colloquial phrasing); these were fixed in the engine — not by editing the tests. GitHub Actions (`.github/workflows/software-tests.yml`) re-runs everything on each push and fails if triage behaviour changes unexpectedly. Results are in [TEST_REPORT.md](TEST_REPORT.md); qualified reviewers can use [CLINICIAN_REVIEW_TEMPLATE.md](CLINICIAN_REVIEW_TEMPLATE.md).

> Software conformance ≠ clinical validation. All cases remain "Not clinically reviewed" until a qualified clinician signs off.

---

## 🎤 3-Minute Live Pitch Script for SYHF Judges in Jeddah

1. **The Hook (Patient Kiosk — 45s):**
   * Open `http://localhost:3000` (and optionally open a second window on the **Clinician Dashboard** side-by-side to show real-time sync).
   * Toggle the UI between **EN** and **العربية** to show full RTL Arabic support.
   * Click **Record microphone** and speak in Arabic (e.g., *"أعاني من ألم شديد في الصدر وضيق في التنفس منذ نصف ساعة، لدي سكري وآخذ ميتفورمين وحساسية من البنسلين"*), **OR** click **Simulate Arabic Voice** if the conference hall is noisy.
2. **AI Structuring + Safety Floor (45s):**
   * Point out the **AI-Structured Bilingual Handover** card that immediately appears:
     * Translates the Arabic complaint into clear clinical English for multinational ER staff while preserving the patient's exact Arabic words.
     * Extracts HPI chips (`Duration: 45 minutes`, `+ Chest pain / pressure`, `+ Shortness of breath`).
     * Automatically opens **Health details** and populates `Penicillin`, `Metformin, Aspirin`, and `Type 2 DM, HTN` extracted from speech!
   * Point out the pulsing red **IMMEDIATE HUMAN TRIAGE REQUIRED** alert and mandatory patient transcript confirmation checkbox.
   * Check the confirmation boxes and click **Confirm & create intake**.
3. **Clinician Dashboard & FHIR R4 Handover (60s):**
   * Switch to **Clinician Dashboard** (`Dr. Al-Ghamdi (Jeddah ED)`).
   * Show the **4 Crowd & Flow KPIs** (including **Avg self-intake time: ~42s**) and the masked Saudi/Visitor ID (`******7788`) in the queue for **SDAIA PDPL privacy**.
   * Click **Clinician Review**, enter confirmed clinician vital signs (`HR 110`, `BP 148/90`, `SpO2 93%`), check **Confirm note**, and click **Save clinician review**.
   * Click **Preview FHIR JSON** to show a real, **NPHIES-aligned HL7 FHIR R4 Document Bundle** (`Composition`, `Patient`, `Practitioner`, `Encounter`, and LOINC-coded `Observation` resources) ready for hospital HIS integration.

---

## 📁 Project Files

* [server.js](file:///c:/Users/junai/Development/Medathon/server.js) — Zero-dependency Node.js backend (`POST /api/transcribe`, `POST /api/structure`, `GET /api/events` SSE sync, `POST /api/encounters`, `POST /api/encounters/:id/review`)
* [public/medflow-core.js](file:///c:/Users/junai/Development/Medathon/public/medflow-core.js) — Isomorphic clinical domain core (red-flag safety floor, Arabic negation handling, bilingual HPI extractor, SOAP generator, and FHIR R4 bundler)
* [public/index.html](file:///c:/Users/junai/Development/Medathon/public/index.html) & [UPDATEDindex.html](file:///c:/Users/junai/Development/Medathon/UPDATEDindex.html) — Full patient kiosk & clinician dashboard UI
* [test-mvp.js](file:///c:/Users/junai/Development/Medathon/test-mvp.js) — Automated unit + API integration test suite
* [.env.example](file:///c:/Users/junai/Development/Medathon/.env.example) — Environment configuration template
