'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const MedFlow = require('./public/medflow-core.js');

// Load .env if present (zero external dependencies)
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx > 0) {
      const k = trimmed.slice(0, idx).trim();
      const v = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'medflow-db.json');

let runtimeOpenAIKey = process.env.OPENAI_API_KEY || '';
const STT_MODEL = process.env.OPENAI_STT_MODEL || 'gpt-4o-mini-transcribe';
const LLM_MODEL = process.env.OPENAI_LLM_MODEL || 'gpt-4o-mini';

// Persistent state for Kiosk <-> Clinician multi-device sync
let db = {
  schema: 2,
  queue: [],
  audit: []
};

function loadDB() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      if (parsed && Array.isArray(parsed.queue) && Array.isArray(parsed.audit)) {
        db.queue = parsed.queue.slice(0, 200).map(MedFlow.normalize);
        db.audit = parsed.audit.slice(0, 400);
        return;
      }
    }
  } catch (err) {
    console.warn('[MedFlow] Could not load existing DB, initializing fresh seed:', err.message);
  }
  db.queue = MedFlow.seed();
  db.audit = [
    {
      id: MedFlow.uid(),
      at: new Date().toISOString(),
      actor: 'MedFlow Server',
      action: 'demo.initialized',
      patientId: null,
      detail: 'SYHF MEDATHON Jeddah synthetic seed patients initialized'
    }
  ];
  saveDB();
}

function saveDB() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('[MedFlow] Failed to write DB:', err.message);
  }
}

function addAudit(action, actor, patientId, detail) {
  const entry = {
    id: MedFlow.uid(),
    at: new Date().toISOString(),
    actor: MedFlow.text(actor || 'Demo Patient', 80),
    action: MedFlow.text(action, 80),
    patientId: patientId ? MedFlow.text(patientId, 60) : null,
    detail: MedFlow.text(detail || '', 1700)
  };
  db.audit.unshift(entry);
  db.audit = db.audit.slice(0, 400);
  saveDB();
  return entry;
}

// Server-Sent Events (SSE) clients for live Kiosk -> Clinician Dashboard sync
const sseClients = new Set();

function broadcastState(eventType = 'sync', meta = {}) {
  const payload = JSON.stringify({
    type: eventType,
    meta,
    queue: db.queue,
    audit: db.audit,
    aiConfigured: Boolean(runtimeOpenAIKey)
  });
  for (const res of sseClients) {
    try {
      res.write(`data: ${payload}\n\n`);
    } catch (_) {
      sseClients.delete(res);
    }
  }
}

function resolveApiKey(req) {
  const headerKey = req.headers['x-openai-key'];
  if (typeof headerKey === 'string' && headerKey.trim().startsWith('sk-')) {
    return headerKey.trim();
  }
  return runtimeOpenAIKey;
}

