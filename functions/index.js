/**
 * Optional Firebase Cloud Functions entry point.
 *
 * This wraps the exact same Express app used by the local Node server
 * (server/app.js) so the two stay perfectly in sync.
 *
 * IMPORTANT STORAGE CAVEAT
 * -------------------------
 * This project stores its data (doctors, cases, questionnaire responses)
 * as local JSON files on disk (see /data and server/lib/store.js). That is
 * exactly what the project spec asked for, and it works perfectly when you
 * run the app with `npm start` on your own machine or any regular server /
 * VM with a persistent disk.
 *
 * Cloud Functions instances, however, only offer EPHEMERAL storage - any
 * file written to disk can disappear the moment the instance is recycled.
 * That means if you deploy this app as a plain Cloud Function, doctors'
 * saved answers can be lost between requests.
 *
 * Recommended options, in order of how well they match this project:
 *   1. Run the Node server as-is (npm start) on your own machine, a VM,
 *      or any host with a persistent disk. This is what the project was
 *      built for and is the safest choice for the local-file storage
 *      requirement.
 *   2. Deploy to Firebase App Hosting, which runs a real persistent Node
 *      backend (Cloud Run under the hood) rather than short-lived
 *      Functions - see the README for a short walkthrough.
 *   3. Use this Cloud Functions + Hosting setup for a quick public demo
 *      only, understanding that data may not persist reliably.
 */

const functions = require('firebase-functions');
const app = require('../server/app');

exports.api = functions.https.onRequest(app);
