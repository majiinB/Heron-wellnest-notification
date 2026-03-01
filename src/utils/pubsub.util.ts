// publisher.ts
import pubSubClient from '../config/pubsub.config.js';
import { logger } from './logger.util.js';

/**
 * Publishes a message to the specified Pub/Sub topic.
 *
 * @param topicName - The name of the Pub/Sub topic to publish the message to.
 * @param payload - The payload object to be published as the message.
 * @returns A promise that resolves to the message ID of the published message.
 * @throws Will throw an error if publishing the message fails.
 */
export async function publishMessage(topicName: string, payload: object): Promise<string> {
  const dataBuffer = Buffer.from(JSON.stringify(payload));

  try {
    const messageId = await pubSubClient
      .topic(topicName)
      .publishMessage({ data: dataBuffer });

    logger.info(`✅ Message ${messageId} published to ${topicName}`);
    return messageId;
  } catch (error) {
    logger.error(`❌ Error publishing to ${topicName}:`, error);
    throw error;
  }
}
