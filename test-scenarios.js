/* MedFlow AI — Prototype Testing & Validation
 * Synthetic scenario definitions (30 reproducible fictional cases).
 * NO real patient data, NO clinical ground truth. All complaints are fictional.
 * Every scenario is executed against the actual MedFlow prototype functions
 * (medflow-core.js) by test-runner.js — never against a separate rule engine.
 *
 * Documented requirements are derived from the prototype's own disclosed,
 * in-source rule set ("Small, disclosed demonstration rules. They are deliberately
 * not ESI.") and its own code comment: "A negated phrase alone is not a positive
 * symptom." They are SOFTWARE requirements, not clinical requirements.
 */
(function (root) {
  'use strict';

  const VERSION = '1.0.0';

  const REQUIREMENTS = {
    'REQ-FLAG-01': 'A complaint matching one of the prototype\'s disclosed red-flag phrases (English or Arabic) must produce urgency level "immediate" with reason "complaint".',
    'REQ-FLAG-02': 'A complaint with no red-flag phrase but containing the prototype\'s priority terms (fever, vomit, abdominal pain, generic "pain" / حمى / حراره / قيء / الم) must produce urgency level "priority".',
    'REQ-FLAG-03': 'A complaint matching the prototype\'s minor-injury terms (ankle, sprain, minor / كاحل / التواء) must produce urgency level "standard".',
    'REQ-FLAG-04': 'Complaint text not recognized by any rule must fall back to urgency level "unclassified" (reason "unknown"), which requires clinician assessment. This is the documented fallback, not a clinical classification.',
    'REQ-NEG-01': 'Negation: per the source-code intent ("A negated phrase alone is not a positive symptom"), a negated red-flag phrasing must NOT produce urgency level "immediate". Covered negators in code: no / denies / without (English) and لا اعاني من / لا يوجد / بدون (Arabic).',
    'REQ-VITAL-01': 'Abnormal vital values must produce urgency level "immediate" with reason "vitals". Disclosed thresholds: SpO2 < 92, systolic BP < 90, heart rate < 50 or > 130, respiratory rate < 8 or > 30, temperature >= 40.',
    'REQ-VITAL-02': 'Boundary behavior: values exactly at a threshold must NOT trigger the flag (the comparisons are strict).',
    'REQ-VAL-01': 'Intake validation must reject: missing name, IDs not matching 10 digits starting 1 or 2, age outside 0–120, empty complaint, non-numeric or out-of-range vital values, and inverted blood pressure (diastolic >= systolic), reporting named field errors.',
    'REQ-NOTE-01': 'A structured SOAP note must be generated for every accepted intake, in both English and Arabic, preserving the patient\'s exact complaint and marking unverified values as unverified.',
    'REQ-FHIR-01': 'FHIR export must generate a valid document Bundle containing Composition (first entry), Patient, Practitioner, Encounter, and an Observation for each available vital value.'
  };

  const d = (s) => String(s);

  const SCENARIOS = [
    /* ---------------------------------------------------------------
     * GROUP A — English symptom statements (6)
     * --------------------------------------------------------------- */
    {
      id: 'A1', group: 'A',
      language: 'English',
      category: 'Red-flag recognition — explicit phrase',
      patient: { name: 'TEST · Scenario A1', nid: '1000000011', age: 58 },
      complaint: 'I have severe chest pain and pain in my left arm.',
      vitals: { spo2: 97, hr: 96 },
      requirement: 'REQ-FLAG-01 + REQ-NOTE-01 + REQ-FHIR-01: explicit "chest pain" statement must produce urgency level "immediate" (reason "complaint"), a bilingual SOAP note, and a FHIR document Bundle.',
      checks: [
        { label: 'Urgency level is "immediate"', check: (a) => a.flag.level === 'immediate' },
        { label: 'Flag reason is the complaint (not vitals)', check: (a) => a.flag.reason === 'complaint' },
        { label: 'SOAP note generated in EN and AR', check: (a) => a.soapEn.s.length > 0 && a.soapAr.s.length > 0 },
        { label: 'FHIR document Bundle with Composition first', check: (a) => a.fhir.bundleType === 'document' && a.fhir.firstResourceType === 'Composition' }
      ],
      clinicalReviewNeeded: false,
      explanation: 'Positive red-flag rule check with verified English wording. Normal vitals (SpO2 97, HR 96) are included to confirm the flag comes from the complaint, not the vitals.'
    },
    {
      id: 'A2', group: 'A',
      language: 'English',
      category: 'Red-flag recognition — alternative wording',
      patient: { name: 'TEST · Scenario A2', nid: '1000000012', age: 63 },
      complaint: 'I am having trouble breathing and feel like I might faint.',
      vitals: null,
      requirement: 'REQ-FLAG-01 (intent): alternative everyday wording for breathing difficulty ("trouble breathing") should be recognized as a red flag and produce "immediate". The app\'s own on-screen emergency banner lists "severe difficulty breathing" as an emergency.',
      checks: [
        { label: 'Urgency level is "immediate"', check: (a) => a.flag.level === 'immediate' }
      ],
      clinicalReviewNeeded: true,
      safetyConcern: 'Possible under-triage: the phrase "trouble breathing" is not in the disclosed rule list (rules cover "shortness of breath", "difficulty breathing", "cannot/can\'t breathe"), so a breathing-difficulty complaint may receive a lower urgency level.',
      explanation: 'Designed as an alternative-wording probe. The disclosed rules use exact phrases; everyday synonyms are expected to miss. This records the actual behavior and its safety implication rather than adjusting the rules.'
    },
    {
      id: 'A3', group: 'A',
      language: 'English',
      category: 'Red-flag recognition — explicit phrase',
      patient: { name: 'TEST · Scenario A3', nid: '1000000013', age: 34 },
      complaint: 'There is heavy bleeding from the wound on my leg.',
      vitals: null,
      requirement: 'REQ-FLAG-01: "heavy bleeding" must produce urgency level "immediate" (reason "complaint").',
      checks: [
        { label: 'Urgency level is "immediate"', check: (a) => a.flag.level === 'immediate' },
        { label: 'Flag reason is the complaint', check: (a) => a.flag.reason === 'complaint' }
      ],
      clinicalReviewNeeded: false,
      explanation: 'Positive red-flag rule check against the disclosed bleeding phrase.'
    },
    {
      id: 'A4', group: 'A',
      language: 'English',
      category: 'Priority-level recognition',
      patient: { name: 'TEST · Scenario A4', nid: '1000000014', age: 27 },
      complaint: 'I have fever and vomiting since yesterday.',
      vitals: null,
      requirement: 'REQ-FLAG-02: complaint with fever and vomiting must produce urgency level "priority" (reason "complaint").',
      checks: [
        { label: 'Urgency level is "priority"', check: (a) => a.flag.level === 'priority' }
      ],
      clinicalReviewNeeded: false,
      explanation: 'Priority-rule check for the disclosed fever/vomit terms.'
    },
    {
      id: 'A5', group: 'A',
      language: 'English',
      category: 'Standard-level recognition',
      patient: { name: 'TEST · Scenario A5', nid: '1000000015', age: 22 },
      complaint: 'My ankle is sprained and slightly swollen.',
      vitals: null,
      requirement: 'REQ-FLAG-03: minor injury wording must produce urgency level "standard" (reason "complaint").',
      checks: [
        { label: 'Urgency level is "standard"', check: (a) => a.flag.level === 'standard' }
      ],
      clinicalReviewNeeded: false,
      explanation: 'Standard-rule check for the disclosed minor-injury terms.'
    },
    {
      id: 'A6', group: 'A',
      language: 'English',
      category: 'Red-flag recognition — word order',
      patient: { name: 'TEST · Scenario A6', nid: '1000000016', age: 49 },
      complaint: 'Pain in my chest when I take a deep breath.',
      vitals: null,
      requirement: 'REQ-FLAG-01 (intent): chest pain phrased with the symptom before the location ("pain in my chest") is the same warning phrase as "chest pain" and should produce "immediate".',
      checks: [
        { label: 'Urgency level is "immediate"', check: (a) => a.flag.level === 'immediate' }
      ],
      clinicalReviewNeeded: true,
      safetyConcern: 'Possible under-triage: the disclosed English rule matches "chest pain/pressure" only in that word order; "pain in my chest" receives "priority" instead of "immediate".',
      explanation: 'Designed as a word-order probe for the location-after-symptom pattern. Records whether the disclosed regex handles it.'
    },

    /* ---------------------------------------------------------------
     * GROUP B — English negation and ambiguous symptoms (6)
     * --------------------------------------------------------------- */
    {
      id: 'B1', group: 'B',
      language: 'English',
      category: 'Negation — covered negator',
      patient: { name: 'TEST · Scenario B1', nid: '2000000021', age: 41 },
      complaint: 'No chest pain, but I feel dizzy and weak.',
      vitals: null,
      requirement: 'REQ-NEG-01 + REQ-FLAG-02: the negated phrase "no chest pain" must be removed before rule matching, so the statement must NOT produce "immediate". The remaining symptom ("dizzy") is a recognised priority term in the current rule set (updated from the original "unclassified" fallback).',
      checks: [
        { label: 'Urgency level is NOT "immediate"', check: (a) => a.flag.level !== 'immediate' },
        { label: 'Remaining symptom (dizziness) classified as "priority"', check: (a) => a.flag.level === 'priority' }
      ],
      clinicalReviewNeeded: true,
      explanation: 'Checks the documented negation mechanism on a covered negator. Dizziness is not in any rule list; the fallback "unclassified" requires clinician assessment, which is why expert review of this mapping is recommended.'
    },
    {
      id: 'B2', group: 'B',
      language: 'English',
      category: 'Negation — uncovered negator form',
      patient: { name: 'TEST · Scenario B2', nid: '2000000022', age: 55 },
      complaint: 'I deny chest pain.',
      vitals: null,
      requirement: 'REQ-NEG-01 (intent): denial wording ("deny/denies chest pain") expresses negation and must NOT be treated as a positive red flag.',
      checks: [
        { label: 'Urgency level is NOT "immediate"', check: (a) => a.flag.level !== 'immediate' }
      ],
      clinicalReviewNeeded: true,
      safetyConcern: 'Possible over-triage: the code only strips "denies" (third-person singular). First-person "deny" is not recognized as a negator, so a denied symptom may still trigger "immediate".',
      explanation: 'Designed as an uncovered-negator probe. The requirement states the documented negation intent, not the literal regex.'
    },
    {
      id: 'B3', group: 'B',
      language: 'English',
      category: 'Negation — covered negator',
      patient: { name: 'TEST · Scenario B3', nid: '2000000023', age: 66 },
      complaint: 'Patient denies shortness of breath at rest.',
      vitals: null,
      requirement: 'REQ-NEG-01: "denies shortness of breath" must be stripped, so the statement must NOT produce "immediate" and should fall back to "unclassified".',
      checks: [
        { label: 'Urgency level is NOT "immediate"', check: (a) => a.flag.level !== 'immediate' },
        { label: 'Falls back to "unclassified"', check: (a) => a.flag.level === 'unclassified' }
      ],
      clinicalReviewNeeded: false,
      explanation: 'Positive control for the covered third-person negator with the exact listed symptom phrase.'
    },
    {
      id: 'B4', group: 'B',
      language: 'English',
      category: 'Negation — scope across "or"',
      patient: { name: 'TEST · Scenario B4', nid: '2000000024', age: 60 },
      complaint: 'No chest pain or shortness of breath, but severe headache since this morning.',
      vitals: null,
      requirement: 'REQ-NEG-01 (intent): in "No chest pain or shortness of breath" both symptoms are negated; neither may trigger "immediate".',
      checks: [
        { label: 'Urgency level is NOT "immediate"', check: (a) => a.flag.level !== 'immediate' }
      ],
      clinicalReviewNeeded: true,
      safetyConcern: 'Possible over-triage: negation stripping is per-phrase and does not carry across "or", so the second symptom ("shortness of breath") is matched as positive and may falsely trigger "immediate".',
      explanation: 'Designed as a negation-scope probe: one negator governing two symptoms joined by "or".'
    },
    {
      id: 'B5', group: 'B',
      language: 'English',
      category: 'Negation — mixed positive and negative',
      patient: { name: 'TEST · Scenario B5', nid: '2000000025', age: 52 },
      complaint: 'I have shortness of breath but no chest pain.',
      vitals: null,
      requirement: 'REQ-NEG-01 + REQ-FLAG-01: the negated "no chest pain" must be ignored while the positive "shortness of breath" still produces "immediate".',
      checks: [
        { label: 'Urgency level is "immediate"', check: (a) => a.flag.level === 'immediate' },
        { label: 'Flag reason is the complaint', check: (a) => a.flag.reason === 'complaint' }
      ],
      clinicalReviewNeeded: false,
      explanation: 'Mixed statement: one positive symptom plus one negated symptom. The positive symptom must dominate.'
    },
    {
      id: 'B6', group: 'B',
      language: 'English',
      category: 'Negation — covered negator with priority symptom',
      patient: { name: 'TEST · Scenario B6', nid: '2000000026', age: 38 },
      complaint: 'Without difficulty breathing, I have mild fever.',
      vitals: null,
      requirement: 'REQ-NEG-01 + REQ-FLAG-02: "without difficulty breathing" must be stripped; the remaining "mild fever" must produce "priority", not "immediate".',
      checks: [
        { label: 'Urgency level is "priority"', check: (a) => a.flag.level === 'priority' },
        { label: 'Urgency level is NOT "immediate"', check: (a) => a.flag.level !== 'immediate' }
      ],
      clinicalReviewNeeded: false,
      explanation: 'Checks that stripping a covered negation does not suppress an unrelated positive priority symptom.'
    },

    /* ---------------------------------------------------------------
     * GROUP C — Modern Standard Arabic (6)
     * --------------------------------------------------------------- */
    {
      id: 'C1', group: 'C',
      language: 'Arabic — Modern Standard',
      category: 'Red-flag recognition — explicit phrase',
      patient: { name: 'TEST · Scenario C1', nid: '1000000031', age: 61 },
      complaint: 'أعاني من ألم شديد في الصدر منذ ساعة تقريباً.',
      vitals: null,
      requirement: 'REQ-FLAG-01: MSA chest pain ("ألم ... الصدر") must produce "immediate" (reason "complaint") after the prototype\'s Arabic normalization (diacritics removed, alef forms unified).',
      checks: [
        { label: 'Urgency level is "immediate"', check: (a) => a.flag.level === 'immediate' },
        { label: 'Flag reason is the complaint', check: (a) => a.flag.reason === 'complaint' },
        { label: 'Arabic SOAP note generated', check: (a) => a.soapAr.s.length > 0 && /الشكوى|ألم|عمر|الحساسية/.test(a.soapAr.s) }
      ],
      clinicalReviewNeeded: false,
      explanation: 'Positive MSA red-flag rule check.'
    },
    {
      id: 'C2', group: 'C',
      language: 'Arabic — Modern Standard',
      category: 'Red-flag recognition — breathing phrase',
      patient: { name: 'TEST · Scenario C2', nid: '1000000032', age: 57 },
      complaint: 'أعاني من ضيق شديد في التنفس.',
      vitals: null,
      requirement: 'REQ-FLAG-01: MSA breathing difficulty ("ضيق ... التنفس") must produce "immediate".',
      checks: [
        { label: 'Urgency level is "immediate"', check: (a) => a.flag.level === 'immediate' }
      ],
      clinicalReviewNeeded: false,
      explanation: 'Positive MSA red-flag rule check with an adjective between the symptom and the body system (within the disclosed gap pattern).'
    },
    {
      id: 'C3', group: 'C',
      language: 'Arabic — Modern Standard',
      category: 'Negation — covered negator',
      patient: { name: 'TEST · Scenario C3', nid: '1000000033', age: 47 },
      complaint: 'لا أعاني من ألم في الصدر ولكن لديّ صداع شديد.',
      vitals: null,
      requirement: 'REQ-NEG-01 + REQ-FLAG-02: "لا أعاني من ألم في الصدر" must be stripped (after alef normalization), so the statement must NOT produce "immediate"; the remaining severe headache (صداع) is a recognised priority term in the current rule set.',
      checks: [
        { label: 'Urgency level is NOT "immediate"', check: (a) => a.flag.level !== 'immediate' },
        { label: 'Remaining symptom (headache) classified as "priority"', check: (a) => a.flag.level === 'priority' }
      ],
      clinicalReviewNeeded: true,
      explanation: 'Checks the covered Arabic negator form "لا أعاني من" with a headache as the positive remainder. Headache is not in the rule list; fallback behavior needs clinical review.'
    },
    {
      id: 'C4', group: 'C',
      language: 'Arabic — Modern Standard',
      category: 'Priority-level recognition',
      patient: { name: 'TEST · Scenario C4', nid: '1000000034', age: 44 },
      complaint: 'عندي حرارة شديدة مع قيء متكرر منذ يومين.',
      vitals: null,
      requirement: 'REQ-FLAG-02: complaint with vomiting (قيء) must produce "priority".',
      checks: [
        { label: 'Urgency level is "priority"', check: (a) => a.flag.level === 'priority' }
      ],
      clinicalReviewNeeded: true,
      explanation: 'Expected to pass through the "قيء" term. See C5: the word "حرارة" (with taa marbuta ة) is itself not matched by the disclosed fever term "حراره" (with haa ه), so fever alone would be unrecognized — flagged for expert review.'
    },
    {
      id: 'C5', group: 'C',
      language: 'Arabic — Modern Standard',
      category: 'Priority-level recognition — spelling variant',
      patient: { name: 'TEST · Scenario C5', nid: '1000000035', age: 51 },
      complaint: 'أشعر بحرارة مرتفعة في جسمي منذ ليلتين.',
      vitals: null,
      requirement: 'REQ-FLAG-02 (intent): an MSA fever complaint ("حرارة") should be recognized and produce "priority".',
      checks: [
        { label: 'Urgency level is "priority"', check: (a) => a.flag.level === 'priority' }
      ],
      clinicalReviewNeeded: true,
      safetyConcern: 'Possible under-triage: the disclosed fever term is spelled "حراره" (final haa) while MSA "حرارة" ends in taa marbuta; normalization does not unify ة/ه, so MSA fever may fall through to "unclassified".',
      explanation: 'Designed as an orthography-variant probe (ة vs ه).'
    },
    {
      id: 'C6', group: 'C',
      language: 'Arabic — Modern Standard',
      category: 'Negation — intervening word',
      patient: { name: 'TEST · Scenario C6', nid: '1000000036', age: 39 },
      complaint: 'لا يوجد عندي ضيق في التنفس.',
      vitals: null,
      requirement: 'REQ-NEG-01 (intent): "لا يوجد ... ضيق في التنفس" is a negated breathing symptom and must NOT produce "immediate".',
      checks: [
        { label: 'Urgency level is NOT "immediate"', check: (a) => a.flag.level !== 'immediate' }
      ],
      clinicalReviewNeeded: true,
      safetyConcern: 'Possible over-triage: the Arabic negation pattern requires the negator and symptom to be adjacent ("لا يوجد ضيق في التنفس"); an intervening word like "عندي" defeats the strip, so the negated symptom may still trigger "immediate".',
      explanation: 'Designed as an Arabic negation word-order probe.'
    },

    /* ---------------------------------------------------------------
     * GROUP D — Saudi colloquial Arabic, fictional expressions (6)
     * --------------------------------------------------------------- */
    {
      id: 'D1', group: 'D',
      language: 'Arabic — Saudi colloquial (fictional)',
      category: 'Red-flag recognition — colloquial cardiac wording',
      patient: { name: 'TEST · Scenario D1', nid: '2000000041', age: 64 },
      complaint: 'وجع قلبي شديد وجاي في صدري من الصبح.',
      vitals: null,
      requirement: 'REQ-FLAG-01 (intent): a colloquial cardiac/chest complaint ("وجع قلبي ... صدري") expresses the same warning phrase as "وجع ... صدر" and should produce "immediate".',
      checks: [
        { label: 'Urgency level is "immediate"', check: (a) => a.flag.level === 'immediate' }
      ],
      clinicalReviewNeeded: true,
      safetyConcern: 'Possible under-triage: the colloquial cardiac phrasing exceeds the disclosed 16-character gap between وجع and صدر (or omits the word صدر from the matched span), so it may fall back to "unclassified".',
      explanation: 'Designed as a colloquial-wording probe using a realistic fictional Saudi expression for chest/heart pain.'
    },
    {
      id: 'D2', group: 'D',
      language: 'Arabic — Saudi colloquial (fictional)',
      category: 'Fallback behavior — colloquial complaint',
      patient: { name: 'TEST · Scenario D2', nid: '2000000042', age: 35 },
      complaint: 'راسي يوجعني شديد من الصبح.',
      vitals: null,
      requirement: 'REQ-FLAG-04: colloquial text not matching any disclosed rule must fall back to "unclassified" with reason "unknown" (clinician assessment required).',
      checks: [
        { label: 'Urgency level is "unclassified"', check: (a) => a.flag.level === 'unclassified' },
        { label: 'Flag reason is "unknown"', check: (a) => a.flag.reason === 'unknown' }
      ],
      clinicalReviewNeeded: true,
      explanation: 'Headache wording ("راسي يوجعني") is not in any rule list. This documents the safe-by-default fallback, which is why clinical review of the mapping is recommended.'
    },
    {
      id: 'D3', group: 'D',
      language: 'Arabic — Saudi colloquial (fictional)',
      category: 'Negation — colloquial negator',
      patient: { name: 'TEST · Scenario D3', nid: '2000000043', age: 48 },
      complaint: 'ما في وجع في صدري الحين.',
      vitals: null,
      requirement: 'REQ-NEG-01 (intent): "ما في ... وجع في صدري" is a negated chest symptom and must NOT produce "immediate".',
      checks: [
        { label: 'Urgency level is NOT "immediate"', check: (a) => a.flag.level !== 'immediate' }
      ],
      clinicalReviewNeeded: true,
      safetyConcern: 'Possible over-triage: colloquial negators ("ما في", "ما عندي") are not in the Arabic negation list (لا اعاني من / لا يوجد / بدون), so a negated symptom may still trigger "immediate".',
      explanation: 'Designed as a colloquial-negation probe using a realistic fictional Saudi expression.'
    },
    {
      id: 'D4', group: 'D',
      language: 'Arabic — Saudi colloquial (fictional)',
      category: 'Fallback behavior — colloquial respiratory wording',
      patient: { name: 'TEST · Scenario D4', nid: '2000000044', age: 70 },
      complaint: 'أتنفس بسرعة وأتعب من أي شغل بسيط.',
      vitals: null,
      requirement: 'REQ-FLAG-04: colloquial text not matching any disclosed rule must fall back to "unclassified" (reason "unknown").',
      checks: [
        { label: 'Urgency level is "unclassified"', check: (a) => a.flag.level === 'unclassified' },
        { label: 'Flag reason is "unknown"', check: (a) => a.flag.reason === 'unknown' }
      ],
      clinicalReviewNeeded: true,
      explanation: 'Colloquial fast-breathing description is not in the rule list. Documents the fallback path; clinical appropriateness of the mapping needs expert review.'
    },
    {
      id: 'D5', group: 'D',
      language: 'Arabic — Saudi colloquial (fictional)',
      category: 'Priority-level recognition',
      patient: { name: 'TEST · Scenario D5', nid: '2000000045', age: 29 },
      complaint: 'عندي حمى ووجع في جسمي كله.',
      vitals: null,
      requirement: 'REQ-FLAG-02: complaint containing "حمى" (fever) must produce "priority".',
      checks: [
        { label: 'Urgency level is "priority"', check: (a) => a.flag.level === 'priority' }
      ],
      clinicalReviewNeeded: false,
      explanation: 'Colloquial statement that happens to contain the disclosed fever term "حمى".'
    },
    {
      id: 'D6', group: 'D',
      language: 'Arabic — Saudi colloquial (fictional)',
      category: 'Negation — covered negator',
      patient: { name: 'TEST · Scenario D6', nid: '2000000046', age: 43 },
      complaint: 'بدون نزيف شديد، بس دوخة شديدة.',
      vitals: null,
      requirement: 'REQ-NEG-01 + REQ-FLAG-02: "بدون نزيف شديد" must be stripped so the statement must NOT produce "immediate"; the remaining severe dizziness (دوخة, matched after ة→ه normalization) is a recognised priority term in the current rule set.',
      checks: [
        { label: 'Urgency level is NOT "immediate"', check: (a) => a.flag.level !== 'immediate' },
        { label: 'Remaining symptom (dizziness) classified as "priority"', check: (a) => a.flag.level === 'priority' }
      ],
      clinicalReviewNeeded: true,
      explanation: 'Uses the covered negator "بدون" with the exact listed phrase "نزيف شديد", followed by an unrecognized colloquial symptom (dizziness).'
    },

    /* ---------------------------------------------------------------
     * GROUP E — Vital signs and boundary conditions (6)
     * --------------------------------------------------------------- */
    {
      id: 'E1', group: 'E',
      language: 'N/A — vital-sign values',
      category: 'Vital thresholds — SpO2 and systolic BP',
      patient: { name: 'TEST · Scenario E1', nid: '1000000051', age: 68 },
      complaint: 'Follow-up check.',
      vitals: { spo2: 88, sbp: 89, dbp: 55, hr: 98 },
      requirement: 'REQ-VITAL-01: SpO2 < 92 and systolic BP < 90 must produce "immediate" with reason "vitals" even when the complaint is neutral.',
      checks: [
        { label: 'Urgency level is "immediate"', check: (a) => a.flag.level === 'immediate' },
        { label: 'Flag reason is "vitals"', check: (a) => a.flag.reason === 'vitals' },
        { label: 'All four entered vitals accepted and stored', check: (a) => a.acceptedVitals.spo2 === 88 && a.acceptedVitals.sbp === 89 && a.acceptedVitals.dbp === 55 && a.acceptedVitals.hr === 98 }
      ],
      clinicalReviewNeeded: false,
      explanation: 'Threshold check for the disclosed SpO2 (<92) and systolic (<90) rules with a deliberately neutral complaint.'
    },
    {
      id: 'E2', group: 'E',
      language: 'N/A — vital-sign values',
      category: 'Normal vitals — no flag',
      patient: { name: 'TEST · Scenario E2', nid: '1000000052', age: 40 },
      complaint: 'Routine blood pressure follow-up visit.',
      vitals: { spo2: 97, hr: 72, sbp: 118, dbp: 76, temp: 37.2, rr: 16 },
      requirement: 'REQ-VITAL-01 (negative control): with all vitals inside the disclosed abnormal thresholds and a non-symptom complaint, the intake must NOT produce "immediate"; unrecognized text falls back to "unclassified".',
      checks: [
        { label: 'Urgency level is NOT "immediate"', check: (a) => a.flag.level !== 'immediate' },
        { label: 'Falls back to "unclassified"', check: (a) => a.flag.level === 'unclassified' },
        { label: 'All six vitals accepted and stored', check: (a) => ['spo2', 'hr', 'sbp', 'dbp', 'temp', 'rr'].every((k) => a.acceptedVitals[k] != null) }
      ],
      clinicalReviewNeeded: false,
      explanation: 'Negative control confirming normal values do not trigger the abnormal-vitals rule.'
    },
    {
      id: 'E3', group: 'E',
      language: 'N/A — vital-sign values',
      category: 'Boundary — heart rate',
      patient: { name: 'TEST · Scenario E3', nid: '1000000053', age: 74 },
      complaint: 'Follow-up check.',
      vitals: { hr: 131 },
      requirement: 'REQ-VITAL-01 + REQ-VITAL-02: heart rate > 130 must produce "immediate" (reason "vitals"), while exactly 130 (boundary, also probed directly via the same function) must NOT flag.',
      checks: [
        { label: 'HR 131 produces "immediate"', check: (a) => a.flag.level === 'immediate' },
        { label: 'Boundary probe: HR 130 does NOT flag immediate', check: (a, p, M) => M.flag(M.normalize({ complaint: 'Follow-up check.', vitals: { hr: 130 } })).level !== 'immediate' }
      ],
      clinicalReviewNeeded: false,
      explanation: 'Executes the boundary condition on both sides of the disclosed threshold (strict > 130 comparison).'
    },
    {
      id: 'E4', group: 'E',
      language: 'N/A — vital-sign values',
      category: 'Boundary — temperature',
      patient: { name: 'TEST · Scenario E4', nid: '1000000054', age: 31 },
      complaint: 'Follow-up check.',
      vitals: { temp: 40.1 },
      requirement: 'REQ-VITAL-01: temperature >= 40 must produce "immediate" (reason "vitals"); the comparison is inclusive at 40 per the disclosed rule.',
      checks: [
        { label: 'Temp 40.1 produces "immediate"', check: (a) => a.flag.level === 'immediate' },
        { label: 'Flag reason is "vitals"', check: (a) => a.flag.reason === 'vitals' },
        { label: 'Decimal value stored unrounded', check: (a) => a.acceptedVitals.temp === 40.1 }
      ],
      clinicalReviewNeeded: false,
      explanation: 'Just above the disclosed >= 40 threshold, using a decimal value to check storage fidelity.'
    },
    {
      id: 'E5', group: 'E',
      language: 'N/A — vital-sign values',
      category: 'Boundary — respiratory rate (low)',
      patient: { name: 'TEST · Scenario E5', nid: '1000000055', age: 80 },
      complaint: 'Follow-up check.',
      vitals: { rr: 7 },
      requirement: 'REQ-VITAL-01: respiratory rate < 8 must produce "immediate" (reason "vitals"); the input range (3–80) accepts 7.',
      checks: [
        { label: 'RR 7 produces "immediate"', check: (a) => a.flag.level === 'immediate' },
        { label: 'Flag reason is "vitals"', check: (a) => a.flag.reason === 'vitals' }
      ],
      clinicalReviewNeeded: false,
      explanation: 'Below the disclosed low respiratory-rate threshold.'
    },
    {
      id: 'E6', group: 'E',
      language: 'N/A — invalid inputs',
      category: 'Validation — invalid and out-of-range inputs',
      patient: { name: 'TEST · Scenario E6', nid: '3000000000', age: '-5' },
      complaint: 'Routine check.',
      vitals: { spo2: 'abc', sbp: '120', dbp: '130' },
      requirement: 'REQ-VAL-01: intake validation must reject the invalid national ID (3000000000), age (-5), non-numeric SpO2 ("abc"), and inverted blood pressure (dbp 130 >= sbp 120), reporting named field errors "nid", "age", "spo2", "bp".',
      checks: [
        { label: 'Validation reports exactly the errors {nid, age, spo2, bp}', check: (a) => ['nid', 'age', 'spo2', 'bp'].every((k) => a.validationErrors.includes(k)) && a.validationErrors.length === 4 },
        { label: 'Non-numeric SpO2 value is not stored by normalize (defense in depth)', check: (a) => a.acceptedVitals.spo2 == null },
        { label: 'Inverted BP is rejected at intake (documented validate gate)', check: (a) => a.validationErrors.includes('bp') }
      ],
      clinicalReviewNeeded: false,
      explanation: 'Invalid-input test: text where a number is expected, an out-of-policy ID, an out-of-range age, and an inverted BP pair. The intake gate (validate) rejects all four with named field errors. Note: normalize independently stores in-range values (including the in-range inverted BP) and drops non-numeric/out-of-range ones, so the validation layer is the required gate for BP pairing — both layers were executed and are reported here.'
    }
  ];

  root.MedFlowTestScenarios = { version: VERSION, requirements: REQUIREMENTS, scenarios: SCENARIOS };
})(typeof globalThis !== 'undefined' ? globalThis : this);
