// ===== PRODUCTION-READY TRANSLATION CONTROLLER =====
// This file defines the API routes for the translation feature.
// It acts as the Composition Root, instantiating and wiring together
// all the necessary services (repository, orchestrator) for this feature.

// ===== IMPORTS & DEPENDENCIES =====
import { getDb } from '#lib/mongoClient.js';
import { getPineconeIndex } from '#lib/pineconeClient.js';
import { TranslationRepository } from './repository.js';
import { TranslationOrchestrator } from './orchestrator.js';

// ===== ROUTE SCHEMAS =====
// Grouping schemas makes the controller code cleaner and more organized.
const schemas = {
  blueprintBody: {
    type: 'object',
    required: ['subtitleContent', 'settings'],
    properties: {
      subtitleContent: { type: 'string', minLength: 1 },
      settings: { 
        type: 'object', required: ['tone'], properties: { tone: { type: 'string' } }
      },
    },
  },
  executeBody: {
    type: 'object',
    required: ['jobId', 'settings', 'confirmedBlueprint'],
    properties: {
      jobId: { type: 'string' },
      settings: { type: 'object' },
      confirmedBlueprint: { type: 'object' },
    },
  },
};

// ===== CONTROLLER DEFINITION =====
/**
 * @param {import('fastify').FastifyInstance} server
 * @param {object} opts
 */
export default async function (server, opts) {
  
  // --- COMPOSITION ROOT ---
  // Here we instantiate and wire together the services for the translation feature.
  // This is the core of Dependency Injection.
  
  // 1. Get database connections, which are safely established by now.
  const db = getDb();
  const vectorIndex = getPineconeIndex();

  // 2. Create the repository instance, injecting its dependencies.
  const repository = new TranslationRepository({ 
    db, 
    vectorIndex, 
    logger: server.log // Use Fastify's logger.
  });

  // 3. Create the orchestrator instance, injecting the repository.
  const orchestrator = new TranslationOrchestrator({ 
    repository, 
    logger: server.log 
  });
  
  // --- ROUTE DEFINITIONS ---

  server.post('/blueprint', { schema: { body: schemas.blueprintBody } }, async (request, reply) => {
    // Note: No more try/catch block.
    // Our global error handler in app.js will catch any exceptions thrown
    // from the orchestrator and format a safe 500 response. This keeps the controller lean.
    const { subtitleContent, settings } = request.body;
    request.log.info('Blueprint generation request received.');
    
    // Delegate the core logic to the orchestrator instance.
    const result = await orchestrator.generateTranslationBlueprint(subtitleContent, settings);
    
    // Fastify automatically handles JSON serialization and sends a 200 OK.
    return result;
  });

  server.post('/execute', { schema: { body: schemas.executeBody } }, async (request, reply) => {
    const { jobId, settings, confirmedBlueprint } = request.body;
    request.log.info({ jobId }, 'Translation execution request received.');
    
    // Delegate to the orchestrator.
    const result = await orchestrator.executeTranslationChain(jobId, confirmedBlueprint, settings);
    
    return result;
  });
}
