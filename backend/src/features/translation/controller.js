// ===== DEVELOPMENT/DEBUG TRANSLATION CONTROLLER =====
// This file is refactored to use our application-wide Zod validation strategy
// and to correctly propagate the request-specific, contextual logger for end-to-end observability.

// ===== IMPORTS & DEPENDENCIES =====
import { getDb } from '#lib/mongoClient.js';
import { getPineconeIndex } from '#lib/pineconeClient.js';
import { callGemini } from '#lib/geminiClient.js';
import { TranslationRepository } from './repository.js';
import { AgentService } from './agents.js';
import { TranslationOrchestrator } from './orchestrator.js';
import { translationSchemas } from './translation.schemas.js'; // Import our new Zod schemas
import { zodToJsonSchema } from 'zod-to-json-schema'; // Helper to convert Zod to JSON Schema

// ===== CONTROLLER DEFINITION =====
/**
 * Registers the translation feature's routes and services with the Fastify server.
 * @param {import('fastify').FastifyInstance} server
 * @param {object} opts
 */
export default async function (server, opts) {
  
  // --- COMPOSITION ROOT ---
  // This composition remains the same, but the logger being passed here is the GLOBAL logger.
  // This is fine for instantiation, but for request handling, we MUST use the request-specific logger.
  
  // 1. Create the data access layer.
  const repository = new TranslationRepository({ 
    db: getDb(), 
    vectorIndex: getPineconeIndex(), 
    logger: server.log, // Global logger for setup-time logging
  });

  // 2. Create the AI agent service layer.
  const agentService = new AgentService({
    geminiClient: callGemini,
    logger: server.log,
  });

  // 3. Create the core business logic layer, injecting dependencies.
  const orchestrator = new TranslationOrchestrator({ 
    repository, 
    agentService,
    logger: server.log,
  });
  
  // --- ROUTE DEFINITIONS ---

  server.post(
    '/blueprint', 
    { 
      schema: { 
        // We convert our Zod schema into the JSON Schema that Fastify understands.
        body: zodToJsonSchema(translationSchemas.blueprintBody, 'blueprintBodySchema'),
      },
    }, 
    async (request, reply) => {
      // Any errors thrown from here onwards will be caught by our global handler.
      const { subtitleContent, settings } = request.body;
      
      // CRITICAL: We use request.log here, which has the unique traceId.
      request.log.info('Blueprint generation request received.');
    
      // Pass the contextual logger down into the business logic layer.
      const result = await orchestrator.generateTranslationBlueprint(
        subtitleContent, 
        settings, 
        request.log // <-- CONTEXTUAL LOGGER INJECTION
      );
    
      // Fastify handles the 200 OK and serialization.
      return result;
    }
  );

  server.post(
    '/execute', 
    { 
      schema: { 
        body: zodToJsonSchema(translationSchemas.executeBody, 'executeBodySchema'),
      },
    }, 
    async (request, reply) => {
      const { jobId, settings, confirmedBlueprint } = request.body;
      
      request.log.info({ jobId }, 'Translation execution request received.');
    
      // Pass the contextual logger down for this request as well.
      const result = await orchestrator.executeTranslationChain(
        jobId, 
        confirmedBlueprint, 
        settings,
        request.log // <-- CONTEXTUAL LOGGER INJECTION
      );
    
      return result;
    }
  );
}
