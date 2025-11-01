// ===== IMPORTS & DEPENDENCIES =====
import { generateTranslationBlueprint, executeTranslationChain } from './orchestrator.js';

// ===== CONTROLLER DEFINITION =====

/**
 * A Fastify plugin that encapsulates all routes related to the translation feature.
 * @param {import('fastify').FastifyInstance} server - The Fastify server instance.
 * @param {object} opts - Plugin options.
 */
export default async function (server, opts) {
  
  // --- Route Schemas for Automatic Validation ---
  const blueprintBodySchema = {
    type: 'object',
    required: ['subtitleContent', 'settings'],
    properties: {
      subtitleContent: { type: 'string', minLength: 1 },
      settings: { 
        type: 'object',
        required: ['tone'],
        properties: {
          tone: { type: 'string' }
        }
      },
    },
  };

  const executeBodySchema = {
    type: 'object',
    required: ['subtitleContent', 'settings', 'confirmedBlueprint'],
    properties: {
      subtitleContent: { type: 'string', minLength: 1 },
      settings: { type: 'object' }, // Schemas can be as simple or complex as needed
      confirmedBlueprint: { type: 'object' },
    },
  };

  // --- Route Handlers ---

  /**
   * Defines the POST /blueprint route.
   * This endpoint is responsible for the entire Phase 1 analysis.
   */
  server.post('/blueprint', { schema: { body: blueprintBodySchema } }, async (request, reply) => {
    try {
      // Input validation is now handled automatically by the schema.
      const { subtitleContent, settings } = request.body;
      
      request.log.info('Blueprint generation request received.');
      
      // Pass the request-specific logger to the orchestrator to enable a traceable logging chain.
      const blueprint = await generateTranslationBlueprint(request.log, subtitleContent, settings);
      
      // Send the generated blueprint back to the frontend for review.
      return { blueprint };

    } catch (error) {
      // Log the full error, including the preserved `cause` for deep debugging.
      request.log.error({ err: error, cause: error.cause }, 'Error in /blueprint controller');
      
      // Provide intelligent error responses based on the environment.
      const isProduction = process.env.NODE_ENV === 'production';
      const errorMessage = isProduction 
        ? 'An internal server error occurred while generating the blueprint.' 
        : `Blueprint generation failed: ${error.message}`;
      
      return reply.code(500).send({ error: errorMessage });
    }
  });

  /**
   * Defines the POST /execute route.
   * This endpoint runs the main translation pipeline after the user confirms the blueprint.
   */
  server.post('/execute', { schema: { body: executeBodySchema } }, async (request, reply) => {
    try {
      const { subtitleContent, settings, confirmedBlueprint } = request.body;
      
      request.log.info('Translation execution request received.');

      // Pass the request-specific logger to the orchestrator.
      const result = await executeTranslationChain(request.log, subtitleContent, settings, confirmedBlueprint);

      // Send the final result (SRT string + sync suggestions) back to the frontend.
      return result;

    } catch (error) {
      request.log.error({ err: error, cause: error.cause }, 'Error in /execute controller');
      
      const isProduction = process.env.NODE_ENV === 'production';
      const errorMessage = isProduction 
        ? 'An internal server error occurred during translation execution.'
        : `Translation execution failed: ${error.message}`;

      return reply.code(500).send({ error: errorMessage });
    }
  });
}
