// UPDATED IMPORTS using the '#' alias system
import { callGemini } from '#lib/geminiClient.js';
import { toSrtPromptFormat } from '#core/srtParser.js';

// ===== BLUEPRINT GENERATION AGENTS (PHASE 1) =====

/**
 * Agent 1: Extracts key terms, jargon, and entities from the source text.
 */
export async function agent_extractKeywords(text) {
  const prompt = `You are a Lexical Analyst. Your only task is to extract technical terms, specialist jargon, named entities, and culturally specific idioms from the text.
Your output MUST be a single JSON object with this exact structure: { "keywords": [{ "term": "...", "definition": "A concise, context-relevant definition" }] }.
Do not output any text before or after the JSON object. If no keywords are found, return { "keywords": [] }.

---
**Source Text for Analysis:**
${text}
---

Produce the JSON output.`;
  const response = await callGemini(prompt, true); // Expect JSON
  return JSON.parse(response);
}

/**
 * Agent 2: Finds high-quality Persian translations for the extracted keywords.
 */
export async function agent_groundTranslations(keywords) {
  const prompt = `You are a professional Lexicographer. For each English term provided, find at least 3 high-quality, distinct Persian translations.
Your output MUST be a single JSON object with this exact structure: { "grounded_keywords": [{ "term": "...", "translations": ["...", "..."] }] }.
Do not output any text before or after the JSON object.

---
**Terms to Translate (with definitions):**
${JSON.stringify(keywords, null, 2)}
---

Produce the JSON output.`;
  const response = await callGemini(prompt, true); // Expect JSON
  return JSON.parse(response);
}

/**
 * Agent 3: Synthesizes all analysis into the final, comprehensive blueprint.
 */
export async function agent_assembleBlueprint(text, tone, groundedKeywords) {
  const prompt = `You are a Pre-production Strategist. Generate a "Translation Blueprint" JSON object based on the provided script, tone, and pre-verified keywords. This blueprint is the single source of truth for the translation team. Your analysis must be meticulous.
The JSON MUST include:
1.  'summary': A concise plot summary.
2.  'keyPoints': An array of key themes.
3.  'characterProfiles': An array of objects detailing character speaking styles.
4.  'culturalAdaptations' (Phantom Lingo™): An array identifying idioms and proposing culturally equivalent Persian adaptations.
5.  'glossary' (World Anvil): A detailed glossary where for each keyword, you select the single best 'proposedTranslation' from the candidates provided, and write a powerful 'justification' based on evidence from the text and the requested '${tone}' tone.

Your output MUST be only the single, valid JSON object. No other text.

---
**PRE-VERIFIED KEYWORD LIST (with translation candidates):**
${JSON.stringify(groundedKeywords, null, 2)}
---
**Full English Subtitle Script for Analysis:**
${text}
---

Produce the complete Translation Blueprint JSON.`;
  const response = await callGemini(prompt, true); // Expect JSON
  return JSON.parse(response);
}


// ===== BATCH TRANSLATION AGENTS (PHASE 2) =====

/**
 * Agent 4: Translates a batch of text, guided by the user-approved blueprint.
 */
export async function agent_transcreateBatch(batch, previousContext, blueprint, tone) {
  const batchSrt = toSrtPromptFormat(batch);
  const prompt = `You are a Master Transcreator. Adhering strictly to the provided Blueprint, transcreate the following SRT batch into fluent Persian. The number of output lines must exactly match the number of input entries.
Previous Context: ${previousContext}
Blueprint: ${JSON.stringify(blueprint)}
Tone: ${tone}

BATCH TO TRANSLATE (Format: "Sequence | Text"):
---
${batchSrt}
---
Provide ONLY the translated text, one subtitle per line.`;
  return await callGemini(prompt);
}

/**
 * Agent 5: Edits the translated batch for style, grammar, and accuracy.
 */
export async function agent_editBatch(batch, initialTranslation, blueprint, tone) {
  const batchSrt = toSrtPromptFormat(batch);
  const prompt = `You are a Senior Editor. Polish the provided Persian translation, ensuring it is faithful to the original English and the Blueprint directives (Glossary, Personas, Tone). The number of output lines must exactly match the input.

ORIGINAL BATCH:
---
${batchSrt}
---
INITIAL TRANSLATION (to be edited):
---
${initialTranslation}
---
Provide ONLY the edited and improved Persian text, one subtitle per line.`;
  return await callGemini(prompt);
}

/**
 * Agent 6: Performs a final quality assurance check.
 */
export async function agent_qaBatch(batch, editedTranslation, blueprint, tone) {
  const batchSrt = toSrtPromptFormat(batch);
  const prompt = `You are Head of QA. Perform a final review of the edited translation for accuracy and brief compliance. The number of output lines must exactly match the input.

ORIGINAL BATCH:
---
${batchSrt}
---
EDITED TRANSLATION (to be reviewed):
---
${editedTranslation}
---
Provide ONLY the final, approved Persian text, one subtitle per line.`;
  return await callGemini(prompt);
}

/**
 * Agent 7: "Phantom Sync™" - Analyzes and compresses lines for readability.
 */
export async function agent_phantomSync(batch, qaTranslation) {
  const promptData = batch.map((line, index) => {
    const translatedLine = qaTranslation.split('\n')[index] || '';
    return `L${line.sequence}:
- Duration: ${line.duration.toFixed(2)}s
- Translated Persian: "${translatedLine}"`;
  }).join('\n');

  const prompt = `You are "Phantom Sync™", a subtitle Pacing & Readability Analyst. Adjust translated Persian lines that are too long for their on-screen duration by rewriting them to be more concise while preserving 100% of the original meaning.
**Rules:**
1.  Analyze each line's reading pace (Characters Per Second). The professional threshold for Persian is ~22 CPS.
2.  If a line is too fast (> 22 CPS), rewrite it to be shorter. Append the annotation: \`[PS Sync: Compressed from "original longer translation" for readability.]\`.
3.  If a line's pace is acceptable, return it exactly as is.
4.  The number of output lines MUST exactly match the number of input lines.

**Data for Analysis:**
---
${promptData}
---
Provide the final, sync-checked Persian subtitle text. Output ONLY the text, with one subtitle line per line, including any required [PS Sync: ...] annotations.`;
  return await callGemini(prompt);
}
