// ===== PRODUCTION-READY TRANSLATION SCHEMAS (ZOD) =====
// This file centralizes all Zod schemas for the translation feature.
// It provides a single source of truth for API request and response shapes.

import { z } from 'zod';

// --- Reusable Components ---
const settingsSchema = z.object({
  tone: z.string({ required_error: 'Tone is required.' }).min(1, 'Tone cannot be empty.'),
  // Future settings like 'formality', 'genre', etc., can be added here.
});

// --- Route-Specific Schemas ---

// POST /blueprint
const blueprintBodySchema = z.object({
  subtitleContent: z.string().min(1, 'subtitleContent cannot be empty.'),
  settings: settingsSchema,
});

// POST /execute
// For now, we accept any object for confirmedBlueprint as its shape is dynamic.
// We can tighten this later if a fixed structure emerges.
const executeBodySchema = z.object({
  jobId: z.string().min(1, 'jobId is required.'),
  settings: settingsSchema,
  confirmedBlueprint: z.object({}).passthrough(),
});


// We group and export all schemas for easy importing in the controller.
export const translationSchemas = {
  blueprintBody: blueprintBodySchema,
  executeBody: executeBodySchema,
};
