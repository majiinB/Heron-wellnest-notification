import { PubSub } from '@google-cloud/pubsub';

/**
 * An instance of the PubSub client used for publishing and subscribing to messages
 * within the application. This client facilitates communication between different
 * services or components via a message broker.
 *
 * @remarks
 * Ensure that the PubSub client is properly configured before use.
 *
 * @see {@link https://cloud.google.com/pubsub/docs/reference/libraries}
 */
const pubSubClient = new PubSub();

export default pubSubClient;
