// ===== IMPORTS & DEPENDENCIES =====
import { getDb } from '#lib/mongoClient.js';
import { getPineconeIndex } from '#lib/pineconeClient.js';
import { ObjectId } from 'mongodb';

// ===== REPOSITORY CLASS =====
class TranslationRepository {
  constructor() {
    this.jobsCollection = () => getDb().collection('translationJobs');
    this.vectorIndex = () => getPineconeIndex();
  }

  async createJob(jobData) {
    const jobDocument = {
      ...jobData,
      status: 'processing_blueprint',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return this.jobsCollection().insertOne(jobDocument);
  }

  async saveBlueprint(jobId, blueprint) {
    return this.jobsCollection().updateOne(
      { _id: new ObjectId(jobId) },
      {
        $set: {
          blueprint: blueprint,
          status: 'pending_approval',
          updatedAt: new Date(),
        },
      }
    );
  }

  async saveFinalSrt(jobId, finalSrt) {
    return this.jobsCollection().updateOne(
      { _id: new ObjectId(jobId) },
      {
        $set: {
          finalSrt: finalSrt,
          status: 'complete',
          updatedAt: new Date(),
        },
      }
    );
  }
  
  async upsertGlossaryVectors(jobId, glossary) {
    // This is a placeholder for the vector embedding and upsert logic.
    console.log('Placeholder: Upserting glossary vectors to Pinecone.', { jobId, glossaryCount: glossary.length });
  }
}

export const translationRepository = new TranslationRepository();