async function callOpenAIStructure(apiKey, payload) {
  const complaint = MedFlow.text(payload.complaint, 3000);
  if (!complaint) return null;

  const fallback = MedFlow.localStructure(complaint, payload);
  if (!apiKey) return fallback;

  const schema = {
    name: 'clinical_intake_extraction',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        detected_language: { type: 'string', enum: ['ar', 'en', 'mixed'] },
        complaint_en: {
          type: 'string',
          description: 'Concise, accurate English clinical summary of what the patient stated, without inventing unmentioned findings.'
        },
        complaint_ar: {
          type: 'string',
          description: 'Concise, accurate Arabic clinical summary of what the patient stated, without inventing unmentioned findings.'
        },
        hpi: {
          type: 'object',
          additionalProperties: false,
          properties: {
            duration_en: { type: 'string' },
            duration_ar: { type: 'string' },
            associated_en: { type: 'array', items: { type: 'string' } },
            associated_ar: { type: 'array', items: { type: 'string' } },
            negatives_en: { type: 'array', items: { type: 'string' } },
            negatives_ar: { type: 'array', items: { type: 'string' } }
          },
          required: [
            'duration_en',
            'duration_ar',
            'associated_en',
            'associated_ar',
            'negatives_en',
            'negatives_ar'
          ]
        },
        extracted_allergies: {
          type: 'string',
          description: 'Any drug/food allergies mentioned in the complaint text, or empty string if not mentioned.'
        },
        extracted_medications: {
          type: 'string',
          description: 'Any current medications mentioned in the complaint text, or empty string if not mentioned.'
        },
        extracted_history: {
          type: 'string',
          description: 'Any chronic conditions or medical history mentioned in the complaint text, or empty string if not mentioned.'
        },
        followups: {
          type: 'array',
          description: '2 to 3 quick tap-to-answer follow-up clarifier items to ask the patient based on missing HPI details (such as duration, severity, radiation, or pertinent negatives).',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              label_en: { type: 'string' },
              label_ar: { type: 'string' },
              append_en: { type: 'string' },
              append_ar: { type: 'string' }
            },
            required: ['label_en', 'label_ar', 'append_en', 'append_ar']
          }
        },
        ai_urgency: {
          type: 'string',
          enum: ['immediate', 'priority', 'standard', 'unclassified'],
          description: 'Suggested triage urgency category for human clinician review.'
        },
        ai_rationale_en: {
          type: 'string',
          description: 'Short 1-sentence reason for suggested urgency in English (no definitive diagnosis).'
        },
        ai_rationale_ar: {
          type: 'string',
          description: 'Short 1-sentence reason for suggested urgency in Arabic (no definitive diagnosis).'
        }
      },
      required: [
        'detected_language',
        'complaint_en',
        'complaint_ar',
        'hpi',
        'extracted_allergies',
        'extracted_medications',
        'extracted_history',
        'followups',
        'ai_urgency',
        'ai_rationale_en',
        'ai_rationale_ar'
      ]
    }
  };

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content:
              'You are a bilingual (Arabic/English) Emergency Department clinical intake structuring assistant for a Saudi hospital kiosk (MedFlow AI). Structure ONLY what the patient explicitly stated. Never fabricate vital signs or unmentioned symptoms. Never issue a medical diagnosis; only summarize for clinician handover and flag potential red-flag urgency.'
          },
          {
            role: 'user',
            content: JSON.stringify({
              patient_statement: complaint,
              age: payload.age ?? null,
              sex: payload.sex ?? 'unknown',
              existing_allergies: payload.allergies || '',
              existing_medications: payload.medications || '',
              existing_history: payload.history || '',
              patient_entered_vitals: payload.vitals || {}
            })
          }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: schema
        }
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.warn('[MedFlow OpenAI Structure Warning]', resp.status, errText.slice(0, 250));
      return fallback;
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return fallback;
    const parsed = JSON.parse(content);
    return {
      provider: `openai:${LLM_MODEL}`,
      ...parsed
    };
  } catch (err) {
    console.warn('[MedFlow OpenAI Structure Error]', err.message);
    return fallback;
  }
}

async function translateTranscriptIfNeeded(apiKey, rawText, targetLang) {
  const cleaned = MedFlow.text(rawText, 3000);
  if (!cleaned || !apiKey) return cleaned;
  const hasArabic = /[\u0600-\u06FF]/.test(cleaned);
  const hasLatin = /[a-zA-Z]{3,}/.test(cleaned);

  if (targetLang === 'ar' && hasLatin) {
    try {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: LLM_MODEL,
          temperature: 0.1,
          messages: [
            {
              role: 'system',
              content:
                'Translate the patient\'s first-person emergency department complaint accurately into natural Saudi/Modern Standard Arabic (first-person, e.g., "أعاني من..."). Output ONLY the Arabic translation, nothing else.'
            },
            { role: 'user', content: cleaned }
          ]
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        const out = MedFlow.text(data.choices?.[0]?.message?.content || '', 3000);
        if (out) return out;
      }
    } catch (_) {}
  } else if (targetLang === 'en' && hasArabic && !hasLatin) {
    try {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: LLM_MODEL,
          temperature: 0.1,
          messages: [
            {
              role: 'system',
              content:
                'Translate the patient\'s first-person emergency department complaint accurately into natural English (first-person, e.g., "I have..."). Output ONLY the English translation, nothing else.'
            },
            { role: 'user', content: cleaned }
          ]
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        const out = MedFlow.text(data.choices?.[0]?.message?.content || '', 3000);
        if (out) return out;
      }
    } catch (_) {}
  }
  return cleaned;
}

