// ===== PRODUCTION-READY TRANSLATION REPOSITORY =====
// This class encapsulates all data access logic for the translation feature.
// It interacts with MongoDB for job data and Pinecone for vector data.

// ===== IMPORTS & DEPENDENCIES =====
import { ObjectId } from 'mongodb';

// ===== REPOSITORY CLASS =====
/**
 * Manages all database interactions for translation jobs.
 * This class is designed to be instantiated with its dependencies (Dependency Injection),
 * making it testable and decoupled from the connection lifecycle.
 */
export class TranslationRepository {
  /**
   * @param {object} dependencies - The dependencies for this repository.
   * @param {import('mongodb').Db} dependencies.db - The connected MongoDB database instance.
   * @param {import('@pinecone-database/pinecone').Index} dependencies.vectorIndex - The Pinecone index instance.
   * @param {object} dependencies.logger - The Pino logger instance for contextual logging.
   */
  constructor({ db, vectorIndex, logger }) {
    this.db = db;
    this.jobsCollection = this.db.collection('translationJobs');
    this.vectorIndex = vectorIndex;
    this.logger = logger;
  }

  /**
   * Creates a new translation job document in the database.
   * @param {object} jobData - The initial data for the job.
   * @returns {Promise<import('mongodb').InsertOneResult>} The result from the insert operation.
   */
  async createJob(jobData) {
    const jobDocument = {
      ...jobData,
      status: 'processing_blueprint',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    try {
      this.logger.info({ jobData }, 'Creating new translation job document.');
      const result = await this.jobsCollection.insertOne(jobDocument);
      this.logger.info({ jobId: result.insertedId }, 'Successfully created translation job.');
      return result;
    } catch (error) {
      this.logger.error({ error, jobData }, 'Error creating translation job in database.');
      throw error; // Re-throw the error to be handled by the service layer.
    }
  }

  /**
   * Updates a job with the generated blueprint and sets its status.
   * @param {string} jobId - The ID of the job to update.
   * @param {object} blueprint - The generated translation blueprint.
   * @returns {Promise<import('mongodb').UpdateResult>} The result from the update operation.
   */
  async saveBlueprint(jobId, blueprint) {
    try {
      this.logger.info({ jobId }, 'Saving blueprint to database.');
      return this.jobsCollection.updateOne(
        { _id: new ObjectId(jobId) },
        {
          $set: {
            blueprint: blueprint,
            status: 'pending_approval',
            updatedAt: new Date(),
          },
        }
      );
    } catch (error) {
      this.logger.error({ error, jobId }, 'Error saving blueprint to database.');
      throw error;
    }
  }

  /**
   * Updates a job with the final translated SRT content.
   * @param {string} jobId - The ID of the job to update.
   * @param {string} finalSrt - The final, translated SRT string.
   * @returns {Promise<import('mongodb').UpdateResult>} The result from the update operation.
   */
  async saveFinalSrt(jobId, finalSrt) {
    try {
      this.logger.info({ jobId }, 'Saving final SRT to database.');
      return this.jobsCollection.updateOne(
        { _id: new ObjectId(jobId) },
        {
          $set: {
            finalSrt: finalSrt,
            status: 'complete',
            updatedAt: new Date(),
          },
        }
      );
    } catch (error) {
      this.logger.error({ error, jobId }, 'Error saving final SRT to database.');
      throw error;
    }
  }
  
  /**
   * (Placeholder) Upserts glossary term vectors into the Pinecone index.
   * @param {string} jobId - The ID of the job the glossary belongs to.
   * @param {Array<object>} glossary - The glossary to be vectorized and upserted.
   */
  async upsertGlossaryVectors(jobId, glossary) {
    this.logger.info({ jobId, glossaryCount: glossary.length }, 'Placeholder: Upserting glossary vectors to Pinecone.');
    // In a real implementation:
    // 1. Generate embeddings for each term in the glossary using an embedding model.
    // 2. Format the vectors in the structure Pinecone expects: { id, values, metadata }.
    // 3. Call `this.vectorIndex.upsert(vectors)`.
    // 4. Implement robust error handling for the upsert operation.
    return Promise.resolve();
  }

  /**
   * Retrieves a single job document by its ID.
   * @param {string} jobId - The ID of the job to retrieve.
   * @returns {Promise<import('mongodb').Document | null>} The job document or null if not found.
   */
  async getJobById(jobId) {
    try {
      this.logger.info({ jobId }, 'Fetching job by ID from database.');
      // Ensure we query by a valid ObjectId
      const job = await this.jobsCollection.findOne({ _id: new ObjectId(jobId) });
      if (!job) {
        this.logger.warn({ jobId }, 'Job not found in database.');
      }
      return job;
    } catch (error) {
      this.logger.error({ error, jobId }, 'Error fetching job from database.');
      throw error;
    }
  }
}
