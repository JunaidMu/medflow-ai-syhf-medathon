/* MedFlow AI — Shared Clinical Intake Core (Browser + Node.js Isomorphic)
 * Built for SYHF MEDATHON (Jeddah) · Tracks: Crowd & Patient Flow + Digital Transformation
 * Safety Principle: Deterministic red-flag & vitals rules act as a hard safety floor.
 * AI structuring can elevate urgency or enrich bilingual SOAP handover, never downgrade red flags.
 */
(function (root) {
  'use strict';

  const ARABIC_STATEMENT =
    'أعاني من ألم شديد وضغط في منتصف الصدر يمتد إلى الكتف الأيسر مع ضيق في التنفس وتعرق منذ ٤٥ دقيقة. لدي سكري وضغط وآخذ ميتفورمين وأسبرين، ولدي حساسية من البنسلين';

  const SCENARIOS = {
    acs: {
      id: 'acs',
      labelEn: '1 · Acute Chest Pain & Dyspnea (Red Flag · Arabic)',
      labelAr: '١ · ألم صدر حاد وضيق تنفس (إنذار فوري · عربي)',
      name: 'DEMO · Patient Atlas (Jeddah ED)',
      nid: '1000007788',
      age: 54,
      sex: 'male',
      complaint: ARABIC_STATEMENT,
      allergies: 'بنسلين (Penicillin)',
      medications: 'ميتفورمين 500mg، أسبرين 81mg (Metformin, Aspirin)',
      history: 'السكري من النوع الثاني، ارتفاع ضغط الدم (Type 2 DM, HTN)',
      vitals: { hr: 114, sbp: 158, dbp: 94, spo2: 91, temp: 37.1, rr: 24, pain: 9 },
      doorToIntakeSec: 42
    },
    umrah_asthma: {
      id: 'umrah_asthma',
      labelEn: '2 · Umrah Visitor Acute Wheezing (Red Flag · Arabic)',
      labelAr: '٢ · زائر عمرة — نوبة ربو وضيق تنفس (إنذار فوري)',
      name: 'DEMO · Pilgrim Al-Harbi',
      nid: '2000005519',
      age: 62,
      sex: 'female',
      complaint:
        'عندي كتمة شديدة في النفس وصفير في الصدر منذ ساعتين بعد انتهاء بخاخ الفينتولين. لا يوجد ألم في الصدر. لدي تاريخ ربو مزمن ولا توجد حساسية معروفة.',
      allergies: 'لا توجد حساسية معروفة (NKDA)',
      medications: 'بخاخ فينتولين (سالبوتامول / Salbutamol inhaler)',
      history: 'ربو شعبي مزمن (Bronchial Asthma)',
      vitals: { hr: 118, sbp: 136, dbp: 84, spo2: 90, temp: 36.9, rr: 28, pain: 4 },
      doorToIntakeSec: 38
    },
    peds_fever: {
      id: 'peds_fever',
      labelEn: '3 · High Fever & Persistent Vomiting (Priority · Bilingual)',
      labelAr: '٣ · حمى شديدة وقيء متكرر (أولوية · ثنائي اللغة)',
      name: 'DEMO · Patient Rayyan',
      nid: '1000009123',
      age: 19,
      sex: 'male',
      complaint:
        'حمى شديدة منذ يومين وصلت 39.4 مع قيء متكرر وألم في البطن بعد الأكل ودوخة خفيفة. لا أعاني من ألم في الصدر أو ضيق في التنفس. آخذ باراسيتامول فقط.',
      allergies: 'سلفا (Sulfa drugs)',
      medications: 'باراسيتامول عند اللزوم (Paracetamol PRN)',
      history: 'لا يوجد تاريخ مرضي مزمن (None)',
      vitals: { hr: 104, sbp: 112, dbp: 72, spo2: 98, temp: 39.4, rr: 19, pain: 6 },
      doorToIntakeSec: 51
    },
    trauma_ankle: {
      id: 'trauma_ankle',
      labelEn: '4 · Minor Sports Ankle Sprain (Standard · English/Arabic)',
      labelAr: '٤ · التواء كاحل رياضي بسيط (اعتيادي)',
      name: 'DEMO · Patient Olive',
      nid: '2000001287',
      age: 26,
      sex: 'male',
      complaint:
        'Minor right ankle sprain after playing football in North Obhur 2 hours ago. Mild swelling over lateral ankle, able to bear some weight. Denies chest pain, shortness of breath, or head injury.',
      allergies: 'Not provided',
      medications: 'Ibuprofen 400mg once today',
      history: 'Healthy, no chronic conditions',
      vitals: { hr: 78, sbp: 122, dbp: 78, spo2: 99, temp: 36.7, rr: 15, pain: 4 },
      doorToIntakeSec: 35
    }
  };

  const QUICK_SYMPTOMS = [
    {
      id: 'chest',
      labelEn: '🫀 Chest Pain',
      labelAr: '🫀 ألم في الصدر',
      textEn: 'I have chest pain and pressure',
      textAr: 'أعاني من ألم وضغط في الصدر'
    },
    {
      id: 'breathing',
      labelEn: '🫁 Shortness of Breath',
      labelAr: '🫁 ضيق في التنفس',
      textEn: 'shortness of breath and difficulty breathing',
      textAr: 'ضيق وصعوبة في التنفس'
    },
    {
      id: 'fever',
      labelEn: '🌡️ High Fever',
      labelAr: '🌡️ حمى وارتفاع حرارة',
      textEn: 'high fever and body aches',
      textAr: 'حمى شديدة وارتفاع في درجة الحرارة'
    },
    {
      id: 'abdomen',
      labelEn: '🤢 Abdominal Pain / Vomiting',
      labelAr: '🤢 ألم بطن / قيء',
      textEn: 'abdominal pain and nausea/vomiting',
      textAr: 'ألم في البطن مع غثيان وقيء'
    },
    {
      id: 'neuro',
      labelEn: '🧠 Headache / Dizziness',
      labelAr: '🧠 صداع / دوخة',
      textEn: 'severe headache and dizziness',
      textAr: 'صداع شديد مع دوخة'
    },
    {
      id: 'limb',
      labelEn: '🦴 Sprain / Minor Injury',
      labelAr: '🦴 التواء / إصابة بسيطة',
      textEn: 'minor limb sprain and localized swelling, no chest pain',
      textAr: 'التواء بسيط في الطرف مع تورم موضعي، ولا أعاني من ألم في الصدر'
    }
  ];

  const limits = {
    hr: [20, 250],
    sbp: [40, 260],
    dbp: [20, 180],
    spo2: [30, 100],
    temp: [30, 45],
    rr: [3, 80],
    pain: [0, 10]
  };

  const vitalSpec = {
    hr: ['Heart rate', 'النبض', '8867-4', '/min'],
    sbp: ['Systolic BP', 'الضغط الانقباضي', '8480-6', 'mm[Hg]'],
    dbp: ['Diastolic BP', 'الضغط الانبساطي', '8462-4', 'mm[Hg]'],
    spo2: ['SpO₂', 'تشبع الأكسجين', '59408-5', '%'],
    temp: ['Temperature', 'درجة الحرارة', '8310-5', 'Cel'],
    rr: ['Respiratory rate', 'معدل التنفس', '9279-1', '/min'],
    pain: ['Pain score', 'درجة الألم', '72514-3', '{score}']
  };

  const text = (v, max = 3000) =>
    String(v ?? '')
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
      .trim()
      .slice(0, max);

  const digits = (v) =>
    String(v ?? '').replace(/[٠-٩۰-۹]/g, (c) =>
      String(c.charCodeAt(0) - (c >= '۰' ? 1776 : 1632))
    );

  const uid = () =>
    root.crypto?.randomUUID?.() ||
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.floor(Math.random() * 16);
      return (c === 'x' ? r : (r & 3) | 8).toString(16);
    });

  function buildDefaultFollowups(norm, hasDuration, hasChest, negChest, hasFever, hasAllergy) {
    const list = [];
    if (!hasDuration) {
      list.push({
        label_en: '+ Started < 1 hour ago?',
        label_ar: '+ بدأ منذ أقل من ساعة؟',
        append_en: 'Started less than 1 hour ago.',
        append_ar: 'بدأت الأعراض منذ أقل من ساعة.'
      });
    }
    if (hasChest && !/left\s+(?:arm|shoulder)|الكتف الايسر|الذراع الايسر/.test(norm)) {
      list.push({
        label_en: '+ Radiates to left arm/jaw?',
        label_ar: '+ يمتد للذراع الأيسر أو الفك؟',
        append_en: 'Pain radiates to the left arm and shoulder.',
        append_ar: 'يمتد الألم إلى الكتف والذراع الأيسر.'
      });
    }
    if (!hasChest && !negChest) {
      list.push({
        label_en: '− Confirm no chest pain / SOB',
        label_ar: '− تأكيد عدم وجود ألم صدر أو ضيق تنفس',
        append_en: 'Denies chest pain or shortness of breath.',
        append_ar: 'لا أعاني من ألم في الصدر أو ضيق في التنفس.'
      });
    }
    if (!hasFever) {
      list.push({
        label_en: '+ Associated with fever?',
        label_ar: '+ هل يصاحبه حمى؟',
        append_en: 'Associated with fever and chills.',
        append_ar: 'يصاحبه حمى وارتفاع في الحرارة.'
      });
    }
    if (!hasAllergy) {
      list.push({
        label_en: '− No known drug allergies (NKDA)',
        label_ar: '− لا توجد حساسية للأدوية',
        append_en: 'No known drug allergies.',
        append_ar: 'لا توجد حساسية معروفة للأدوية.'
      });
    }
    return list.slice(0, 3);
  }

  // ---- Shared clinical text helpers (normalization + negation scoping) ----
  function clinicalText(s) {
    return digits(text(s, 3000))
      .toLowerCase()
      .normalize('NFKC')
      .replace(/[ًٌٍَُِّْـ]/g, '')
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/[’`]/g, "'");
  }

  const SYM_EN =
    "chest\\s+(?:pain|pressure|tightness)|pain\\s+in\\s+(?:my|the)\\s+chest|shortness of breath|difficulty breathing|trouble breathing|breathing difficulty|heavy bleeding|severe bleeding|bleeding|loss of consciousness|stroke symptoms";
  const SYM_AR =
    '(?:الم|وجع|ضغط)\\s+(?:في\\s+)?(?:ال)?صدر\\S*|ضيق\\s+(?:في\\s+)?(?:ال)?تنفس|صعوبه\\s+(?:في\\s+)?(?:ال)?تنفس|كتمه|نزيف(?:\\s+شديد)?|فقدان\\s+(?:ال)?وعي';
  const NEG_EN_RE = new RegExp(
    `\\b(?:no|denies|deny|denied|without|not having|don't have|do not have|never had)\\s+(?:any\\s+)?(?:${SYM_EN})(?:\\s*(?:,|or|nor|and)\\s*(?:any\\s+)?(?:${SYM_EN}))*`,
    'gi'
  );
  const NEG_AR_RE = new RegExp(
    `(?:لا اعاني من|ما اعاني من|لا يوجد|لا توجد|ما في|مافي|ما فيه|ما عندي|ماعندي|ليس لدي|ليس عندي|بدون|لا)(?:\\s+(?:عندي|لدي|اي))?\\s+(?:${SYM_AR})(?:\\s*(?:ولا|او|و)\\s*(?:${SYM_AR}))*`,
    'g'
  );
  function stripNegations(norm) {
    return norm.replace(NEG_EN_RE, ' ').replace(NEG_AR_RE, ' ');
  }
  const CHEST_RE =
    /chest\s*(?:pain|pressure|tightness)|pain\s+in\s+(?:my|the)\s+chest|chest\s+hurts|الم.{0,16}صدر|ضغط.{0,16}صدر|وجع.{0,16}صدر|وجع\s+(?:في\s+)?قلب|الم\s+(?:في\s+)?(?:ال)?قلب|صدري\s+يوجعني/i;
  const SOB_RE =
    /shortness of breath|difficulty breathing|trouble breathing|hard to breathe|struggling to breathe|breathless|cannot breathe|can't breathe|ضيق.{0,12}تنفس|صعوبه.{0,12}تنفس|كتمه|ما اقدر اتنفس|مو قادر اتنفس/i;

  function localStructure(complaintRaw, existing = {}) {
    const raw = text(complaintRaw, 3000);
    if (!raw) return null;
    const norm = digits(raw)
      .toLowerCase()
      .normalize('NFKC')
      .replace(/[ًٌٍَُِّْـ]/g, '')
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه');

    const isArabic = /[\u0600-\u06FF]/.test(raw);
    const positivesEn = [];
    const positivesAr = [];
    const negativesEn = [];
    const negativesAr = [];

    const negChest =
      /\b(?:no|denies|without)\s+(?:chest\s+(?:pain|pressure))\b/i.test(norm) ||
      /(?:لا اعاني من|لا يوجد|بدون)\s+(?:الم في الصدر|وجع في الصدر)/.test(norm) ||
      (CHEST_RE.test(clinicalText(raw)) && !CHEST_RE.test(stripNegations(clinicalText(raw))));
    const negSob =
      /\b(?:no|denies|without)\s+(?:shortness of breath|difficulty breathing)\b/i.test(norm) ||
      /(?:لا اعاني من|لا يوجد|بدون)\s+(?:ضيق في التنفس|صعوبه في التنفس|كتمه)/.test(norm) ||
      (SOB_RE.test(clinicalText(raw)) && !SOB_RE.test(stripNegations(clinicalText(raw))));
    const negBleed =
      /\b(?:no|denies|without)\s+(?:bleeding|head injury|loss of consciousness)\b/i.test(norm) ||
      /(?:لا يوجد|بدون)\s+(?:نزيف|فقدان وعي)/.test(norm);

    if (negChest) {
      negativesEn.push('No chest pain');
      negativesAr.push('ينفي ألم الصدر');
    }
    if (negSob) {
      negativesEn.push('No shortness of breath');
      negativesAr.push('ينفي ضيق التنفس');
    }
    if (negBleed) {
      negativesEn.push('No bleeding / LOC');
      negativesAr.push('ينفي النزيف أو فقدان الوعي');
    }

    const hasChest = !negChest && CHEST_RE.test(norm);
    if (hasChest) {
      positivesEn.push('Chest pain / pressure');
      positivesAr.push('ألم / ضغط في الصدر');
    }
    if (!negSob && (SOB_RE.test(norm) || /wheez|dyspnea|صفير/i.test(norm))) {
      positivesEn.push('Shortness of breath / dyspnea');
      positivesAr.push('ضيق في التنفس / كتمة');
    }
    if (/left\s+(?:arm|shoulder)|radiat/i.test(norm) || /الكتف الايسر|الذراع الايسر|يمتد/.test(norm)) {
      positivesEn.push('Radiation to left shoulder/arm');
      positivesAr.push('امتداد الألم للكتف/الذراع الأيسر');
    }
    if (/sweat|diaphores/i.test(norm) || /تعرق|عرق/.test(norm)) {
      positivesEn.push('Diaphoresis (sweating)');
      positivesAr.push('تعرق مصاحب');
    }
    const hasFever = /fever|temperature|chills/i.test(norm) || /حمى|حراره|سخونه/.test(norm);
    if (hasFever) {
      positivesEn.push('Fever');
      positivesAr.push('ارتفاع درجة الحرارة / حمى');
    }
    if (/vomit|nausea/i.test(norm) || /قيء|استفراغ|غثيان/.test(norm)) {
      positivesEn.push('Vomiting / nausea');
      positivesAr.push('قيء / غثيان');
    }
    if (/abdominal|stomach/i.test(norm) || /بطن|معده/.test(norm)) {
      positivesEn.push('Abdominal pain');
      positivesAr.push('ألم في البطن');
    }
    if (/dizz|lightheaded|headache/i.test(norm) || /دوخه|دوار|صداع/.test(norm)) {
      positivesEn.push('Headache / dizziness');
      positivesAr.push('صداع / دوخة');
    }
    if (/ankle|sprain|swell|limb/i.test(norm) || /كاحل|التواء|تورم|طرف/.test(norm)) {
      positivesEn.push('Limb sprain / localized swelling');
      positivesAr.push('إصابة طرفية / تورم موضعي');
    }

    let durationEn = 'Not specified';
    let durationAr = 'غير محدد';
    const minMatch = norm.match(/(\d+)\s*(?:minute|min|دقيقه|دقائق)/i);
    const hrMatch = norm.match(/(\d+|ساعتين|ساعه)\s*(?:hour|hr|ساعه|ساعات|ساعتين)?/i);
    const dayMatch = norm.match(/(\d+|يومين|يوم)\s*(?:day|days|يوم|ايام|يومين)?/i);
    if (minMatch) {
      durationEn = `${minMatch[1]} minutes`;
      durationAr = `${minMatch[1]} دقيقة`;
    } else if (/اقل من ساعه|less than 1 hour/i.test(norm)) {
      durationEn = '< 1 hour';
      durationAr = 'أقل من ساعة';
    } else if (/ساعتين|2\s*hours/i.test(norm)) {
      durationEn = '2 hours';
      durationAr = 'ساعتان';
    } else if (hrMatch && /\d+/.test(hrMatch[1])) {
      durationEn = `${hrMatch[1]} hour(s)`;
      durationAr = `${hrMatch[1]} ساعة`;
    } else if (/يومين|two\s*days|2\s*days/i.test(norm)) {
      durationEn = '2 days';
      durationAr = 'يومان';
    } else if (dayMatch && /\d+/.test(dayMatch[1])) {
      durationEn = `${dayMatch[1]} day(s)`;
      durationAr = `${dayMatch[1]} يوم`;
    }

    let extractedAllergies = existing.allergies || '';
    if (!extractedAllergies) {
      if (/penicillin|بنسلين/.test(norm)) extractedAllergies = 'Penicillin (بنسلين)';
      else if (/sulfa|سلفا/.test(norm)) extractedAllergies = 'Sulfa (سلفا)';
      else if (/peanut|فول سوداني/.test(norm)) extractedAllergies = 'Peanuts (فول سوداني)';
      else if (/latex|لاتكس/.test(norm)) extractedAllergies = 'Latex (لاتكس)';
      else if (/aspirin|اسبرين/.test(norm) && /حساسي|allerg/.test(norm)) extractedAllergies = 'Aspirin (أسبرين)';
      else if (/لا توجد حساسيه|بدون حساسيه|no known drug allerg|no allerg/i.test(norm))
        extractedAllergies = 'No known allergies (لا توجد حساسية معروفة)';
    }

    const medsFound = [];
    if (/metformin|ميتفورمين/.test(norm)) medsFound.push('Metformin (ميتفورمين)');
    if (/aspirin|اسبرين/.test(norm)) medsFound.push('Aspirin (أسبرين)');
    if (/ventolin|salbutamol|فينتولين|بخاخ/.test(norm))
      medsFound.push('Salbutamol / Ventolin inhaler (بخاخ فينتولين)');
    if (/paracetamol|panadol|باراسيتامول|بنادول/.test(norm))
      medsFound.push('Paracetamol (باراسيتامول)');
    if (/ibuprofen|ايبوبروفين|بروفين/.test(norm)) medsFound.push('Ibuprofen (إيبوبروفين)');
    const extractedMedications = existing.medications || medsFound.join(', ');

    const hxFound = [];
    if (/diabet|سكري|سكر/.test(norm)) hxFound.push('Diabetes Mellitus (السكري)');
    if (/hypertens|ضغط/.test(norm) && !/ضغط في منتصف الصدر|ضغط في الصدر/.test(norm))
      hxFound.push('Hypertension (ارتفاع ضغط الدم)');
    else if (/عندي ضغط|لدي سكري وضغط/.test(norm)) hxFound.push('Hypertension (ارتفاع ضغط الدم)');
    if (/asthma|ربو/.test(norm)) hxFound.push('Bronchial Asthma (ربو شعبي)');
    const extractedHistory = existing.history || hxFound.join(', ');

    const summaryEn = positivesEn.length
      ? `Patient reports: ${positivesEn.join(', ')}. Duration: ${durationEn}.${
          negativesEn.length ? ' Pertinent negatives: ' + negativesEn.join(', ') + '.' : ''
        }`
      : isArabic
      ? `Arabic intake captured (${raw.slice(0, 140)}). See verbatim statement and structured HPI below.`
      : raw;

    const summaryAr = positivesAr.length
      ? `يفيد المريض بوجود: ${positivesAr.join('، ')}. المدة: ${durationAr}.${
          negativesAr.length ? ' الأعراض المنفية: ' + negativesAr.join('، ') + '.' : ''
        }`
      : raw;

    const followups = buildDefaultFollowups(
      norm,
      durationEn !== 'Not specified',
      hasChest,
      negChest,
      hasFever,
      Boolean(extractedAllergies)
    );

    return {
      provider: 'local-clinical-nlp',
      detected_language: isArabic ? 'ar' : 'en',
      complaint_en: summaryEn,
      complaint_ar: summaryAr,
      hpi: {
        duration_en: durationEn,
        duration_ar: durationAr,
        associated_en: positivesEn,
        associated_ar: positivesAr,
        negatives_en: negativesEn,
        negatives_ar: negativesAr
      },
      extracted_allergies: extractedAllergies,
      extracted_medications: extractedMedications,
      extracted_history: extractedHistory,
      followups,
      ai_urgency: null,
      ai_rationale_en: 'Deterministic rule-based clinical extraction',
      ai_rationale_ar: 'استخلاص سريري قياسي مبني على القواعد'
    };
  }

  function normalize(raw) {
    const validSources = ['scenario', 'typed', 'voice-openai', 'voice-browser', 'voice-demo'];
    const p = {
      id: /^[a-z0-9-]{1,60}$/i.test(raw.id || '') ? raw.id : uid(),
      name: text(raw.name, 100),
      nid: digits(text(raw.nid, 10)),
      age: raw.age === '' ? NaN : Number(digits(raw.age)),
      sex: ['male', 'female', 'other', 'unknown'].includes(raw.sex) ? raw.sex : 'unknown',
      complaint: text(raw.complaint),
      allergies: text(raw.allergies, 500),
      medications: text(raw.medications, 500),
      history: text(raw.history, 1000),
      source: validSources.includes(raw.source) ? raw.source : 'typed',
      doorToIntakeSec:
        Number.isFinite(Number(raw.doorToIntakeSec)) && Number(raw.doorToIntakeSec) > 0
          ? Math.min(3600, Math.round(Number(raw.doorToIntakeSec)))
          : 42,
      createdAt: isFinite(Date.parse(raw.createdAt))
        ? new Date(raw.createdAt).toISOString()
        : new Date().toISOString(),
      vitals: {},
      measuredVitals: {},
      structured: null,
      review: null
    };
    for (const key of Object.keys(limits)) {
      for (const [field, from] of [
        ['vitals', raw.vitals],
        ['measuredVitals', raw.measuredVitals]
      ]) {
        const val = from?.[key];
        if (val !== '' && val !== null && val !== undefined) {
          const n = Number(digits(val));
          if (Number.isFinite(n) && n >= limits[key][0] && n <= limits[key][1]) p[field][key] = n;
        }
      }
    }
    if (raw.structured && typeof raw.structured === 'object') {
      const fallbackFollowups =
        Array.isArray(raw.structured.followups) && raw.structured.followups.length
          ? raw.structured.followups.slice(0, 4).map((f) => ({
              label_en: text(f.label_en, 80),
              label_ar: text(f.label_ar, 80),
              append_en: text(f.append_en, 200),
              append_ar: text(f.append_ar, 200)
            }))
          : (localStructure(p.complaint, p)?.followups || []);
      p.structured = {
        provider: text(raw.structured.provider || 'local-clinical-nlp', 60),
        detected_language: text(raw.structured.detected_language || 'auto', 15),
        complaint_en: text(raw.structured.complaint_en, 2000),
        complaint_ar: text(raw.structured.complaint_ar, 2000),
        hpi: {
          duration_en: text(raw.structured.hpi?.duration_en || 'Not specified', 200),
          duration_ar: text(raw.structured.hpi?.duration_ar || 'غير محدد', 200),
          associated_en: Array.isArray(raw.structured.hpi?.associated_en)
            ? raw.structured.hpi.associated_en.slice(0, 12).map((x) => text(x, 120))
            : [],
          associated_ar: Array.isArray(raw.structured.hpi?.associated_ar)
            ? raw.structured.hpi.associated_ar.slice(0, 12).map((x) => text(x, 120))
            : [],
          negatives_en: Array.isArray(raw.structured.hpi?.negatives_en)
            ? raw.structured.hpi.negatives_en.slice(0, 12).map((x) => text(x, 120))
            : [],
          negatives_ar: Array.isArray(raw.structured.hpi?.negatives_ar)
            ? raw.structured.hpi.negatives_ar.slice(0, 12).map((x) => text(x, 120))
            : []
        },
        extracted_allergies: text(raw.structured.extracted_allergies, 400),
        extracted_medications: text(raw.structured.extracted_medications, 400),
        extracted_history: text(raw.structured.extracted_history, 600),
        followups: fallbackFollowups,
        ai_urgency: ['immediate', 'priority', 'standard', 'unclassified'].includes(
          raw.structured.ai_urgency
        )
          ? raw.structured.ai_urgency
          : null,
        ai_rationale_en: text(raw.structured.ai_rationale_en, 600),
        ai_rationale_ar: text(raw.structured.ai_rationale_ar, 600)
      };
    } else if (p.complaint) {
      p.structured = localStructure(p.complaint, p);
    }

    if (
      raw.review &&
      ['immediate', 'priority', 'standard', 'unclassified'].includes(raw.review.urgency)
    ) {
      p.review = {
        urgency: raw.review.urgency,
        comment: text(raw.review.comment, 1500),
        confirmed: raw.review.confirmed === true,
        reviewer: text(raw.review.reviewer || 'Demo Clinician', 80),
        at: isFinite(Date.parse(raw.review.at))
          ? new Date(raw.review.at).toISOString()
          : p.createdAt
      };
    }
    return p;
  }

  function validate(raw) {
    const e = [];
    if (!text(raw.name, 100)) e.push('name');
    if (!/^[12][0-9]{9}$/.test(digits(raw.nid))) e.push('nid');
    if (
      raw.age === '' ||
      !Number.isInteger(Number(digits(raw.age))) ||
      Number(digits(raw.age)) < 0 ||
      Number(digits(raw.age)) > 120
    )
      e.push('age');
    if (!text(raw.complaint)) e.push('complaint');
    for (const [k, [min, max]] of Object.entries(limits)) {
      const v = raw.vitals?.[k];
      if (
        v !== '' &&
        v !== undefined &&
        v !== null &&
        (!Number.isFinite(Number(digits(v))) || Number(digits(v)) < min || Number(digits(v)) > max)
      )
        e.push(k);
    }
    if (
      Boolean(raw.vitals?.sbp !== '' && raw.vitals?.sbp != null) !==
      Boolean(raw.vitals?.dbp !== '' && raw.vitals?.dbp != null)
    )
      e.push('bp');
    if (Number(raw.vitals?.dbp) >= Number(raw.vitals?.sbp) && raw.vitals?.sbp) e.push('bp');
    return [...new Set(e)];
  }

  function news2(p) {
    // Royal College of Physicians National Early Warning Score 2 (NEWS2) on available vitals
    const v = { ...(p.vitals || {}), ...(p.measuredVitals || {}) };
    let score = 0;
    let singleRed = false;
    const partsEn = [];
    const partsAr = [];

    function add(pts, labelEn, labelAr) {
      score += pts;
      if (pts === 3) singleRed = true;
      if (pts > 0) {
        partsEn.push(`${labelEn} (+${pts})`);
        partsAr.push(`${labelAr} (+${pts})`);
      }
    }

    if (v.rr != null) {
      const rr = Number(v.rr);
      if (rr <= 8 || rr >= 25) add(3, `RR ${rr}`, `التنفس ${rr}`);
      else if (rr >= 21 && rr <= 24) add(2, `RR ${rr}`, `التنفس ${rr}`);
      else if (rr >= 9 && rr <= 11) add(1, `RR ${rr}`, `التنفس ${rr}`);
    }
    if (v.spo2 != null) {
      const sp = Number(v.spo2);
      if (sp <= 91) add(3, `SpO₂ ${sp}%`, `الأكسجين ${sp}%`);
      else if (sp >= 92 && sp <= 93) add(2, `SpO₂ ${sp}%`, `الأكسجين ${sp}%`);
      else if (sp >= 94 && sp <= 95) add(1, `SpO₂ ${sp}%`, `الأكسجين ${sp}%`);
    }
    if (v.sbp != null) {
      const sbp = Number(v.sbp);
      if (sbp <= 90 || sbp >= 220) add(3, `SBP ${sbp}`, `الضغط ${sbp}`);
      else if (sbp >= 91 && sbp <= 100) add(2, `SBP ${sbp}`, `الضغط ${sbp}`);
      else if (sbp >= 101 && sbp <= 110) add(1, `SBP ${sbp}`, `الضغط ${sbp}`);
    }
    if (v.hr != null) {
      const hr = Number(v.hr);
      if (hr <= 40 || hr >= 131) add(3, `HR ${hr}`, `النبض ${hr}`);
      else if (hr >= 111 && hr <= 130) add(2, `HR ${hr}`, `النبض ${hr}`);
      else if ((hr >= 41 && hr <= 50) || (hr >= 91 && hr <= 110)) add(1, `HR ${hr}`, `النبض ${hr}`);
    }
    if (v.temp != null) {
      const t = Number(v.temp);
      if (t <= 35.0) add(3, `Temp ${t}°C`, `الحرارة ${t}`);
      else if (t >= 39.1) add(2, `Temp ${t}°C`, `الحرارة ${t}`);
      else if ((t >= 35.1 && t <= 36.0) || (t >= 38.1 && t <= 39.0)) add(1, `Temp ${t}°C`, `الحرارة ${t}`);
    }

    const assessedCount = ['rr', 'spo2', 'sbp', 'hr', 'temp'].filter((k) => v[k] != null).length;
    const risk =
      score >= 7
        ? 'high'
        : score >= 5 || singleRed
        ? 'medium'
        : assessedCount > 0
        ? 'low'
        : 'unassessed';

    return {
      score,
      assessedCount,
      singleRed,
      risk,
      breakdownEn: partsEn.length ? partsEn.join(' · ') : assessedCount ? 'All entered vitals within normal NEWS2 range (0)' : 'No vitals entered yet',
      breakdownAr: partsAr.length ? partsAr.join(' · ') : assessedCount ? 'جميع العلامات المدخلة في النطاق الطبيعي (٠)' : 'لم تُدخل علامات حيوية بعد'
    };
  }

  function clinicalInsights(p) {
    // Preliminary ICD-10-AM Symptom Codes (Saudi NPHIES standard) & Drug/Allergy Safety Alerts
    const raw = stripNegations(clinicalText(p.complaint));
    const negChest =
      /\b(?:no|denies|without)\s+(?:chest\s+(?:pain|pressure))\b/i.test(raw) ||
      /(?:لا اعاني من|لا يوجد|بدون)\s+(?:الم في الصدر|وجع في الصدر)/.test(raw);
    const negSob =
      /\b(?:no|denies|without)\s+(?:shortness of breath|difficulty breathing)\b/i.test(raw) ||
      /(?:لا اعاني من|لا يوجد|بدون)\s+(?:ضيق في التنفس|صعوبه في التنفس|كتمه)/.test(raw);

    const codes = [];
    if (!negChest && (/chest\s*(?:pain|pressure)/i.test(raw) || /الم.{0,16}صدر|ضغط.{0,16}صدر/.test(raw))) {
      codes.push({ code: 'R07.9', displayEn: 'Chest pain, unspecified', displayAr: 'ألم في الصدر غير محدد' });
    }
    if (!negSob && (/shortness of breath|difficulty breathing|dyspnea/i.test(raw) || /ضيق.{0,12}تنفس|صعوبه.{0,12}تنفس|كتمه/.test(raw))) {
      codes.push({ code: 'R06.02', displayEn: 'Shortness of breath / Dyspnea', displayAr: 'ضيق في التنفس' });
    }
    if (/wheez|asthma|ربو|صفير/.test(raw)) {
      codes.push({ code: 'J45.901', displayEn: 'Acute bronchospasm / Wheezing', displayAr: 'تضيق قصبي حاد / صفير صدري' });
    }
    if (/fever|حمى|حراره/.test(raw)) {
      codes.push({ code: 'R50.9', displayEn: 'Fever, unspecified', displayAr: 'حمى غير محددة' });
    }
    if (/vomit|nausea|قيء|غثيان|استفراغ/.test(raw)) {
      codes.push({ code: 'R11.2', displayEn: 'Nausea with vomiting', displayAr: 'غثيان مصحوب بقيء' });
    }
    if (/abdominal|stomach|بطن|معده/.test(raw)) {
      codes.push({ code: 'R10.9', displayEn: 'Abdominal pain, unspecified', displayAr: 'ألم بطني غير محدد' });
    }
    if (/headache|dizz|صداع|دوخه/.test(raw)) {
      codes.push({ code: 'R51 / R42', displayEn: 'Headache / Dizziness', displayAr: 'صداع / دوار' });
    }
    if (/ankle|sprain|كاحل|التواء/.test(raw)) {
      codes.push({ code: 'S93.40', displayEn: 'Sprain of ankle', displayAr: 'التواء الكاحل' });
    }
    if (codes.length === 0) {
      codes.push({ code: 'R69', displayEn: 'General emergency presentation', displayAr: 'شكوى طوارئ عامة للمراجعة' });
    }

    const alerts = [];
    const al = text(p.allergies || p.structured?.extracted_allergies || '').toLowerCase();
    if (al && !/not provided|غير مذكور|nkda|no known|لا توجد/.test(al)) {
      alerts.push({
        type: 'allergy',
        en: `⚠️ Allergy Alert: ${p.allergies || p.structured?.extracted_allergies}`,
        ar: `⚠️ تنبيه حساسية دوائية: ${p.allergies || p.structured?.extracted_allergies}`
      });
    }
    const meds = text(p.medications || p.structured?.extracted_medications || '').toLowerCase();
    if (/aspirin|warfarin|apixaban|clopidogrel|اسبرين|وارفارين|مسيل/.test(meds)) {
      alerts.push({
        type: 'med',
        en: '💊 Antiplatelet / Anticoagulant use noted (Aspirin/Blood thinner)',
        ar: '💊 يستخدم مسيلات الدم / الأسبرين (يرجى الانتباه لخطر النزيف أو البروتوكول القلبي)'
      });
    }
    return { codes, alerts };
  }

  function surgeWave() {
    // 5 realistic Jeddah / Umrah mass-gathering ED surge arrivals for Track 1 stress testing
    return [
      normalize({
        name: 'SURGE · Pilgrim Mansour (Haramain Train Arrival)',
        nid: '2000008814',
        age: 68,
        sex: 'male',
        complaint: 'أعاني من ألم شديد في منتصف الصدر مع تعرق غزير وضيق في التنفس منذ ٣٠ دقيقة بعد الوصول لجدة. لدي ضغط وسكري وحساسية من البنسلين.',
        allergies: 'Penicillin (بنسلين)',
        medications: 'Aspirin 81mg, Amlodipine 5mg',
        history: 'HTN, Type 2 DM',
        vitals: { hr: 126, sbp: 88, dbp: 58, spo2: 90, temp: 37.0, rr: 26, pain: 9 },
        doorToIntakeSec: 34,
        source: 'scenario'
      }),
      normalize({
        name: 'SURGE · Patient Layan (Jeddah Corniche)',
        nid: '1000006631',
        age: 24,
        sex: 'female',
        complaint: 'حمى شديدة مع صداع ودوخة وإرهاق عام منذ أمس بسبب الإجهاد الحراري، مع غثيان بدون ألم في الصدر.',
        allergies: 'لا توجد حساسية معروفة (NKDA)',
        medications: 'Paracetamol',
        history: 'None',
        vitals: { hr: 112, sbp: 114, dbp: 72, spo2: 98, temp: 39.2, rr: 20, pain: 6 },
        doorToIntakeSec: 39,
        source: 'scenario'
      }),
      normalize({
        name: 'SURGE · Visitor Tariq (King Abdulaziz Airport)',
        nid: '2000003391',
        age: 51,
        sex: 'male',
        complaint: 'Severe shortness of breath and wheezing for 1 hour after dust exposure, history of asthma, denies chest pain.',
        allergies: 'Sulfa drugs',
        medications: 'Salbutamol inhaler',
        history: 'Bronchial Asthma',
        vitals: { hr: 122, sbp: 142, dbp: 88, spo2: 91, temp: 37.1, rr: 27, pain: 5 },
        doorToIntakeSec: 36,
        source: 'scenario'
      }),
      normalize({
        name: 'SURGE · Patient Nawaf (Al-Hamra District)',
        nid: '1000005109',
        age: 35,
        sex: 'male',
        complaint: 'ألم شديد في البطن مع قيء متكرر منذ ٤ ساعات، لا أعاني من ألم في الصدر أو ضيق في التنفس.',
        allergies: 'NKDA',
        medications: 'None',
        history: 'Gastritis',
        vitals: { hr: 102, sbp: 118, dbp: 76, spo2: 99, temp: 38.2, rr: 18, pain: 7 },
        doorToIntakeSec: 44,
        source: 'scenario'
      }),
      normalize({
        name: 'SURGE · Patient Sara (KAU Campus)',
        nid: '1000002944',
        age: 21,
        sex: 'female',
        complaint: 'التواء بسيط في الرسغ الأيمن بعد سقوط خفيف، تورم بسيط، لا يوجد نزيف أو فقدان وعي أو ألم في الصدر.',
        allergies: 'NKDA',
        medications: 'None',
        history: 'Healthy',
        vitals: { hr: 80, sbp: 116, dbp: 74, spo2: 99, temp: 36.8, rr: 15, pain: 3 },
        doorToIntakeSec: 31,
        source: 'scenario'
      })
    ];
  }

  function flag(p) {
    let s = clinicalText(p.complaint);
    const terms = [
      /chest\s+(?:pain|pressure|tightness)|pain\s+in\s+(?:my|the)\s+chest|chest\s+hurts/i,
      /shortness of breath|difficulty breathing|trouble breathing|hard to breathe|struggling to breathe|cannot breathe|can't breathe|severe wheez/i,
      /heavy bleeding|severe bleeding|unconscious|passed out|stroke|facial droop|slurred speech/i,
      /الم.{0,16}صدر|ضغط.{0,16}صدر|وجع.{0,16}صدر|وجع\s+(?:في\s+)?قلب|الم\s+(?:في\s+)?(?:ال)?قلب|صدري\s+يوجعني|ضيق.{0,12}تنفس|صعوبه.{0,12}تنفس|ما اقدر اتنفس|كتمه شديده|نزيف شديد|فقدان الوعي|سكته|تدلي الوجه/
    ];
    s = stripNegations(s);
    const red = terms.some((r) => r.test(s));
    const v = { ...(p.vitals || {}), ...(p.measuredVitals || {}) };
    const n2 = news2(p);
    const abnormal =
      (v.spo2 != null && v.spo2 < 92) ||
      (v.sbp != null && v.sbp < 90) ||
      (v.hr != null && (v.hr < 50 || v.hr > 130)) ||
      (v.rr != null && (v.rr < 8 || v.rr > 30)) ||
      (v.temp != null && v.temp >= 40) ||
      (v.pain != null && v.pain >= 9 && red) ||
      n2.score >= 7 ||
      n2.singleRed;

    if (red || abnormal) return { level: 'immediate', reason: red ? 'complaint' : 'vitals' };

    let deterministicLevel = 'unclassified';
    if (
      /fever|vomit|abdominal pain|pain|dizz|headache|حمى|حراره|قيء|الم|دوخه|صداع/.test(s) ||
      (v.temp != null && v.temp >= 38.5) ||
      (v.pain != null && v.pain >= 7) ||
      n2.score >= 5
    ) {
      deterministicLevel = 'priority';
    } else if (/ankle|sprain|minor|cough|cold|كاحل|التواء|زكام/.test(s)) {
      deterministicLevel = 'standard';
    }

    const rank = { immediate: 3, priority: 2, standard: 1, unclassified: 0 };
    const aiLevel = p.structured?.ai_urgency;
    if (aiLevel && rank[aiLevel] > rank[deterministicLevel]) {
      return { level: aiLevel, reason: 'ai-clinical' };
    }
    return {
      level: deterministicLevel,
      reason: deterministicLevel === 'unclassified' ? 'unknown' : 'complaint'
    };
  }

  function routingTicket(p, queue = []) {
    const level = p.review?.urgency || flag(p).level;
    const numSeed = parseInt((p.nid || '104').slice(-3), 10) || 104;
    const sameTierPending = queue.filter(
      (item) => !item.review?.confirmed && flag(item).level === level && item.id !== p.id
    ).length;

    if (level === 'immediate') {
      const num = String(100 + (numSeed % 89));
      const code = 'E-' + num;
      return {
        code,
        level,
        color: 'red',
        zoneEn: 'Zone A · Immediate Triage & Resuscitation Bay 1',
        zoneAr: 'المنطقة أ · مسار الفرز الفوري والإنعاش (غرفة ١)',
        waitEn: '0 min · Immediate Nurse Escort',
        waitAr: '٠ دقيقة · مرافقة فورية لطاقم الطوارئ',
        speechEn: `Emergency Ticket E ${num}. Immediate clinical triage required. Please proceed directly to Zone A, Resuscitation and Immediate Triage, or alert medical staff now.`,
        speechAr: `تذكرة طوارئ، الرمز إي ${num}. الحالة حرجة وتتطلب تدخلاً عاجلاً. يرجى التوجه فوراً إلى المنطقة أ، مسار الفرز الفوري والإنعاش، أو إبلاغ الطاقم الطبي الآن.`
      };
    }
    if (level === 'priority' || level === 'unclassified') {
      const num = String(200 + (numSeed % 89));
      const code = 'P-' + num;
      const estMins = Math.max(6, (sameTierPending + 1) * 7);
      return {
        code,
        level,
        color: 'amber',
        zoneEn: 'Zone B · Acute Priority Assessment Bay',
        zoneAr: 'المنطقة ب · مسار التقييم العاجل ذو الأولوية',
        waitEn: `Queue #${sameTierPending + 1} · Est. ~${estMins} mins`,
        waitAr: `الترتيب #${sameTierPending + 1} · الانتظار التقريبي ~${estMins} دقيقة`,
        speechEn: `Priority Ticket P ${num}. Please proceed to Zone B, Acute Priority Assessment waiting area. Your estimated wait time is approximately ${estMins} minutes.`,
        speechAr: `تذكرة أولوية، الرمز بي ${num}. يرجى التوجه إلى استراحة المنطقة ب، مسار التقييم العاجل. وقت الانتظار التقريبي ${estMins} دقيقة.`
      };
    }
    const num = String(300 + (numSeed % 89));
    const code = 'S-' + num;
    const estMins = Math.max(12, (sameTierPending + 1) * 11);
    return {
      code,
      level,
      color: 'green',
      zoneEn: 'Zone C · Fast-Track Minor Care Clinic',
      zoneAr: 'المنطقة ج · عيادة المسار السريع للحالات الاعتيادية',
      waitEn: `Queue #${sameTierPending + 1} · Est. ~${estMins} mins`,
      waitAr: `الترتيب #${sameTierPending + 1} · الانتظار التقريبي ~${estMins} دقيقة`,
      speechEn: `Fast Track Ticket S ${num}. Stable condition. Please proceed to Zone C, Fast-Track Clinic lounge. Your estimated wait time is approximately ${estMins} minutes.`,
      speechAr: `تذكرة المسار السريع، الرمز إس ${num}. حالتك مستقرة. يرجى التوجه إلى عيادة المسار السريع في المنطقة ج. وقت الانتظار التقريبي ${estMins} دقيقة.`
    };
  }

  function qrSvg(seedStr) {
    // Generates a crisp 15x15 QR-style SVG matrix with standard finder patterns for the patient boarding ticket
    const size = 15;
    let hash = 2166136261;
    const str = String(seedStr || 'MEDFLOW');
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    function isFinder(r, c) {
      const inTL = r < 5 && c < 5;
      const inTR = r < 5 && c >= size - 5;
      const inBL = r >= size - 5 && c < 5;
      if (!inTL && !inTR && !inBL) return null;
      const lr = r >= size - 5 ? r - (size - 5) : r;
      const lc = c >= size - 5 ? c - (size - 5) : c;
      if (lr === 0 || lr === 4 || lc === 0 || lc === 4) return true;
      if (lr === 2 && lc === 2) return true;
      return false;
    }
    let rects = '';
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const f = isFinder(r, c);
        let on = false;
        if (f !== null) {
          on = f;
        } else {
          hash ^= (r * 31 + c * 17) & 0xff;
          hash = Math.imul(hash, 16777619);
          on = (Math.abs(hash) + r + c) % 2 === 0;
        }
        if (on) {
          rects += `<rect x="${c + 1}" y="${r + 1}" width="1" height="1" fill="#020617"/>`;
        }
      }
    }
    return `<svg viewBox="0 0 ${size + 2} ${size + 2}" width="84" height="84" style="background:#f8fafc;border-radius:8px;padding:3px;flex:none" aria-label="Ticket QR Code" role="img">${rects}</svg>`;
  }

  function soap(p, lang = 'en') {
    const ar = lang === 'ar';
    const unknown = ar ? 'غير مذكور' : 'Not provided';
    const entered = Object.entries(p.vitals || {})
      .map(([k, v]) => `${vitalSpec[k][ar ? 1 : 0]}: ${v} ${vitalSpec[k][3]}`)
      .join(' · ');
    const measured = Object.entries(p.measuredVitals || {})
      .map(([k, v]) => `${vitalSpec[k][ar ? 1 : 0]}: ${v} ${vitalSpec[k][3]}`)
      .join(' · ');

    const st = p.structured || localStructure(p.complaint, p);
    const translatedLine = st
      ? ar
        ? st.complaint_ar && st.complaint_ar !== p.complaint
          ? `\n• الملخص السريري المهيكل (عربي): ${st.complaint_ar}`
          : ''
        : st.complaint_en && st.complaint_en !== p.complaint
        ? `\n• Bilingual Clinical Handover (EN): ${st.complaint_en}`
        : ''
      : '';

    const hpiExtras = [];
    if (st?.hpi) {
      const assoc = ar ? st.hpi.associated_ar : st.hpi.associated_en;
      const negs = ar ? st.hpi.negatives_ar : st.hpi.negatives_en;
      const dur = ar ? st.hpi.duration_ar : st.hpi.duration_en;
      if (dur && dur !== 'Not specified' && dur !== 'غير محدد') {
        hpiExtras.push(`${ar ? 'المدة' : 'Onset/Duration'}: ${dur}`);
      }
      if (assoc && assoc.length) {
        hpiExtras.push(
          `${ar ? 'الأعراض الإيجابية' : 'Pertinent Positives'}: ${assoc.join(ar ? '، ' : ', ')}`
        );
      }
      if (Array.isArray(negs) && negs.length > 0) {
        hpiExtras.push(
          `${ar ? 'الأعراض المنفية' : 'Pertinent Negatives'}: ${negs.join(ar ? '، ' : ', ')}`
        );
      }
    }

    const f = flag(p);
    const n2 = news2(p);
    const insights = clinicalInsights(p);
    const ticket = routingTicket(p);
    const aiRationale = st ? (ar ? st.ai_rationale_ar : st.ai_rationale_en) : '';
    const icdLine = insights.codes
      .map((c) => `${c.code} (${ar ? c.displayAr : c.displayEn})`)
      .join(' · ');

    return {
      s:
        `${ar ? 'إفادة المريض النصية: ' : 'Verbatim patient statement: '}"${p.complaint}"` +
        translatedLine +
        (hpiExtras.length ? `\n• ${hpiExtras.join(' | ')}` : '') +
        `\n• ${ar ? 'العمر' : 'Age'}: ${p.age} | ${ar ? 'الحساسية' : 'Allergies'}: ${
          p.allergies || unknown
        } | ${ar ? 'الأدوية' : 'Medications'}: ${p.medications || unknown} | ${
          ar ? 'التاريخ المرضي' : 'History'
        }: ${p.history || unknown}` +
        (entered
          ? '\n• ' +
            (ar
              ? 'قيم أدخلها المريض ولم يتحقق منها الطبيب: '
              : 'Patient-entered values, unverified: ') +
            entered
          : ''),
      o:
        (measured
          ? (ar
              ? 'قياسات أكدها الطبيب التجريبي: '
              : 'Measurements confirmed by demo clinician: ') + measured
          : ar
          ? 'لم يُقيّم بعد. بانتظار قياس العلامات الحيوية من الطاقم السريري.'
          : 'Not yet assessed. Pending clinician measurement of vital signs.') +
        `\n• NEWS2 Score: ${n2.score} (${n2.risk.toUpperCase()}) — ${
          ar ? n2.breakdownAr : n2.breakdownEn
        }`,
      a:
        (f.level === 'immediate'
          ? ar
            ? 'عرض يحتمل وجود علامة إنذار حرجة. يلزم تقييم سريري فوري. لا يوجد تشخيص آلي.'
            : 'Potential red-flag presentation. Immediate clinical assessment required. No automated diagnosis.'
          : ar
          ? 'الشكوى تتطلب تقييم الطبيب. لا يوجد تشخيص آلي.'
          : 'Complaint requires clinician assessment. No automated diagnosis.') +
        (aiRationale
          ? `\n(${ar ? 'تحليل المساعد الذكي: ' : 'AI Intake Triage Note: '}${aiRationale})`
          : '') +
        `\n• ${ar ? 'ترميز الأعراض الأولي (ICD-10-AM / نفيس)' : 'Preliminary NPHIES / ICD-10-AM Symptom Codes'}: ${icdLine}`,
      p:
        (f.level === 'immediate'
          ? ar
            ? 'إبلاغ ممرض الفرز أو طبيب الطوارئ فوراً وفق البروتوكول المحلي (مسار الطوارئ الحرجة). لا تنتظر هذا الكشك.'
            : 'Escalate immediately to the emergency clinician or triage nurse according to local protocol (Fast-Track Resuscitation/Triage). Do not wait for this kiosk.'
          : ar
          ? 'التقييم بواسطة ممرض الفرز أو الطبيب وفق البروتوكول المحلي.'
          : 'Assessment by a triage nurse or clinician according to local protocol.') +
        `\n• ${ar ? 'توجيه المسار وتذكرة الانتظار' : 'Assigned ED Routing'}: [${ticket.code}] ${
          ar ? ticket.zoneAr : ticket.zoneEn
        }`
    };
  }

  function seed() {
    return [
      normalize({
        name: 'DEMO · Pilgrim Al-Harbi',
        nid: '2000005519',
        age: 62,
        sex: 'female',
        complaint:
          'عندي كتمة شديدة في النفس وصفير في الصدر منذ ساعتين بعد انتهاء بخاخ الفينتولين. لا يوجد ألم في الصدر.',
        allergies: 'لا توجد حساسية معروفة (NKDA)',
        medications: 'بخاخ فينتولين (Salbutamol)',
        history: 'ربو شعبي مزمن (Bronchial Asthma)',
        vitals: { hr: 118, sbp: 136, dbp: 84, spo2: 90, temp: 36.9, rr: 28, pain: 4 },
        doorToIntakeSec: 38,
        source: 'scenario'
      }),
      normalize({
        name: 'DEMO · Patient Cedar',
        nid: '1000004412',
        age: 29,
        sex: 'male',
        complaint: 'Fever and body aches for two days with mild abdominal pain after meals',
        allergies: 'Not provided',
        medications: 'Paracetamol 500mg',
        history: 'None',
        vitals: { temp: 39.1, hr: 98, spo2: 98, pain: 6 },
        doorToIntakeSec: 49,
        source: 'scenario'
      }),
      normalize({
        name: 'DEMO · Patient Olive',
        nid: '2000001287',
        age: 26,
        sex: 'male',
        complaint:
          'Minor right ankle sprain after football in North Obhur, mild swelling, no chest pain',
        allergies: 'NKDA',
        vitals: { hr: 78, sbp: 122, dbp: 78, spo2: 99, temp: 36.7, pain: 3 },
        doorToIntakeSec: 35,
        source: 'scenario'
      })
    ];
  }

  const escapeXML = (s) =>
    text(s, 20000)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  function fhir(p) {
    const now = new Date().toISOString(),
      sid = uid(),
      pid = uid(),
      eid = uid(),
      aid = uid();
    const ref = (id) => 'urn:uuid:' + id;
    const meta = {
      profile: ['http://nphies.sa/fhir/ksa/nphies-fs/StructureDefinition/bundle|1.0.0'],
      tag: [
        {
          system: 'https://medflow.example.org/tags',
          code: 'synthetic-demo',
          display: 'DEMO ONLY — SYHF MEDATHON Jeddah Prototype — not for clinical use'
        }
      ]
    };
    const patient = {
      resourceType: 'Patient',
      id: pid,
      meta,
      identifier: [{ system: 'https://medflow.example.org/synthetic-id', value: p.nid }],
      name: [{ text: p.name }],
      gender: p.sex,
      extension: [
        {
          url: 'https://medflow.example.org/StructureDefinition/age-at-intake',
          valueAge: { value: p.age, unit: 'years', system: 'http://unitsofmeasure.org', code: 'a' }
        }
      ]
    };
    const practitioner = {
      resourceType: 'Practitioner',
      id: aid,
      meta,
      name: [{ text: p.review?.reviewer || 'Demo Clinician' }]
    };
    const ticket = routingTicket(p);
    const insights = clinicalInsights(p);
    const encounter = {
      resourceType: 'Encounter',
      id: eid,
      meta,
      status: 'in-progress',
      class: {
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        code: 'EMER',
        display: 'emergency'
      },
      priority: {
        coding: [
          {
            system: 'https://medflow.example.org/triage-urgency',
            code: p.review?.urgency || flag(p).level
          }
        ]
      },
      reasonCode: insights.codes.map((c) => ({
        coding: [
          {
            system: 'http://hl7.org/fhir/sid/icd-10-am',
            code: c.code,
            display: c.displayEn
          }
        ],
        text: `${c.displayEn} / ${c.displayAr}`
      })),
      location: [
        {
          location: {
            display: `${ticket.code} · ${ticket.zoneEn}`
          }
        }
      ],
      subject: { reference: ref(pid) },
      period: { start: p.createdAt }
    };
    const observations = [];
    const available = { ...p.vitals, ...p.measuredVitals };
    function obs(k, value) {
      const id = uid(),
        measured = Object.hasOwnProperty.call(p.measuredVitals, k);
      const spec = vitalSpec[k];
      const o = {
        resourceType: 'Observation',
        id,
        meta,
        status: measured ? 'final' : 'preliminary',
        code: { coding: [{ system: 'http://loinc.org', code: spec[2], display: spec[0] }] },
        subject: { reference: ref(pid) },
        encounter: { reference: ref(eid) },
        effectiveDateTime: measured ? p.review?.at || now : p.createdAt,
        method: {
          text: measured
            ? 'Confirmed measured by demo clinician'
            : 'Patient-entered value — unverified'
        },
        valueQuantity: {
          value,
          unit: spec[3],
          system: 'http://unitsofmeasure.org',
          code: spec[3]
        }
      };
      observations.push(o);
    }
    Object.entries(available).forEach(([k, v]) => {
      if (k !== 'sbp' && k !== 'dbp') obs(k, v);
    });
    if (available.sbp != null && available.dbp != null) {
      const id = uid(),
        measured = p.measuredVitals.sbp != null && p.measuredVitals.dbp != null;
      observations.push({
        resourceType: 'Observation',
        id,
        meta,
        status: measured ? 'final' : 'preliminary',
        code: {
          coding: [{ system: 'http://loinc.org', code: '85354-9', display: 'Blood pressure panel' }]
        },
        subject: { reference: ref(pid) },
        encounter: { reference: ref(eid) },
        effectiveDateTime: measured ? p.review?.at || now : p.createdAt,
        method: {
          text: measured
            ? 'Confirmed measured by demo clinician'
            : 'Patient-entered value — unverified'
        },
        component: ['sbp', 'dbp'].map((k) => ({
          code: {
            coding: [{ system: 'http://loinc.org', code: vitalSpec[k][2], display: vitalSpec[k][0] }]
          },
          valueQuantity: {
            value: available[k],
            unit: 'mmHg',
            system: 'http://unitsofmeasure.org',
            code: 'mm[Hg]'
          }
        }))
      });
    }
    const note = soap(p);
    const noteAR = soap(p, 'ar');
    const sections = [
      ['Patient-reported information & AI Bilingual Handover', note.s, noteAR.s],
      ['Objective — provenance retained', note.o, noteAR.o],
      ['System suggestion — not a diagnosis', note.a, noteAR.a],
      ['Human assessment plan & ED Zone Routing', note.p, noteAR.p],
      [
        'Clinician review',
        p.review
          ? `${p.review.reviewer} · ${p.review.urgency} · ${p.review.comment || 'No comment'} · ${p.review.at}`
          : 'Not yet reviewed',
        ''
      ]
    ].map(([title, en, ar]) => ({
      title,
      text: {
        status: 'generated',
        div:
          '<div xmlns="http://www.w3.org/1999/xhtml"><p>' +
          escapeXML(en) +
          '</p>' +
          (ar ? '<p dir="rtl">' + escapeXML(ar) + '</p>' : '') +
          '</div>'
      }
    }));
    if (observations.length)
      sections.push({
        title: 'Available values — check method and status',
        entry: observations.map((o) => ({ reference: ref(o.id) }))
      });
    const comp = {
      resourceType: 'Composition',
      id: sid,
      meta,
      status: p.review?.confirmed ? 'final' : 'preliminary',
      type: {
        coding: [{ system: 'http://loinc.org', code: '34117-2', display: 'History and physical note' }]
      },
      subject: { reference: ref(pid) },
      encounter: { reference: ref(eid) },
      date: now,
      author: [{ reference: ref(aid) }],
      title: 'MedFlow synthetic intake — DEMO ONLY — not transmitted to a hospital',
      section: sections
    };
    if (p.review?.confirmed)
      comp.attester = [{ mode: 'professional', time: p.review.at, party: { reference: ref(aid) } }];
    return {
      resourceType: 'Bundle',
      id: uid(),
      meta,
      identifier: { system: 'https://medflow.example.org/demo-documents', value: uid() },
      type: 'document',
      timestamp: now,
      entry: [comp, patient, practitioner, encounter, ...observations].map((resource) => ({
        fullUrl: ref(resource.id),
        resource
      }))
    };
  }

  const exported = {
    ARABIC_STATEMENT,
    SCENARIOS,
    QUICK_SYMPTOMS,
    limits,
    vitalSpec,
    text,
    digits,
    uid,
    localStructure,
    normalize,
    validate,
    news2,
    clinicalInsights,
    surgeWave,
    flag,
    routingTicket,
    qrSvg,
    soap,
    seed,
    fhir,
    escapeXML
  };

  root.MedFlow = exported;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exported;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
