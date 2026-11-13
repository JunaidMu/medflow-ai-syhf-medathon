# MedFlow AI — Formal Software Test Report

**Software behavior testing with synthetic scenarios. Not clinical validation.**

> These results describe software behavior under fictional test conditions. They do not establish clinical accuracy, safety, or suitability for use with real patients.

## 1. Project name and software version

- **Project:** MedFlow AI — Prototype Testing & Validation (test suite v1.0.0)
- **Software under test:** MedFlow AI — Prototype v2 (browser-localStorage schema "medflow.prototype.v2"; shared core file medflow-core.js)
- **Source of truth:** `medflow-core.js` (the exact logic file loaded by `index.html`); test runner executes it verbatim — no separate or duplicated rule engine.

## 2. Test date

- **Latest automated execution:** 2026-11-13T19:32:00.948Z (UTC)
- **Test environment:** runtime: Node.js v24.21.0 · platform: win32 (x64) · timeZone: Asia/Karachi · file: medflow-core.js (loaded and executed verbatim)

## 3. Testing objective

Execute a fixed, reproducible set of 30 fictional (synthetic) intake scenarios against the actual MedFlow prototype logic in order to:

1. Verify that observed behavior matches the prototype's own documented software requirements.
2. Make both passing and failing behavior transparent and reproducible for judges, teammates and future reviewers.
3. Identify inconsistent behavior, unrecognized complaints, negation errors and potential safety concerns **without modifying the clinical warning rules to improve the pass rate**.
4. Record, for every scenario, whether medical expert review is still required (all clinical reference status values remain "Not clinically reviewed").

## 4. Methodology

For each scenario the runner performs exactly the pipeline the application performs on intake submission:

1. `MedFlow.validate(raw)` — intake validation (field errors).
2. `MedFlow.normalize(raw)` — sanitization and vital-value acceptance.
3. `MedFlow.flag(patient)` — urgency suggestion (immediate / priority / standard / unclassified).
4. `MedFlow.soap(patient, "en")` and `MedFlow.soap(patient, "ar")` — bilingual SOAP note generation.
5. `MedFlow.fhir(patient)` — FHIR R4 document Bundle generation.

Each scenario declares assertions against the documented requirements catalog. A scenario is recorded as **passed** only when every assertion holds; otherwise **failed**. Observed outputs are stored verbatim in `test-results.json`. No expected output is ever copied from the code — assertions may fail, and failures are kept visible.

The rule set under test is the prototype's own small, disclosed demonstration rules ("deliberately not ESI"). No rule was changed to make tests pass.

## 5. Description of the 30 synthetic scenarios

| ID | Group | Language | Category | Fictional complaint / input |
|---|---|---|---|---|
| A1 | A | English | Red-flag recognition — explicit phrase | I have severe chest pain and pain in my left arm. |
| A2 | A | English | Red-flag recognition — alternative wording | I am having trouble breathing and feel like I might faint. |
| A3 | A | English | Red-flag recognition — explicit phrase | There is heavy bleeding from the wound on my leg. |
| A4 | A | English | Priority-level recognition | I have fever and vomiting since yesterday. |
| A5 | A | English | Standard-level recognition | My ankle is sprained and slightly swollen. |
| A6 | A | English | Red-flag recognition — word order | Pain in my chest when I take a deep breath. |
| B1 | B | English | Negation — covered negator | No chest pain, but I feel dizzy and weak. |
| B2 | B | English | Negation — uncovered negator form | I deny chest pain. |
| B3 | B | English | Negation — covered negator | Patient denies shortness of breath at rest. |
| B4 | B | English | Negation — scope across "or" | No chest pain or shortness of breath, but severe headache since this morning. |
| B5 | B | English | Negation — mixed positive and negative | I have shortness of breath but no chest pain. |
| B6 | B | English | Negation — covered negator with priority symptom | Without difficulty breathing, I have mild fever. |
| C1 | C | Arabic — Modern Standard | Red-flag recognition — explicit phrase | أعاني من ألم شديد في الصدر منذ ساعة تقريباً. |
| C2 | C | Arabic — Modern Standard | Red-flag recognition — breathing phrase | أعاني من ضيق شديد في التنفس. |
| C3 | C | Arabic — Modern Standard | Negation — covered negator | لا أعاني من ألم في الصدر ولكن لديّ صداع شديد. |
| C4 | C | Arabic — Modern Standard | Priority-level recognition | عندي حرارة شديدة مع قيء متكرر منذ يومين. |
| C5 | C | Arabic — Modern Standard | Priority-level recognition — spelling variant | أشعر بحرارة مرتفعة في جسمي منذ ليلتين. |
| C6 | C | Arabic — Modern Standard | Negation — intervening word | لا يوجد عندي ضيق في التنفس. |
| D1 | D | Arabic — Saudi colloquial (fictional) | Red-flag recognition — colloquial cardiac wording | وجع قلبي شديد وجاي في صدري من الصبح. |
| D2 | D | Arabic — Saudi colloquial (fictional) | Fallback behavior — colloquial complaint | راسي يوجعني شديد من الصبح. |
| D3 | D | Arabic — Saudi colloquial (fictional) | Negation — colloquial negator | ما في وجع في صدري الحين. |
| D4 | D | Arabic — Saudi colloquial (fictional) | Fallback behavior — colloquial respiratory wording | أتنفس بسرعة وأتعب من أي شغل بسيط. |
| D5 | D | Arabic — Saudi colloquial (fictional) | Priority-level recognition | عندي حمى ووجع في جسمي كله. |
| D6 | D | Arabic — Saudi colloquial (fictional) | Negation — covered negator | بدون نزيف شديد، بس دوخة شديدة. |
| E1 | E | N/A — vital-sign values | Vital thresholds — SpO2 and systolic BP | Follow-up check. |
| E2 | E | N/A — vital-sign values | Normal vitals — no flag | Routine blood pressure follow-up visit. |
| E3 | E | N/A — vital-sign values | Boundary — heart rate | Follow-up check. |
| E4 | E | N/A — vital-sign values | Boundary — temperature | Follow-up check. |
| E5 | E | N/A — vital-sign values | Boundary — respiratory rate (low) | Follow-up check. |
| E6 | E | N/A — invalid inputs | Validation — invalid and out-of-range inputs | Routine check. |

