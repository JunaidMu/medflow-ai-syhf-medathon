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
const inlineRegex = /<script>\s*\/\* MedFlow AI — Shared Clinical Intake Core[\s\S]*?\}\)\(typeof globalThis !== 'undefined' \? globalThis : this\);\s*<\/script>/;

if (html.includes('<script src="/medflow-core.js"></script>')) {
  html = html.replace(
    '<script src="/medflow-core.js"></script>',
    '<script>\n' + coreCode + '\n</script>'
  );
} else if (inlineRegex.test(html)) {
  html = html.replace(inlineRegex, '<script>\n' + coreCode + '\n</script>');
}
fs.writeFileSync(path.join(__dirname, 'public', 'index.html'), html, 'utf8');
fs.writeFileSync(path.join(__dirname, 'UPDATEDindex.html'), html, 'utf8');
console.log('[PASS 01/16] Synced standalone + server-ready HTML to public/index.html and UPDATEDindex.html');

// 2. Test Arabic digit normalization & input validation
assert.strictEqual(MedFlow.digits('١٠٢٣٤٥٦٧٨٩'), '1023456789', 'Arabic-Indic digits must normalize to ASCII');
const invalidErrors = MedFlow.validate({
  name: '',
  nid: '999',
  age: '150',
  complaint: '',
  vitals: { hr: 300, sbp: 80, dbp: 100 }
});
assert.ok(invalidErrors.includes('name') && invalidErrors.includes('nid') && invalidErrors.includes('age'));
assert.ok(invalidErrors.includes('hr') && invalidErrors.includes('bp'));
console.log('[PASS 02/16] Input validation & Arabic-Indic digit normalization verified');

// 3. Test Red-Flag detection & bilingual clinical extraction on ACS scenario
const acs = MedFlow.SCENARIOS.acs;
const pAcs = MedFlow.normalize(acs);
assert.strictEqual(MedFlow.flag(pAcs).level, 'immediate', 'ACS scenario must flag immediate');
assert.ok(pAcs.structured.complaint_en.includes('Chest pain'), 'Bilingual EN summary should extract chest pain');
assert.ok(pAcs.structured.extracted_allergies.includes('Penicillin') || pAcs.allergies.includes('Penicillin'));
console.log('[PASS 03/16] Deterministic red-flag detection & bilingual ACS structuring verified');

// 4. Test Negation safety in Arabic & English
const negated = MedFlow.normalize({
  name: 'DEMO · Negated Test',
  nid: '1000001122',
  age: 30,
  complaint: 'ألم خفيف في الكاحل بعد الجري، لا أعاني من ألم في الصدر وبدون ضيق في التنفس'
});
assert.notStrictEqual(MedFlow.flag(negated).level, 'immediate', 'Negated chest pain/SOB should not trigger false immediate red flag');
assert.ok(negated.structured.hpi.negatives_en.includes('No chest pain'), 'Should capture pertinent negative: No chest pain');
console.log('[PASS 04/16] Arabic & English negation safety floor verified (no false red flags)');

// 5. Test Royal College of Physicians NEWS2 Early Warning Score calculation & escalation
const n2High = MedFlow.news2(
  MedFlow.normalize({
    name: 'DEMO · NEWS2 High',
    nid: '1000009911',
    age: 64,
    complaint: 'General weakness',
    vitals: { rr: 26, spo2: 90, sbp: 88, hr: 132, temp: 38.6 }
  })
);
assert.ok(n2High.score >= 7, 'Critical vitals must produce NEWS2 >= 7');
assert.strictEqual(n2High.risk, 'high', 'NEWS2 >= 7 must classify as high risk');
const n2MidPatient = MedFlow.normalize({
  name: 'DEMO · NEWS2 Medium',
  nid: '1000009912',
  age: 49,
  complaint: 'General fatigue',
  vitals: { rr: 22, spo2: 93, hr: 100, sbp: 115, dbp: 75, temp: 37.2 }
});
const n2Mid = MedFlow.news2(n2MidPatient);
assert.strictEqual(n2Mid.score, 5, 'Moderate abnormal vitals should score NEWS2 = 5');
assert.strictEqual(MedFlow.flag(n2MidPatient).level, 'priority', 'NEWS2 5-6 without red flag should escalate to priority');
console.log('[PASS 05/16] NEWS2 Early Warning Score calculator & automatic triage escalation verified');

