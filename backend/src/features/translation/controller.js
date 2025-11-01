// ===== PRODUCTION-READY TRANSLATION CONTROLLER =====
// This file defines the API routes for the translation feature.
// It acts as the Composition Root, instantiating and wiring together
// all the necessary services (repository, agents, orchestrator) for this feature.

// ===== IMPORTS & DEPENDENCIES =====
import { getDb } from '#lib/mongoClient.js';
import { getPineconeIndex } from '#lib/pineconeClient.js';
import { callGemini } from '#lib/geminiClient.js';
import { TranslationRepository } from './repository.js';
import { AgentService } from './agents.js';
import { TranslationOrchestrator } from './orchestrator.js';

// ===== ROUTE SCHEMAS =====
// Centralizing schemas keeps the route definitions clean.
const schemas = {
  blueprintBody: {
    type: 'object',
    required: ['subtitleContent', 'settings'],
    properties: {
      subtitleContent: { type: 'string', minLength: 1, description: 'The full SRT or plain text content to be translated.' },
      settings: { 
        type: 'object', 
        required: ['tone'], 
        properties: { 
          tone: { type: 'string', description: 'The desired tone for the translation (e.g., formal, witty, academic).' } 
        }
      },
    },
  },
  executeBody: {
    type: 'object',
    required: ['jobId', 'settings', 'confirmedBlueprint'],
    properties: {
      jobId: { type: 'string', description: 'The unique ID of the translation job.' },
      settings: { type: 'object', description: 'The same settings object used for blueprint generation.' },
      confirmedBlueprint: { type: 'object', description: 'The user-approved blueprint, possibly with modifications.' },
    },
  },
};

// ===== CONTROLLER DEFINITION =====
/**
 * Registers the translation feature's routes and services with the Fastify server.
 * @param {import('fastify').FastifyInstance} server
 * @param {object} opts
 */
export default async function (server, opts) {
  
  // --- COMPOSITION ROOT ---
  // This is the single place where we create and connect our feature's services.
  // This pattern is the essence of Dependency Injection and Clean Architecture.
  
  const logger = server.log; // Use Fastify's built-in request-scoped logger.

  // 1. Create the data access layer.
  const repository = new TranslationRepository({ 
    db: getDb(), 
    vectorIndex: getPineconeIndex(), 
    logger,
  });

  // 2. Create the AI agent service layer.
  const agentService = new AgentService({
    geminiClient: callGemini, // Inject the actual Gemini API call function.
    logger,
  });

  // 3. Create the core business logic layer, injecting the repository and agent service.
  const orchestrator = new TranslationOrchestrator({ 
    repository, 
    agentService,
    logger,
  });
  
  // --- ROUTE DEFINITIONS ---

  server.post('/blueprint', { schema: { body: schemas.blueprintBody } }, async (request, reply) => {
    // No try/catch needed. Our global handler in `app.js` will manage any errors.
    const { subtitleContent, settings } = request.body;
    request.log.info('Blueprint generation request received.');
    
    // Delegate all complex work to the orchestrator.
    const result = await orchestrator.generateTranslationBlueprint(subtitleContent, settings);
    
    // Fastify handles the 200 OK response and JSON serialization.
    return result;
  });

  server.post('/execute', { schema: { body: schemas.executeBody } }, async (request, reply) => {
    const { jobId, settings, confirmedBlueprint } = request.body;
    request.log.info({ jobId }, 'Translation execution request received.');
    
    const result = await orchestrator.executeTranslationChain(jobId, confirmedBlueprint, settings);
    
    return result;
  });
}