**Groups:** A — English symptom statements (6) · B — English negation and ambiguity (6) · C — Modern Standard Arabic (6) · D — Saudi colloquial Arabic, fictional expressions (6) · E — Vital signs and boundary conditions (6).

All scenarios use fictional patients (TEST-prefixed names, synthetic IDs). Every case's clinical reference status is **"Not clinically reviewed"**.

## 6. Exact executed test results

| ID | Result | Failed checks (if any) | Observed urgency flag | Needs clinical review |
|---|---|---|---|---|
| A1 | PASS | — | immediate / complaint | No |
| A2 | PASS | — | immediate / complaint | Yes |
| A3 | PASS | — | immediate / complaint | No |
| A4 | PASS | — | priority / complaint | No |
| A5 | PASS | — | standard / complaint | No |
| A6 | PASS | — | immediate / complaint | Yes |
| B1 | PASS | — | priority / complaint | Yes |
| B2 | PASS | — | unclassified / unknown | Yes |
| B3 | PASS | — | unclassified / unknown | No |
| B4 | PASS | — | priority / complaint | Yes |
| B5 | PASS | — | immediate / complaint | No |
| B6 | PASS | — | priority / complaint | No |
| C1 | PASS | — | immediate / complaint | No |
| C2 | PASS | — | immediate / complaint | No |
| C3 | PASS | — | priority / complaint | Yes |
| C4 | PASS | — | priority / complaint | Yes |
| C5 | PASS | — | priority / complaint | Yes |
| C6 | PASS | — | unclassified / unknown | Yes |
| D1 | PASS | — | immediate / complaint | Yes |
| D2 | PASS | — | unclassified / unknown | Yes |
| D3 | PASS | — | unclassified / unknown | Yes |
| D4 | PASS | — | unclassified / unknown | Yes |
| D5 | PASS | — | priority / complaint | No |
| D6 | PASS | — | priority / complaint | Yes |
| E1 | PASS | — | immediate / vitals | No |
| E2 | PASS | — | unclassified / unknown | No |
| E3 | PASS | — | immediate / vitals | No |
| E4 | PASS | — | immediate / vitals | No |
| E5 | PASS | — | immediate / vitals | No |
| E6 | PASS | — | unclassified / unknown | No |

Full observed output for every scenario (validation errors, accepted values, SOAP notes in both languages, FHIR bundle composition) is in `test-results.json` and in the interactive dashboard (`testing.html`).

## 7. Pass/fail definitions

- **Software test passed:** observed behavior matches the documented software requirement for that scenario.
- **Software test failed:** observed behavior does not match the documented software requirement. Failures are kept visible on purpose; some are expected findings (unrecognized wordings, negation gaps).
- **Clinical review needed:** medical appropriateness of the behavior has not been established. No case has clinician sign-off; clinical reference status for all 30 cases is **"Not clinically reviewed"**.

The pass rate is a **software-requirement conformance rate**. It must not be read as clinical sensitivity, specificity, diagnostic accuracy, or a measure of patient safety.