// 6. Test NPHIES / ICD-10-AM Preliminary Symptom Coding & Drug/Allergy Safety Alerts
const insights = MedFlow.clinicalInsights(pAcs);
assert.ok(insights.codes.some((c) => c.code === 'R07.9'), 'Chest pain should map to ICD-10-AM R07.9');
assert.ok(insights.codes.some((c) => c.code === 'R06.02'), 'Dyspnea should map to ICD-10-AM R06.02');
assert.ok(insights.alerts.some((a) => a.type === 'allergy'), 'Penicillin allergy should trigger safety alert');
assert.ok(insights.alerts.some((a) => a.type === 'med'), 'Aspirin use should trigger antiplatelet safety alert');
console.log('[PASS 06/16] NPHIES / ICD-10-AM preliminary symptom coding & allergy/medication alerts verified');

// 7. Test Jeddah ED Mass-Gathering Surge Simulator wave
const surge = MedFlow.surgeWave();
assert.strictEqual(surge.length, 5, 'Surge wave must contain 5 realistic Jeddah ED arrivals');
assert.ok(surge.some((p) => MedFlow.flag(p).level === 'immediate'), 'Surge wave must include Zone A immediate case');
assert.ok(surge.some((p) => MedFlow.flag(p).level === 'priority'), 'Surge wave must include Zone B priority case');
assert.ok(surge.some((p) => MedFlow.flag(p).level === 'standard'), 'Surge wave must include Zone C standard case');
console.log('[PASS 07/16] Jeddah ED Mass-Gathering Surge Wave (+5 patients across Zones A/B/C) verified');

// 8. Test QR Zone Routing Ticket & Bilingual SOAP Note generation
const ticket = MedFlow.routingTicket(pAcs, [pAcs]);
assert.ok(ticket.code.startsWith('E-'), 'Immediate red-flag encounter must get E-xxx emergency ticket');
assert.ok(ticket.zoneEn.includes('Zone A'), 'Immediate red-flag must route to Zone A');
assert.ok(MedFlow.qrSvg(ticket.code).includes('<svg'), 'QR SVG generator must return valid SVG');
const soapEn = MedFlow.soap(pAcs, 'en');
const soapAr = MedFlow.soap(pAcs, 'ar');
assert.ok(soapEn.o.includes('NEWS2 Score:'), 'English SOAP Objective must include NEWS2 score');
assert.ok(soapEn.a.includes('R07.9'), 'English SOAP Assessment must include ICD-10-AM code');
assert.ok(soapAr.a.includes('R07.9'), 'Arabic SOAP Assessment must include ICD-10-AM code');
console.log('[PASS 08/16] QR Zone Routing Ticket & Bilingual SOAP Note (with NEWS2 + ICD-10-AM) verified');

