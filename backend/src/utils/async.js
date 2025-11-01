// ===== PRODUCTION-READY ASYNC UTILITY =====

/**
 * Executes a promise-based function in the background without awaiting its completion.
 * It logs the outcome (success or failure) using the provided logger.
 * @param {Promise<any>} promiseFn - A function that returns the promise to execute.
 * @param {object} logger - The contextual logger to use for logging the outcome.
 * @param {string} taskName - A descriptive name for the task for logging purposes.
 */
export function runInBackground(promiseFn, logger, taskName) {
  logger.info(`Starting background task: ${taskName}`);
  Promise.resolve(promiseFn())
    .then(() => {
      logger.info(`Background task completed successfully: ${taskName}`);
    })
    .catch((err) => {
      logger.error({ err }, `Background task failed: ${taskName}`);
    });
}
