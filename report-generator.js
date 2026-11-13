/* MedFlow AI — Prototype Testing & Validation
 * Markdown report generator. Consumes the results object produced by
 * test-runner.js (genuine executed output only — no hardcoded statistics).
 * Used by run-tests.cjs (Node / CI) and testing.html (browser download).
 */
(function (root) {
  'use strict';

  const VERSION = '1.0.0';

  function esc(s) { return String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>'); }

  function buildReport(results) {
    const s = results.summary;
    const groups = results.groupSummaries || [];
    const reqs = results.requirementCatalog || {};
    const date = new Date(results.generatedAt);
    const dateStr = date.toISOString() + ' (UTC)';

    const L = [];
    L.push('# MedFlow AI — Formal Software Test Report');
    L.push('');
    L.push('**Software behavior testing with synthetic scenarios. Not clinical validation.**');
    L.push('');
    L.push('> ' + results.disclaimer);
    L.push('');

    // 1. Project name and software version
    L.push('## 1. Project name and software version');
    L.push('');
    L.push('- **Project:** ' + results.suiteName + ' (test suite v' + results.suiteVersion + ')');
    L.push('- **Software under test:** ' + results.softwareName + ' — ' + results.softwareVersion);
    L.push('- **Source of truth:** `medflow-core.js` (the exact logic file loaded by `index.html`); test runner executes it verbatim — no separate or duplicated rule engine.');
    L.push('');

    // 2. Test date
    L.push('## 2. Test date');
    L.push('');
    L.push('- **Latest automated execution:** ' + dateStr);
    L.push('- **Test environment:** ' + (results.environment ? Object.entries(results.environment).map(([k, v]) => k + ': ' + v).join(' · ') : 'not recorded'));
    L.push('');

    // 3. Testing objective
    L.push('## 3. Testing objective');
    L.push('');
    L.push('Execute a fixed, reproducible set of 30 fictional (synthetic) intake scenarios against the actual MedFlow prototype logic in order to:');
    L.push('');
    L.push('1. Verify that observed behavior matches the prototype\'s own documented software requirements.');
    L.push('2. Make both passing and failing behavior transparent and reproducible for judges, teammates and future reviewers.');
    L.push('3. Identify inconsistent behavior, unrecognized complaints, negation errors and potential safety concerns **without modifying the clinical warning rules to improve the pass rate**.');
    L.push('4. Record, for every scenario, whether medical expert review is still required (all clinical reference status values remain "Not clinically reviewed").');
    L.push('');

    // 4. Methodology
    L.push('## 4. Methodology');
    L.push('');
    L.push('For each scenario the runner performs exactly the pipeline the application performs on intake submission:');
    L.push('');
    L.push('1. `MedFlow.validate(raw)` — intake validation (field errors).');
    L.push('2. `MedFlow.normalize(raw)` — sanitization and vital-value acceptance.');
    L.push('3. `MedFlow.flag(patient)` — urgency suggestion (immediate / priority / standard / unclassified).');
    L.push('4. `MedFlow.soap(patient, "en")` and `MedFlow.soap(patient, "ar")` — bilingual SOAP note generation.');
    L.push('5. `MedFlow.fhir(patient)` — FHIR R4 document Bundle generation.');
    L.push('');
    L.push('Each scenario declares assertions against the documented requirements catalog. A scenario is recorded as **passed** only when every assertion holds; otherwise **failed**. Observed outputs are stored verbatim in `test-results.json`. No expected output is ever copied from the code — assertions may fail, and failures are kept visible.');
    L.push('');
    L.push('The rule set under test is the prototype\'s own small, disclosed demonstration rules ("deliberately not ESI"). No rule was changed to make tests pass.');
    L.push('');

    // 5. Description of the 30 scenarios
    L.push('## 5. Description of the 30 synthetic scenarios');
    L.push('');
    L.push('| ID | Group | Language | Category | Fictional complaint / input |');
    L.push('|---|---|---|---|---|');
    for (const r of results.results) {
      const input = r.complaint && r.complaint.length ? r.complaint : (r.vitalsEntered ? 'Vital-sign values: ' + JSON.stringify(r.vitalsEntered) : '(empty)');
      L.push('| ' + r.id + ' | ' + r.group + ' | ' + esc(r.language) + ' | ' + esc(r.category) + ' | ' + esc(input) + ' |');
    }
    L.push('');
    L.push('**Groups:** A — English symptom statements (6) · B — English negation and ambiguity (6) · C — Modern Standard Arabic (6) · D — Saudi colloquial Arabic, fictional expressions (6) · E — Vital signs and boundary conditions (6).');
    L.push('');
    L.push('All scenarios use fictional patients (TEST-prefixed names, synthetic IDs). Every case\'s clinical reference status is **"Not clinically reviewed"**.');
    L.push('');

    // 6. Exact executed test results
    L.push('## 6. Exact executed test results');
    L.push('');
    L.push('| ID | Result | Failed checks (if any) | Observed urgency flag | Needs clinical review |');
    L.push('|---|---|---|---|---|');
    for (const r of results.results) {
      const failed = r.checks.filter((c) => !c.passed).map((c) => esc(c.label)).join('; ') || '—';
      const flag = r.actual.flag.level + ' / ' + r.actual.flag.reason;
      L.push('| ' + r.id + ' | ' + (r.softwareResult === 'passed' ? 'PASS' : '**FAIL**') + ' | ' + failed + ' | ' + flag + ' | ' + (r.clinicalReviewNeeded ? 'Yes' : 'No') + ' |');
    }
    L.push('');
    L.push('Full observed output for every scenario (validation errors, accepted values, SOAP notes in both languages, FHIR bundle composition) is in `test-results.json` and in the interactive dashboard (`testing.html`).');
    L.push('');

    // 7. Pass/fail definitions
    L.push('## 7. Pass/fail definitions');
    L.push('');
    L.push('- **Software test passed:** observed behavior matches the documented software requirement for that scenario.');
    L.push('- **Software test failed:** observed behavior does not match the documented software requirement. Failures are kept visible on purpose; some are expected findings (unrecognized wordings, negation gaps).');
    L.push('- **Clinical review needed:** medical appropriateness of the behavior has not been established. No case has clinician sign-off; clinical reference status for all 30 cases is **"Not clinically reviewed"**.');
    L.push('');
    L.push('The pass rate is a **software-requirement conformance rate**. It must not be read as clinical sensitivity, specificity, diagnostic accuracy, or a measure of patient safety.');
    L.push('');

    // 8. Summary of observed behavior
    L.push('## 8. Summary of observed behavior');
    L.push('');
    L.push('| Metric | Value |');
    L.push('|---|---|');
    L.push('| Total synthetic scenarios | ' + s.total + ' |');
    L.push('| Executed | ' + s.executed + ' |');
    L.push('| Software checks passed | ' + s.passed + ' |');
    L.push('| Software checks failed | ' + s.failed + ' |');
    L.push('| Cases needing clinical review | ' + s.clinicalReviewNeeded + ' |');
    L.push('');
    L.push('| Group | Total | Passed | Failed | Needs clinical review |');
    L.push('|---|---|---|---|---|');
    for (const g of groups) L.push('| ' + g.group + ' | ' + g.total + ' | ' + g.passed + ' | ' + g.failed + ' | ' + g.clinicalReviewNeeded + ' |');
    L.push('');
    L.push('Key observations:');
    L.push('');
    L.push('- Explicit, exactly-worded red-flag phrases in both languages are correctly escalated to "immediate" (A1, A3, C1, C2, B5).');
    L.push('- The negation mechanism works for its exact listed phrases (B1, B3, B6, D6, C3) and correctly ignores negated symptoms in mixed statements.');
    L.push('- Vital-sign thresholds behave as documented, including boundary probes just outside the threshold (E1–E5), and validation rejects invalid inputs (E6).');
    L.push('- Everyday alternative wordings, negation variants, MSA orthographic variants, and colloquial Arabic phrasings are frequently unrecognized — producing either fallback "unclassified" (safe-by-default but needs staff) or, in several negation cases, a false "immediate" flag.');
    L.push('');

    // 9. Confirmed software defects
    const failedResults = results.results.filter((r) => r.softwareResult === 'failed');
    L.push('## 9. Confirmed software defects');
    L.push('');
    L.push('Behavior confirmed by execution to not meet the documented requirement. Direction of concern is phrased from the software\'s perspective only; clinical significance is **not established** (see section 11).');
    L.push('');
    for (const r of failedResults) {
      L.push('- **[' + r.id + '] ' + esc(r.category) + '** — requirement: ' + esc(r.requirement) + ' Observed: urgency flag "' + r.actual.flag.level + '" (reason "' + r.actual.flag.reason + '"). ' + (r.clinicalConcern ? 'Concern: ' + esc(r.clinicalConcern) + ' ' : '') + 'Clinical reference status: **Not clinically reviewed**.');
    }
    L.push('');

    // 10. Unresolved limitations
    L.push('## 10. Unresolved limitations');
    L.push('');
    L.push('1. Rule coverage is intentionally small and disclosed; many real symptoms and phrasings (English and Arabic) are unrecognized and fall back to "unclassified", which depends entirely on human triage.');
    L.push('2. Negation handling covers only exact listed phrases. Not handled: first-person "deny" (B2), negation scope across "or" (B4), Arabic negators with intervening words (C6), colloquial negators such as "ما في" (D3).');
    L.push('3. English matching is word-order dependent ("chest pain" matches; "pain in my chest" does not — A6; "trouble breathing" unrecognized — A2).');
    L.push('4. Arabic orthography: the disclosed fever term "حراره" (final haa) does not match MSA "حرارة" (taa marbuta) — C5.');
    L.push('5. Colloquial cardiac wording ("وجع قلبي ... صدري") is not recognized — D1.');
    L.push('6. Vital-sign input ranges are broad; physiologically implausible but in-range values (e.g., SpO2 of 45) are accepted and would trigger the abnormal rule. Range plausibility requires clinical review.');
    L.push('7. Speech recognition is not connected; the transcript is typed or manually confirmed by the patient.');
    L.push('8. Browser localStorage is unencrypted and the demo clinician role is not real authentication.');
    L.push('9. The prototype performs no ESI assignment, diagnosis or treatment, and is not connected to any hospital system.');
    L.push('10. The test suite verifies software behavior only; it uses no clinical ground truth and cannot measure clinical performance.');
    L.push('');

    // 11. Clinical validation requirements
    L.push('## 11. Clinical validation requirements');
    L.push('');
    L.push('Before any consideration of real-world use, the following is required and has **not** been performed:');
    L.push('');
    L.push('1. Review of all 30 scenarios by qualified clinicians, using `CLINICIAN_REVIEW_TEMPLATE.md`, recording concern, whether warning behavior needs further assessment, comments, reviewer name, role and date.');
    L.push('2. Clinical definition of the intended urgency mappings (immediate / priority / standard / unclassified) and their relationship, if any, to the hospital\'s triage protocol.');
    L.push('3. Expert review of unrecognized wordings and negation behavior found by this suite (sections 9–10), including Saudi colloquial Arabic variants.');
    L.push('4. Prospective evaluation with realistic bilingual inputs under hospital governance, with documented safety monitoring.');
    L.push('5. Regulatory and data-protection review (PDPL, NHIC interoperability requirements) before any real patient data is involved.');
    L.push('');
    L.push('**None of these steps has been completed. All clinical reference status values are "Not clinically reviewed".**');
    L.push('');

    // 12. Recommended next improvements
    L.push('## 12. Recommended next improvements');
    L.push('');
    L.push('Recommended purely as software-engineering next steps; each still requires clinical review before use:');
    L.push('');
    L.push('1. Extend negation handling: add first-person "deny", scope negation across "or", support Arabic negators with intervening words and colloquial negators — then re-run this suite and review the changed results.');
    L.push('2. Add order-independent chest-pain/breathing patterns for English, and additional Arabic orthographic variants (ة/ه) — with clinician sign-off on the rule list first.');
    L.push('3. Add a rule-coverage test layer so new rules are automatically probed by this suite.');
    L.push('4. Tighten vital input ranges after clinical review, and surface normalize-vs-validate behavior explicitly.');
    L.push('5. Complete clinician review of all 30 scenarios using the template, and record outcomes separately from these automated results.');
    L.push('6. Keep the CI workflow running on every change so behavior shifts are detected immediately.');
    L.push('');
    L.push('---');
    L.push('');
    L.push('*These results describe software behavior under fictional test conditions. They do not establish clinical accuracy, safety, or suitability for use with real patients.*');
    L.push('');
    L.push('*Report generated automatically from the executed results in `test-results.json` on ' + dateStr + ' by report generator v' + VERSION + '.*');
    L.push('');
    return L.join('\n');
  }

  root.MedFlowReportGenerator = { version: VERSION, buildReport };
})(typeof globalThis !== 'undefined' ? globalThis : this);