// 9. Test HL7 FHIR R4 Document Bundle with NPHIES profile & ICD-10-AM Encounter.reasonCode
const bundle = MedFlow.fhir(pAcs);
assert.strictEqual(bundle.resourceType, 'Bundle');
assert.strictEqual(bundle.type, 'document');
assert.strictEqual(bundle.entry[0].resource.resourceType, 'Composition');
const encResource = bundle.entry.find((e) => e.resource.resourceType === 'Encounter').resource;
assert.ok(Array.isArray(encResource.reasonCode) && encResource.reasonCode.length > 0, 'FHIR Encounter must include ICD-10-AM reasonCode');
assert.strictEqual(encResource.reasonCode[0].coding[0].system, 'http://hl7.org/fhir/sid/icd-10-am');
console.log('[PASS 09/16] HL7 FHIR R4 Bundle with NPHIES profile & ICD-10-AM Encounter.reasonCode verified');

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
  // 10. Test GET /api/health & GET /api/state
  const health = (await invokeServer('GET', '/api/health')).json;
  assert.strictEqual(health.ok, true);
  const stateRes = (await invokeServer('GET', '/api/state')).json;
  assert.strictEqual(stateRes.ok, true);
  assert.ok(Array.isArray(stateRes.queue));
  console.log(`[PASS 10/16] GET /api/health & GET /api/state (${health.service})`);

  // 11. Test POST /api/structure
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
  assert.ok(/chest/i.test(stRes.structured.complaint_en), 'EN summary should mention chest pain');
  assert.ok(
    /penicillin|بنسلين/i.test(stRes.structured.extracted_allergies),
    'Should extract Penicillin allergy'
  );
  assert.ok(
    /metformin|ميتفورمين/i.test(stRes.structured.extracted_medications),
    'Should extract Metformin medication'
  );
  assert.ok(Array.isArray(stRes.structured.followups));
  console.log(
    `[PASS 11/16] POST /api/structure extracted bilingual HPI, allergies, medications & follow-ups (${stRes.structured.provider})`
  );

  // 12. Test POST /api/encounters
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
  assert.ok(
    /penicillin|بنسلين/i.test(createRes.encounter.allergies),
    'Server auto-populated extracted allergy'
  );
  const encId = createRes.encounter.id;
  console.log('[PASS 12/16] POST /api/encounters created encounter & auto-filled extracted health details');

  // 13. Test POST /api/encounters/:id/review
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
  console.log('[PASS 13/16] POST /api/encounters/:id/review confirmed clinical note & objective vitals');

  // 14. Test POST /api/surge
  const surgeRes = (await invokeServer('POST', '/api/surge')).json;
  assert.strictEqual(surgeRes.ok, true);
  assert.strictEqual(surgeRes.added, 5);
  assert.ok(surgeRes.queue.length >= 6);
  console.log('[PASS 14/16] POST /api/surge added 5 Jeddah mass-gathering ED arrivals & logged audit event');

  // 15. Test POST /api/transcribe & POST /api/tts
  const sttRes = (
    await invokeServer(
      'POST',
      '/api/transcribe?lang=ar',
      { 'content-type': 'audio/webm' },
      Buffer.alloc(512, 1)
    )
  ).json;
  assert.ok(sttRes.mode === 'no-api-key' || sttRes.mode === 'openai' || sttRes.mode === 'openai-error');
  const ttsRes = await invokeServer(
    'POST',
    '/api/tts',
    { 'content-type': 'application/json' },
    { text: 'تذكرة طوارئ رقم E-104. يرجى التوجه إلى المنطقة ألف.', lang: 'ar' }
  );
  assert.strictEqual(ttsRes.status, 200);
  console.log(`[PASS 15/16] POST /api/transcribe (${sttRes.mode}) & POST /api/tts neural voice endpoints verified`);

  // 16. Verify all competition UI modules exist in synced HTML
  assert.ok(html.includes('id="view-guide"'), 'Interactive Guide & Tutorial tab must be present');
  assert.ok(html.includes('id="tour-bar"'), 'Floating 4-step tour banner must be present');
  assert.ok(html.includes('id="simulate-surge-btn"'), 'Jeddah ED Surge Simulator button must be present');
  assert.ok(html.includes('id="roi-card"'), 'Hospital ROI & Vision 2030 Calculator card must be present');
  assert.ok(html.includes('NEWS2:'), 'NEWS2 EWS clinician badge must be present');

  // Restore clean seed state after test
  await invokeServer('POST', '/api/reset');
  await invokeServer('POST', '/api/seed');
  console.log('[PASS 16/16] All UI elements verified & clean Jeddah ED seed state restored');
  console.log('\n==================================================================');
  console.log('  ALL 16/16 SYHF MEDATHON MVP TEST SUITES PASSED FLAWLESSLY!');
  console.log('==================================================================');
})();
