// www/js/ai-worker.js
// Runs in a separate thread (Web Worker) so model loading + inference
// never blocks the main UI thread / app responsiveness.
//
// IMPORTANT: model files are written via native Capacitor Filesystem
// (not bundled in www/, not Cache Storage), so this worker CANNOT use
// fixed '/AI/models/' style paths — those only resolve against www/
// content and will silently find nothing in native storage.
//
// The main thread must send an 'init' message with the real,
// Capacitor.convertFileSrc()-converted URLs BEFORE any warmup/ask
// message will work. See ai-worker-init.js for that step.

import { pipeline, env } from '../libs/transformers/transformers.min.js';

env.allowRemoteModels = false;
env.allowLocalModels = true;
env.useBrowserCache = false;

// Caps WASM threads safely to protect lower-end mobile chipsets
env.backends.onnx.wasm.numThreads = Math.min(4, navigator.hardwareConcurrency || 2);

const MODEL_ID = 'distilbert-base-cased-distilled-squad';
const MAX_LOAD_RETRIES = 2;

// ---- Singleton model state ----
let answererPromise = null;
let modelReady = false;
let modelFailed = false;
let isCurrentlyLoading = false; // guard against concurrent warmup/ask races
let initialized = false;

function loadModelWithProgress(onProgress) {
    return pipeline('question-answering', MODEL_ID, {
        dtype: 'q8',
        progress_callback: (data) => {
            if (onProgress) onProgress(data);
        }
    });
}

async function getAnswerer(onProgress) {
    if (modelReady && answererPromise) {
        return answererPromise;
    }

    if (isCurrentlyLoading && answererPromise) {
        return answererPromise;
    }

    isCurrentlyLoading = true;
    let attempt = 0;

    while (attempt <= MAX_LOAD_RETRIES) {
        try {
            answererPromise = loadModelWithProgress(onProgress);
            const result = await answererPromise;

            modelReady = true;
            isCurrentlyLoading = false;
            return result;
        } catch (err) {
            answererPromise = null;
            attempt++;

            if (onProgress) {
                onProgress({ status: 'retry', attempt, error: err.message || String(err) });
            }

            if (attempt > MAX_LOAD_RETRIES) {
                modelFailed = true;
                isCurrentlyLoading = false;
                throw err;
            }
        }
    }
}

self.addEventListener('message', async (event) => {
    const { id, type, question, context } = event.data;

    // ---- Route INIT: receive the real, converted native-storage URLs ----
    // Must be sent once, before anything else, after a successful download.
    if (type === 'init') {
        const { wasmDir, modelDir } = event.data;

        if (!wasmDir || !modelDir) {
            self.postMessage({ id, status: 'failed', error: 'init missing wasmDir/modelDir' });
            return;
        }

        env.backends.onnx.wasm.wasmPaths = wasmDir; // converted URL, trailing slash
        env.localModelPath = modelDir;               // converted URL, trailing slash

        initialized = true;
        self.postMessage({ id, status: 'initialized' });
        return;
    }

    if (!initialized) {
        self.postMessage({
            id,
            success: false,
            status: 'failed',
            error: 'Worker not initialized — send an "init" message with wasmDir/modelDir first.'
        });
        return;
    }

    // ---- Route A: warmup (proactive model loading) ----
    if (type === 'warmup') {
        if (modelReady) {
            self.postMessage({ id, status: 'ready', alreadyWarm: true });
            return;
        }
        if (modelFailed) {
            self.postMessage({ id, status: 'failed' });
            return;
        }
        try {
            await getAnswerer((progress) => {
                self.postMessage({ id, status: 'progress', progress });
            });
            self.postMessage({ id, status: 'ready' });
        } catch (err) {
            self.postMessage({ id, status: 'failed', error: err.message || String(err) });
        }
        return;
    }

    // ---- Route B: ask (answer a question against note/list content) ----
    try {
        const wasAlreadyWarm = modelReady;

        if (!wasAlreadyWarm && !modelFailed) {
            self.postMessage({ id, status: 'loading' });
        }

        const answerer = await getAnswerer((progress) => {
            self.postMessage({ id, status: 'progress', progress });
        });

        if (!wasAlreadyWarm) {
            self.postMessage({ id, status: 'ready' });
        }

        if (!question || !context) {
            throw new Error("Missing required 'question' or 'context' values in payload.");
        }

        const output = await answerer(question, context);

        self.postMessage({
            id,
            success: true,
            answer: output?.answer || '',
            score: output?.score || 0
        });

    } catch (err) {
        self.postMessage({
            id,
            success: false,
            error: err.message || String(err)
        });
    }
});