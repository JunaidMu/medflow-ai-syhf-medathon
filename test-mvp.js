'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { Readable } = require('node:stream');
const MedFlow = require('./public/medflow-core.js');
const { server } = require('./server.js');

// 1. Sync inlined HTML to both public/index.html and UPDATEDindex.html so both work standalone (file://) and via server
const coreCode = fs.readFileSync(path.join(__dirname, 'public', 'medflow-core.js'), 'utf8');
let html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
if (html.includes('<script src="/medflow-core.js"></script>')) {
  html = html.replace(
    '<script src="/medflow-core.js"></script>',
    '<script>\n' + coreCode + '\n</script>'
  );
  fs.writeFileSync(path.join(__dirname, 'public', 'index.html'), html, 'utf8');
}
fs.writeFileSync(path.join(__dirname, 'UPDATEDindex.html'), html, 'utf8');
console.log('[PASS] Synced standalone + server-ready HTML to public/index.html and UPDATEDindex.html');

// 2. Unit test MedFlow core clinical rules, negation handling, bilingual structuring, and FHIR R4 export
const acs = MedFlow.SCENARIOS.acs;
const pAcs = MedFlow.normalize(acs);
assert.strictEqual(MedFlow.flag(pAcs).level, 'immediate', 'ACS scenario must flag immediate');
assert.ok(pAcs.structured.complaint_en.includes('Chest pain'), 'Bilingual EN summary should extract chest pain');
assert.ok(pAcs.structured.extracted_allergies.includes('Penicillin') || pAcs.allergies.includes('Penicillin'));

// Negation safety test
const negated = MedFlow.normalize({
  name: 'DEMO · Negated Test',
  nid: '1000001122',
  age: 30,
  complaint: 'ألم خفيف في الكاحل بعد الجري، لا أعاني من ألم في الصدر وبدون ضيق في التنفس'
});
assert.notStrictEqual(MedFlow.flag(negated).level, 'immediate', 'Negated chest pain/SOB should not trigger false immediate red flag');
assert.ok(negated.structured.hpi.negatives_en.includes('No chest pain'), 'Should capture pertinent negative: No chest pain');

// FHIR R4 bundle & Routing Ticket test
const bundle = MedFlow.fhir(pAcs);
assert.strictEqual(bundle.resourceType, 'Bundle');
assert.strictEqual(bundle.type, 'document');
assert.strictEqual(bundle.entry[0].resource.resourceType, 'Composition');
const ticket = MedFlow.routingTicket(pAcs, [pAcs]);
assert.ok(ticket.code.startsWith('E-'), 'Immediate red-flag encounter must get E-xxx emergency ticket');
assert.ok(ticket.zoneEn.includes('Zone A'), 'Immediate red-flag must route to Zone A');
assert.ok(MedFlow.qrSvg(ticket.code).includes('<svg'), 'QR SVG generator must return valid SVG');
assert.ok(Array.isArray(pAcs.structured.followups), 'Structured output must include follow-up clarifier items');
assert.ok(MedFlow.QUICK_SYMPTOMS.length >= 6, 'Quick symptom touch pills must be defined');
console.log('[PASS] Core clinical red-flag guardrails, QR routing ticket, follow-up chips, and FHIR R4 Bundle verified');

// Helper to invoke server request handler directly (works inside network-isolated sandboxes too)
function invokeServer(method, urlPath, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const buf =
      body == null
        ? Buffer.alloc(0)
        : Buffer.isBuffer(body)
        ? body
        : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body), 'utf8');

    const req = new Readable({
      read() {
        this.push(buf);
        this.push(null);
      }
    });
    req.method = method;
    req.url = urlPath;
    req.headers = { host: 'localhost:3000', ...headers };

    const resChunks = [];
    const res = {
      statusCode: 200,
      headers: {},
      headersSent: false,
      setHeader(k, v) {
        this.headers[k.toLowerCase()] = v;
      },
      writeHead(code, hdrs = {}) {
        this.statusCode = code;
        this.headersSent = true;
        for (const [k, v] of Object.entries(hdrs)) this.headers[k.toLowerCase()] = v;
      },
      write(chunk) {
        resChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      },
      end(chunk) {
        if (chunk) this.write(chunk);
        const raw = Buffer.concat(resChunks).toString('utf8');
        let json = null;
        try {
          json = JSON.parse(raw);
        } catch (_) {}
        resolve({ status: this.statusCode, headers: this.headers, raw, json });
      }
    };

    try {
      server.emit('request', req, res);
    } catch (err) {
      reject(err);
    }
  });
}

