// CORRECTED IMPORT PATH: We use './' to signify the current directory.
import { generateTranslationBlueprint, executeTranslationChain } from './orchestrator.js';

/**
 * A Fastify plugin that encapsulates all routes related to the translation feature.
 * @param {FastifyInstance} server - The Fastify server instance.
 * @param {object} opts - Plugin options.
 */
export default async function (server, opts) {
  
  // Defines the POST /blueprint route
  // This endpoint is responsible for the entire Phase 1 analysis.
  server.post('/blueprint', async (request, reply) => {
    try {
      const { subtitleContent, settings } = request.body;
      if (!subtitleContent || !settings) {
        // Return a clear error if the request is malformed.
        return reply.code(400).send({ error: 'Missing subtitleContent or settings in the request body.' });
      }

      const blueprint = await generateTranslationBlueprint(subtitleContent, settings);
      
      // Send the generated blueprint back to the frontend for review.
      return { blueprint };

    } catch (error) {
      server.log.error(error, 'Error in /blueprint controller');
      return reply.code(500).send({ error: 'An internal server error occurred while generating the blueprint.' });
    }
  });

  // Defines the POST /execute route
  // This endpoint runs the main translation pipeline after the user confirms the blueprint.
  server.post('/execute', async (request, reply) => {
    try {
      const { subtitleContent, settings, confirmedBlueprint } = request.body;
      if (!subtitleContent || !settings || !confirmedBlueprint) {
        return reply.code(400).send({ error: 'Missing required fields for execution.' });
      }

      const result = await executeTranslationChain(subtitleContent, settings, confirmedBlueprint);

      // Send the final result (SRT string + sync suggestions) back to the frontend.
      return result;

    } catch (error) {
      server.log.error(error, 'Error in /execute controller');
      return reply.code(500).send({ error: 'An internal server error occurred during translation execution.' });
    }
  });
}