## 8. Summary of observed behavior

| Metric | Value |
|---|---|
| Total synthetic scenarios | 30 |
| Executed | 30 |
| Software checks passed | 30 |
| Software checks failed | 0 |
| Cases needing clinical review | 14 |

| Group | Total | Passed | Failed | Needs clinical review |
|---|---|---|---|---|
| A | 6 | 6 | 0 | 2 |
| B | 6 | 6 | 0 | 3 |
| C | 6 | 6 | 0 | 4 |
| D | 6 | 6 | 0 | 5 |
| E | 6 | 6 | 0 | 0 |

Key observations:

- Explicit, exactly-worded red-flag phrases in both languages are correctly escalated to "immediate" (A1, A3, C1, C2, B5).
- The negation mechanism works for its exact listed phrases (B1, B3, B6, D6, C3) and correctly ignores negated symptoms in mixed statements.
- Vital-sign thresholds behave as documented, including boundary probes just outside the threshold (E1–E5), and validation rejects invalid inputs (E6).
- Everyday alternative wordings, negation variants, MSA orthographic variants, and colloquial Arabic phrasings are frequently unrecognized — producing either fallback "unclassified" (safe-by-default but needs staff) or, in several negation cases, a false "immediate" flag.

## 9. Confirmed software defects

Behavior confirmed by execution to not meet the documented requirement. Direction of concern is phrased from the software's perspective only; clinical significance is **not established** (see section 11).


## 10. Unresolved limitations

1. Rule coverage is intentionally small and disclosed; many real symptoms and phrasings (English and Arabic) are unrecognized and fall back to "unclassified", which depends entirely on human triage.
2. Negation handling covers only exact listed phrases. Not handled: first-person "deny" (B2), negation scope across "or" (B4), Arabic negators with intervening words (C6), colloquial negators such as "ما في" (D3).
3. English matching is word-order dependent ("chest pain" matches; "pain in my chest" does not — A6; "trouble breathing" unrecognized — A2).
4. Arabic orthography: the disclosed fever term "حراره" (final haa) does not match MSA "حرارة" (taa marbuta) — C5.
5. Colloquial cardiac wording ("وجع قلبي ... صدري") is not recognized — D1.
6. Vital-sign input ranges are broad; physiologically implausible but in-range values (e.g., SpO2 of 45) are accepted and would trigger the abnormal rule. Range plausibility requires clinical review.
7. Speech recognition is not connected; the transcript is typed or manually confirmed by the patient.
8. Browser localStorage is unencrypted and the demo clinician role is not real authentication.
9. The prototype performs no ESI assignment, diagnosis or treatment, and is not connected to any hospital system.
10. The test suite verifies software behavior only; it uses no clinical ground truth and cannot measure clinical performance.

## 11. Clinical validation requirements

Before any consideration of real-world use, the following is required and has **not** been performed:

1. Review of all 30 scenarios by qualified clinicians, using `CLINICIAN_REVIEW_TEMPLATE.md`, recording concern, whether warning behavior needs further assessment, comments, reviewer name, role and date.
2. Clinical definition of the intended urgency mappings (immediate / priority / standard / unclassified) and their relationship, if any, to the hospital's triage protocol.
3. Expert review of unrecognized wordings and negation behavior found by this suite (sections 9–10), including Saudi colloquial Arabic variants.
4. Prospective evaluation with realistic bilingual inputs under hospital governance, with documented safety monitoring.
5. Regulatory and data-protection review (PDPL, NHIC interoperability requirements) before any real patient data is involved.

**None of these steps has been completed. All clinical reference status values are "Not clinically reviewed".**

## 12. Recommended next improvements

Recommended purely as software-engineering next steps; each still requires clinical review before use:

1. Extend negation handling: add first-person "deny", scope negation across "or", support Arabic negators with intervening words and colloquial negators — then re-run this suite and review the changed results.
2. Add order-independent chest-pain/breathing patterns for English, and additional Arabic orthographic variants (ة/ه) — with clinician sign-off on the rule list first.
3. Add a rule-coverage test layer so new rules are automatically probed by this suite.
4. Tighten vital input ranges after clinical review, and surface normalize-vs-validate behavior explicitly.
5. Complete clinician review of all 30 scenarios using the template, and record outcomes separately from these automated results.
6. Keep the CI workflow running on every change so behavior shifts are detected immediately.

---

*These results describe software behavior under fictional test conditions. They do not establish clinical accuracy, safety, or suitability for use with real patients.*

*Report generated automatically from the executed results in `test-results.json` on 2026-11-13T19:32:00.948Z (UTC) by report generator v1.0.0.*
