// ===== IMPORTS & DEPENDENCIES =====
import { generateTranslationBlueprint, executeTranslationChain } from './orchestrator.js';

// ===== CONTROLLER DEFINITION =====
/**
 * @param {import('fastify').FastifyInstance} server
 * @param {object} opts
 */
export default async function (server, opts) {
  
  const blueprintBodySchema = {
    type: 'object',
    required: ['subtitleContent', 'settings'],
    properties: {
      subtitleContent: { type: 'string', minLength: 1 },
      settings: { 
        type: 'object', required: ['tone'], properties: { tone: { type: 'string' } }
      },
    },
  };

  const executeBodySchema = {
    type: 'object',
    required: ['jobId', 'settings', 'confirmedBlueprint'],
    properties: {
      jobId: { type: 'string' },
      settings: { type: 'object' },
      confirmedBlueprint: { type: 'object' },
    },
  };

  server.post('/blueprint', { schema: { body: blueprintBodySchema } }, async (request, reply) => {
    try {
      const { subtitleContent, settings } = request.body;
      request.log.info('Blueprint generation request received.');
      const result = await generateTranslationBlueprint(request.log, subtitleContent, settings);
      return result;
    } catch (error) {
      request.log.error({ err: error, cause: error.cause }, 'Error in /blueprint controller');
      const isProduction = process.env.NODE_ENV === 'production';
      const errorMessage = isProduction 
        ? 'An internal server error occurred while generating the blueprint.' 
        : `Blueprint generation failed: ${error.message}`;
      return reply.code(500).send({ error: errorMessage });
    }
  });

  server.post('/execute', { schema: { body: executeBodySchema } }, async (request, reply) => {
    try {
      const { jobId, settings, confirmedBlueprint } = request.body;
      request.log.info({ jobId }, 'Translation execution request received.');
      const result = await executeTranslationChain(request.log, jobId, confirmedBlueprint, settings);
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