(async () => {
  const health = (await invokeServer('GET', '/api/health')).json;
  assert.strictEqual(health.ok, true);
  console.log(`[PASS] GET /api/health (${health.service})`);

  const stRes = (
    await invokeServer(
      'POST',
      '/api/structure',
      { 'content-type': 'application/json' },
      {
        complaint:
          'عندي ألم شديد في الصدر وضيق في التنفس منذ 30 دقيقة، لدي سكري وآخذ ميتفورمين وحساسية من البنسلين'
      }
    )
  ).json;
  assert.strictEqual(stRes.ok, true);
  assert.ok(stRes.structured.complaint_en.includes('Chest pain'));
  assert.ok(stRes.structured.extracted_allergies.includes('Penicillin'));
  assert.ok(stRes.structured.extracted_medications.includes('Metformin'));
  console.log('[PASS] POST /api/structure extracted bilingual HPI, allergies, and medications');

  const createRes = (
    await invokeServer(
      'POST',
      '/api/encounters',
      { 'content-type': 'application/json' },
      {
        name: 'DEMO · Jeddah Test Patient',
        nid: '1000008899',
        age: 58,
        sex: 'male',
        complaint:
          'عندي ألم شديد في الصدر وضيق في التنفس منذ 30 دقيقة، لدي سكري وآخذ ميتفورمين وحساسية من البنسلين',
        vitals: { hr: 112, sbp: 150, dbp: 92, spo2: 91 },
        source: 'voice-openai'
      }
    )
  ).json;
  assert.strictEqual(createRes.ok, true);
  assert.ok(createRes.encounter.allergies.includes('Penicillin'), 'Server auto-populated extracted allergy');
  const encId = createRes.encounter.id;
  console.log('[PASS] POST /api/encounters created encounter & auto-filled extracted health details');

  const revRes = (
    await invokeServer(
      'POST',
      `/api/encounters/${encId}/review`,
      { 'content-type': 'application/json' },
      {
        urgency: 'immediate',
        comment: 'ECG ordered immediately in Jeddah ED triage bay 1',
        measuredVitals: { hr: 110, sbp: 148, dbp: 90, spo2: 93 },
        confirmed: true,
        reviewer: 'Dr. Al-Ghamdi'
      }
    )
  ).json;
  assert.strictEqual(revRes.ok, true);
  assert.strictEqual(revRes.encounter.review.confirmed, true);
  console.log('[PASS] POST /api/encounters/:id/review confirmed clinical note & objective vitals');

  const sttRes = (
    await invokeServer(
      'POST',
      '/api/transcribe?lang=ar',
      { 'content-type': 'audio/webm' },
      Buffer.alloc(512, 1)
    )
  ).json;
  assert.ok(sttRes.mode === 'no-api-key' || sttRes.mode === 'openai' || sttRes.mode === 'openai-error');
  console.log(`[PASS] POST /api/transcribe handled audio payload cleanly (mode: ${sttRes.mode})`);

  // Restore clean seed state after test
  await invokeServer('POST', '/api/reset');
  await invokeServer('POST', '/api/seed');
  console.log('[PASS] Restored clean Jeddah ED seed encounters in data/medflow-db.json');
  console.log('\nALL SYHF MEDATHON MVP TESTS PASSED!');
})();