async function callOpenAITTS(apiKey, speechText, lang = 'ar') {
  const input = MedFlow.text(speechText, 1000);
  if (!input || !apiKey) return { ok: false, error: 'Missing text or API key' };
  try {
    const resp = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice: lang === 'ar' ? 'onyx' : 'nova',
        input,
        response_format: 'mp3'
      })
    });
    if (!resp.ok) {
      const errText = await resp.text();
      return { ok: false, error: `OpenAI TTS HTTP ${resp.status}: ${errText.slice(0, 180)}` };
    }
    const arrayBuf = await resp.arrayBuffer();
    return { ok: true, buffer: Buffer.from(arrayBuf) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function callOpenAITranscribe(apiKey, audioBuffer, contentType, langHint) {
  const ext = contentType.includes('mp4')
    ? 'mp4'
    : contentType.includes('ogg')
    ? 'ogg'
    : contentType.includes('wav')
    ? 'wav'
    : 'webm';
  const cleanMime = contentType.split(';')[0].trim() || 'audio/webm';

  const modelsToTry = [STT_MODEL];
  if (STT_MODEL !== 'whisper-1') modelsToTry.push('whisper-1');

  let lastError = 'Unknown transcription error';
  for (const model of modelsToTry) {
    try {
      const form = new FormData();
      const blob = new Blob([audioBuffer], { type: cleanMime });
      form.append('file', blob, `intake.${ext}`);
      form.append('model', model);
      form.append(
        'prompt',
        'تسجيل استقبال طوارئ طبي في السعودية. أعاني من ألم في الصدر، ضيق في التنفس، حمى، صداع، دوخة، سكري، ضغط، حساسية بنسلين. Emergency department intake in Jeddah Saudi Arabia.'
      );

      const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`
        },
        body: form
      });

      if (resp.ok) {
        const result = await resp.json();
        return {
          ok: true,
          model,
          text: MedFlow.text(result.text || '', 3000)
        };
      } else {
        const errBody = await resp.text();
        lastError = `OpenAI HTTP ${resp.status}: ${errBody.slice(0, 200)}`;
      }
    } catch (err) {
      lastError = err.message;
    }
  }
  return { ok: false, error: lastError };
}

function readBodyBuffer(req, maxBytes = 15 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function readJson(req) {
  const buf = await readBodyBuffer(req, 1024 * 1024);
  if (!buf.length) return {};
  return JSON.parse(buf.toString('utf8'));
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const CSP_HEADER =
  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'";

loadDB();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', CSP_HEADER);

    // 1. Server-Sent Events (SSE) for real-time Kiosk <-> Clinician sync
    if (req.method === 'GET' && pathname === '/api/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive'
      });
      res.write(
        `data: ${JSON.stringify({
          type: 'connected',
          queue: db.queue,
          audit: db.audit,
          aiConfigured: Boolean(runtimeOpenAIKey)
        })}\n\n`
      );
      sseClients.add(res);
      req.on('close', () => sseClients.delete(res));
      return;
    }

    // 2. Health & AI configuration check
    if (req.method === 'GET' && pathname === '/api/health') {
      const apiKey = resolveApiKey(req);
      return sendJson(res, 200, {
        ok: true,
        service: 'MedFlow AI — SYHF MEDATHON Jeddah MVP',
        aiConfigured: Boolean(apiKey),
        keySource: process.env.OPENAI_API_KEY
          ? 'env'
          : runtimeOpenAIKey
          ? 'runtime'
          : req.headers['x-openai-key']
          ? 'client-header'
          : 'none',
        sttModel: STT_MODEL,
        llmModel: LLM_MODEL,
        connectedClients: sseClients.size,
        encountersCount: db.queue.length
      });
    }

    // 3. Configure runtime OpenAI API key from UI modal
    if (req.method === 'POST' && pathname === '/api/config') {
      const body = await readJson(req);
      if (typeof body.openaiApiKey === 'string') {
        const trimmed = body.openaiApiKey.trim();
        if (trimmed === '' || trimmed.startsWith('sk-')) {
          runtimeOpenAIKey = trimmed;
          addAudit(
            'ai.config_updated',
            body.actor || 'System Admin',
            null,
            trimmed ? 'OpenAI API key configured at runtime' : 'OpenAI API key cleared (using local NLP fallback)'
          );
          broadcastState('ai-config');
          return sendJson(res, 200, {
            ok: true,
            aiConfigured: Boolean(runtimeOpenAIKey),
            sttModel: STT_MODEL,
            llmModel: LLM_MODEL
          });
        }
        return sendJson(res, 400, { ok: false, error: 'Invalid OpenAI API key format (must start with sk-)' });
      }
      return sendJson(res, 400, { ok: false, error: 'Missing openaiApiKey field' });
    }

    // 4. Get full state
    if (req.method === 'GET' && pathname === '/api/state') {
      return sendJson(res, 200, {
        ok: true,
        queue: db.queue,
        audit: db.audit,
        aiConfigured: Boolean(resolveApiKey(req)),
        sttModel: STT_MODEL,
        llmModel: LLM_MODEL
      });
    }

    // 5. OpenAI Speech-to-Text Transcription endpoint
    if (req.method === 'POST' && pathname === '/api/transcribe') {
      const apiKey = resolveApiKey(req);
      const contentType = req.headers['content-type'] || 'audio/webm';
      const langHint = url.searchParams.get('lang') || '';
      const audioBuffer = await readBodyBuffer(req, 15 * 1024 * 1024);

      if (!audioBuffer || audioBuffer.length < 100) {
        return sendJson(res, 400, {
          ok: false,
          mode: 'error',
          message: 'Audio recording was empty or too short.'
        });
      }

      if (!apiKey) {
        return sendJson(res, 200, {
          ok: true,
          mode: 'no-api-key',
          text: '',
          message:
            'No OpenAI API key configured on server. Add OPENAI_API_KEY in AI Settings or use Browser Live Speech / Demo Voice.'
        });
      }

      const sttResult = await callOpenAITranscribe(apiKey, audioBuffer, contentType, langHint);
      if (!sttResult.ok || !sttResult.text) {
        return sendJson(res, 200, {
          ok: false,
          mode: 'openai-error',
          text: '',
          error: sttResult.error || 'No speech detected in audio.'
        });
      }

      const finalText = await translateTranscriptIfNeeded(apiKey, sttResult.text, langHint);
      const structured = await callOpenAIStructure(apiKey, { complaint: finalText });
      addAudit(
        'voice.transcribed',
        'Patient Kiosk',
        null,
        `Transcribed via OpenAI (${sttResult.model}); targetLang: ${langHint || 'auto'}; length: ${finalText.length} chars`
      );
      broadcastState('audit');

      return sendJson(res, 200, {
        ok: true,
        mode: 'openai',
        model: sttResult.model,
        text: finalText,
        originalText: sttResult.text,
        structured
      });
    }

    // 5b. OpenAI Neural Text-to-Speech (TTS) endpoint for Arabic & English voice instructions
    if (req.method === 'POST' && pathname === '/api/tts') {
      const apiKey = resolveApiKey(req);
      const body = await readJson(req);
      const speechText = MedFlow.text(body.text, 1000);
      const lang = body.lang === 'en' ? 'en' : 'ar';
      if (!speechText) {
        return sendJson(res, 400, { ok: false, error: 'Missing text for TTS' });
      }
      if (!apiKey) {
        return sendJson(res, 200, { ok: false, mode: 'no-api-key' });
      }
      const tts = await callOpenAITTS(apiKey, speechText, lang);
      if (!tts.ok || !tts.buffer) {
        return sendJson(res, 200, { ok: false, mode: 'tts-error', error: tts.error });
      }
      res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Content-Length': tts.buffer.length,
        'Cache-Control': 'no-store'
      });
      res.end(tts.buffer);
      return;
    }

    // 6. AI Clinical Intake Structuring & Bilingual SOAP Handover endpoint
    if (req.method === 'POST' && pathname === '/api/structure') {
      const apiKey = resolveApiKey(req);
      const body = await readJson(req);
      const complaint = MedFlow.text(body.complaint, 3000);
      if (!complaint) {
        return sendJson(res, 400, { ok: false, error: 'Complaint text is required' });
      }
      const structured = await callOpenAIStructure(apiKey, body);
      return sendJson(res, 200, {
        ok: true,
        structured
      });
    }

    // 7. Create a new Patient Encounter
    if (req.method === 'POST' && pathname === '/api/encounters') {
      const apiKey = resolveApiKey(req);
      const raw = await readJson(req);
      const errors = MedFlow.validate(raw);
      if (errors.length) {
        return sendJson(res, 400, { ok: false, errors });
      }
      if (!raw.structured && raw.complaint) {
        raw.structured = await callOpenAIStructure(apiKey, raw);
      }
      // Auto-fill extracted allergies/meds/history if patient left optional fields blank
      if (!raw.allergies && raw.structured?.extracted_allergies) {
        raw.allergies = raw.structured.extracted_allergies;
      }
      if (!raw.medications && raw.structured?.extracted_medications) {
        raw.medications = raw.structured.extracted_medications;
      }
      if (!raw.history && raw.structured?.extracted_history) {
        raw.history = raw.structured.extracted_history;
      }

      const encounter = MedFlow.normalize({
        ...raw,
        id: raw.id || MedFlow.uid(),
        createdAt: new Date().toISOString()
      });
      db.queue.unshift(encounter);
      db.queue = db.queue.slice(0, 200);
      addAudit(
        'intake.created',
        'Demo Patient',
        encounter.id,
        `Patient confirmed text; source: ${encounter.source}; urgency flag: ${MedFlow.flag(encounter).level}`
      );
      broadcastState('encounter.created', { encounterId: encounter.id });
      return sendJson(res, 201, { ok: true, encounter, queue: db.queue, audit: db.audit });
    }

    // 8. Save Clinician Review on an Encounter
    const reviewMatch = pathname.match(/^\/api\/encounters\/([a-zA-Z0-9-]+)\/review$/);
    if (req.method === 'POST' && reviewMatch) {
      const encounterId = reviewMatch[1];
      const idx = db.queue.findIndex((p) => p.id === encounterId);
      if (idx === -1) {
        return sendJson(res, 404, { ok: false, error: 'Encounter not found' });
      }
      const p = db.queue[idx];
      const body = await readJson(req);
      const urgency = body.urgency;
      const comment = MedFlow.text(body.comment, 1500);
      const measuredVitals = body.measuredVitals || {};
      const confirmed = body.confirmed === true;
      const reviewer = MedFlow.text(body.reviewer || 'Demo Clinician', 80);

      const vitalErrors = MedFlow.validate({ ...p, vitals: measuredVitals }).filter(
        (x) => Object.keys(MedFlow.limits).includes(x) || x === 'bp'
      );
      if (vitalErrors.length) {
        return sendJson(res, 400, { ok: false, errors: vitalErrors });
      }

      const oldUrgency = p.review?.urgency || 'unreviewed';
      p.measuredVitals = {};
      for (const [k, v] of Object.entries(measuredVitals)) {
        if (v !== '' && v != null && Number.isFinite(Number(v))) {
          p.measuredVitals[k] = Number(v);
        }
      }
      p.review = {
        urgency,
        comment,
        confirmed,
        reviewer,
        at: new Date().toISOString()
      };
      db.queue[idx] = MedFlow.normalize(p);
      addAudit(
        confirmed ? 'note.confirmed' : 'review.saved',
        reviewer,
        p.id,
        `urgency: ${oldUrgency} → ${urgency}; original prototype flag: ${MedFlow.flag(p).level}; comment: ${comment || '(none)'}`
      );
      broadcastState('encounter.reviewed', { encounterId: p.id });
      return sendJson(res, 200, { ok: true, encounter: db.queue[idx], queue: db.queue, audit: db.audit });
    }

    // 9. Log Client Audit Event (role switches, FHIR preview/download)
    if (req.method === 'POST' && pathname === '/api/audit') {
      const body = await readJson(req);
      if (body.action) {
        addAudit(body.action, body.actor || 'Demo User', body.patientId || null, body.detail || '');
        broadcastState('audit');
      }
      return sendJson(res, 200, { ok: true, audit: db.audit });
    }

    // 10. Load Seed Patients / Reset Demo Data
    if (req.method === 'POST' && pathname === '/api/seed') {
      const seeds = MedFlow.seed();
      db.queue.push(...seeds);
      db.queue = db.queue.slice(0, 200);
      addAudit('demo.seeds_loaded', 'Demo User', null, 'Three fictional Jeddah ED encounters added');
      broadcastState('seed');
      return sendJson(res, 200, { ok: true, queue: db.queue, audit: db.audit });
    }

    if (req.method === 'POST' && pathname === '/api/reset') {
      db.queue = [];
      db.audit = [];
      saveDB();
      broadcastState('reset');
      return sendJson(res, 200, { ok: true, queue: db.queue, audit: db.audit });
    }

    // Static files serving
    let filePath;
    if (pathname === '/' || pathname === '/index.html') {
      filePath = path.join(__dirname, 'public', 'index.html');
    } else if (pathname === '/UPDATEDindex.html') {
      filePath = path.join(__dirname, 'UPDATEDindex.html');
    } else {
      const safeRel = path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, '');
      filePath = path.join(__dirname, 'public', safeRel);
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Cache-Control': 'no-cache'
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    sendJson(res, 404, { ok: false, error: 'Not found' });
  } catch (err) {
    console.error('[MedFlow Server Error]', err);
    if (!res.headersSent) {
      sendJson(res, 500, { ok: false, error: err.message || 'Internal server error' });
    }
  }
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`\n==================================================================`);
    console.log(`  MedFlow AI — SYHF MEDATHON (Jeddah) MVP Server`);
    console.log(`  Local URL:       http://localhost:${PORT}`);
    console.log(`  OpenAI STT/LLM:  ${runtimeOpenAIKey ? 'CONNECTED (' + STT_MODEL + ' / ' + LLM_MODEL + ')' : 'Standby (Configure in UI or .env)'}`);
    console.log(`==================================================================\n`);
  });
}

module.exports = { server, db };
