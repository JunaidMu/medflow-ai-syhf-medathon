#!/usr/bin/env node
/* MedFlow AI — Prototype Testing & Validation
 * Node.js runner: executes the 30 synthetic scenarios against the ACTUAL
 * medflow-core.js logic and (re)generates test-results.json and TEST_REPORT.md.
 *
 * Usage:
 *   node run-tests.cjs              # run tests, write test-results.json + TEST_REPORT.md
 *   node run-tests.cjs --check      # run tests and compare against the committed
 *                                   # baseline (test-results.json). Exits 1 with a
 *                                   # clear message if software behavior changed,
 *                                   # so CI catches unintended rule/logic changes.
 *                                   # If the change is intended, run: node run-tests.cjs --update
 *   node run-tests.cjs --update     # run tests, write results AND update the baseline copy
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;
const file = (p) => fs.readFileSync(path.join(ROOT, 'public', p), 'utf8');

/* Load the pure-logic core and the test suite in a sandbox. medflow-core.js is
 * written as (function(root){...})(globalThis) and uses no DOM, so it executes
 * unchanged in Node. */
const context = { console };
vm.createContext(context);
vm.runInContext(file('medflow-core.js'), context, { filename: 'medflow-core.js' });
vm.runInContext(file('test-scenarios.js'), context, { filename: 'test-scenarios.js' });
vm.runInContext(file('test-runner.js'), context, { filename: 'test-runner.js' });
vm.runInContext(file('report-generator.js'), context, { filename: 'report-generator.js' });

const M = context.MedFlow;
const suite = context.MedFlowTestScenarios;
const runner = context.MedFlowTestRunner;
const reporter = context.MedFlowReportGenerator;

if (!M || !suite || !runner || !reporter) {
  console.error('Failed to load MedFlow core or test suite.');
  process.exit(2);
}

const environment = {
  runtime: 'Node.js ' + process.version,
  platform: process.platform + ' (' + process.arch + ')',
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
  file: 'medflow-core.js (loaded and executed verbatim)'
};

const results = runner.runAll(suite.scenarios, M, environment);

const s = results.summary;
console.log('MedFlow AI — Prototype Testing & Validation');
console.log('Executed ' + s.executed + '/30 synthetic scenarios against medflow-core.js');
console.log('Passed (software requirements): ' + s.passed + '   Failed: ' + s.failed + '   Needing clinical review: ' + s.clinicalReviewNeeded);
for (const r of results.results.filter((x) => x.softwareResult === 'failed')) {
  console.log('  FAIL ' + r.id + ' — ' + r.checks.filter((c) => !c.passed).map((c) => c.label).join('; '));
}

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');

/* Baseline comparison for CI: compare per-scenario software results (and summary)
 * against the committed baseline. Some failures are expected and committed;
 * any CHANGE in behavior is what must interrupt the workflow.
 * NOTE: the baseline is read BEFORE any write so --check can never compare
 * against itself. */
if (checkOnly || args.includes('--update')) {
  var baselinePath = path.join(ROOT, 'test-results.json');
  var baseline = null;
  try { baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8')); } catch (e) { baseline = null; }
  if (!baseline || !baseline.summary || !Array.isArray(baseline.results)) {
    console.error('No valid baseline found. Run "node run-tests.cjs" once and commit test-results.json.');
    process.exit(2);
  }
  const fingerprint = (res) => JSON.stringify({
    summary: { passed: res.summary.passed, failed: res.summary.failed },
    perTest: res.results.map((r) => [r.id, r.softwareResult])
  });
  const changed = fingerprint(baseline) !== fingerprint(results);
  if (changed) {
    console.error('SOFTWARE BEHAVIOR CHANGED since the committed test-results.json baseline.');
    console.error('Review the scenarios above; if the change is intended, run: node run-tests.cjs --update');
    if (checkOnly) process.exit(1);
  } else if (checkOnly) {
    console.log('Behavior matches the committed baseline — no unintended rule/logic change detected.');
  }
}

/* In --check mode the committed files stay untouched; a fresh run writes them. */
if (!checkOnly) {
  const write = (name, data) => fs.writeFileSync(path.join(ROOT, name), data, 'utf8');
  write('test-results.json', JSON.stringify(results, null, 2) + '\n');
  write('TEST_REPORT.md', reporter.buildReport(results));
  console.log('Wrote test-results.json and TEST_REPORT.md');
} else {
  console.log('Committed test-results.json and TEST_REPORT.md were not modified (--check mode).');
}

process.exit(0);
