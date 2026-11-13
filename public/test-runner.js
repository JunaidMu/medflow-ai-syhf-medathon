/* MedFlow AI — Prototype Testing & Validation
 * Test runner. Executes every synthetic scenario against the ACTUAL MedFlow
 * prototype functions (medflow-core.js): validate → normalize → flag → soap → fhir.
 * There is no separate or duplicated rule engine: results are the real behavior
 * of the code that ships in index.html.
 *
 * Works in the browser (testing.html) and in Node (run-tests.cjs / GitHub Actions).
 */
(function (root) {
  'use strict';

  const VERSION = '1.0.0';
  const SUITE_NAME = 'MedFlow AI — Prototype Testing & Validation';
  const SOFTWARE_NAME = 'MedFlow AI';
  const SOFTWARE_VERSION = 'Prototype v2 (browser-localStorage schema "medflow.prototype.v2"; shared core file medflow-core.js)';
  const DISCLAIMER = 'These results describe software behavior under fictional test conditions. They do not establish clinical accuracy, safety, or suitability for use with real patients.';
  const REVIEW_STATUS = 'Not clinically reviewed';

  function runOne(scenario, M) {
    const raw = {
      name: scenario.patient?.name || 'TEST · ' + scenario.id,
      nid: scenario.patient?.nid || '1000000099',
      age: scenario.patient?.age != null ? scenario.patient.age : 45,
      sex: 'unknown',
      complaint: scenario.complaint || '',
      vitals: scenario.vitals || {},
      source: 'scenario'
    };

    // Exactly the pipeline the app runs on form submission.
    const validationErrors = [...M.validate(raw)];
    const patient = M.normalize(raw);
    const flag = M.flag(patient);
    const soapEn = M.soap(patient, 'en');
    const soapAr = M.soap(patient, 'ar');
    const bundle = M.fhir(patient);

    const resourceCounts = {};
    bundle.entry.forEach((e) => { resourceCounts[e.resource.resourceType] = (resourceCounts[e.resource.resourceType] || 0) + 1; });

    const actual = {
      validationErrors,
      acceptedComplaint: patient.complaint,
      acceptedVitals: { ...patient.vitals },
      flag: { level: flag.level, reason: flag.reason },
      soapEn: { s: soapEn.s, o: soapEn.o, a: soapEn.a, p: soapEn.p },
      soapAr: { s: soapAr.s, o: soapAr.o, a: soapAr.a, p: soapAr.p },
      fhir: {
        bundleType: bundle.type,
        firstResourceType: bundle.entry[0]?.resource?.resourceType || null,
        resourceCounts,
        observationCount: resourceCounts.Observation || 0,
        compositionStatus: bundle.entry[0]?.resource?.status || null
      }
    };

    const checks = scenario.checks.map((c) => {
      let passed = false, error = null;
      try { passed = !!c.check(actual, patient, M); } catch (e) { error = String(e && e.message || e); }
      return { label: c.label, passed, ...(error ? { error } : {}) };
    });

    const passed = checks.every((c) => c.passed);

    return {
      id: scenario.id,
      group: scenario.group,
      language: scenario.language,
      category: scenario.category,
      complaint: scenario.complaint,
      vitalsEntered: scenario.vitals || null,
      requirement: scenario.requirement,
      checks,
      softwareResult: passed ? 'passed' : 'failed',
      clinicalReviewNeeded: !!scenario.clinicalReviewNeeded,
      clinicalReviewStatus: REVIEW_STATUS,
      clinicalConcern: scenario.safetyConcern || null,
      explanation: scenario.explanation,
      actual
    };
  }

  function runAll(scenarios, M, environment) {
    const results = scenarios.map((s) => runOne(s, M));
    const byGroup = {};
    for (const r of results) {
      byGroup[r.group] = byGroup[r.group] || { group: r.group, total: 0, passed: 0, failed: 0, clinicalReviewNeeded: 0 };
      const g = byGroup[r.group];
      g.total += 1;
      if (r.softwareResult === 'passed') g.passed += 1; else g.failed += 1;
      if (r.clinicalReviewNeeded) g.clinicalReviewNeeded += 1;
    }
    return {
      suiteName: SUITE_NAME,
      suiteVersion: VERSION,
      softwareName: SOFTWARE_NAME,
      softwareVersion: SOFTWARE_VERSION,
      generatedAt: new Date().toISOString(),
      environment: environment || null,
      disclaimer: DISCLAIMER,
      requirementCatalog: (root.MedFlowTestScenarios && root.MedFlowTestScenarios.requirements) || {},
      summary: {
        total: results.length,
        executed: results.length,
        passed: results.filter((r) => r.softwareResult === 'passed').length,
        failed: results.filter((r) => r.softwareResult === 'failed').length,
        clinicalReviewNeeded: results.filter((r) => r.clinicalReviewNeeded).length
      },
      groupSummaries: Object.values(byGroup),
      results
    };
  }

  /* Flat CSV export: one row per scenario. */
  function toCSV(results) {
    const esc = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const head = ['id', 'group', 'language', 'category', 'complaint', 'requirement', 'softwareResult', 'failedChecks', 'clinicalReviewNeeded', 'clinicalReviewStatus', 'clinicalConcern', 'explanation'];
    const rows = results.map((r) => [
      r.id, r.group, r.language, r.category, r.complaint, r.requirement,
      r.softwareResult,
      r.checks.filter((c) => !c.passed).map((c) => c.label).join('; '),
      r.clinicalReviewNeeded ? 'yes' : 'no',
      r.clinicalReviewStatus,
      r.clinicalConcern || '',
      r.explanation
    ]);
    return [head, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
  }

  root.MedFlowTestRunner = { version: VERSION, SUITE_NAME, SOFTWARE_NAME, SOFTWARE_VERSION, DISCLAIMER, REVIEW_STATUS, runOne, runAll, toCSV };
})(typeof globalThis !== 'undefined' ? globalThis : this);
