// www/js/ai-worker.js
// Runs in a separate thread (Web Worker) so model loading + inference
// never blocks the main UI thread / app responsiveness.

import { pipeline, env } from '../libs/transformers/transformers.min.js';

// ---- Offline-only configuration ----
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.useBrowserCache = false;
env.backends.onnx.wasm.wasmPaths = '/libs/transformers/';
env.localModelPath = '/AI/models/';

// Caps WASM threads safely to protect lower-end mobile chipsets
env.backends.onnx.wasm.numThreads = Math.min(4, navigator.hardwareConcurrency || 2);

const MODEL_ID = 'distilbert-base-cased-distilled-squad';
const MAX_LOAD_RETRIES = 2;

// ---- Singleton model state ----
let answererPromise = null;
let modelReady = false;
let modelFailed = false;
let isCurrentlyLoading = false; // Guard lock against concurrent message collision races

/**
 * Instantiates the pipeline execution worker
 */
function loadModelWithProgress(onProgress) {
    return pipeline('question-answering', MODEL_ID, {
        dtype: 'q8',
        progress_callback: (data) => {
            if (onProgress) onProgress(data);
        }
    });
}

/**
 * Thread-safe resolution wrapper for the ONNX/Transformers model instance
 */
async function getAnswerer(onProgress) {
    // If already fully operational, hand back the working instance instantly
    if (modelReady && answererPromise) {
        return answererPromise;
    }
    
    // Guard against race conditions when a warmup and query arrive simultaneously
    if (isCurrentlyLoading && answererPromise) {
        return answererPromise;
    }

    isCurrentlyLoading = true;
    let attempt = 0;

    while (attempt <= MAX_LOAD_RETRIES) {
        try {
            // Assign execution instance to our shared memory slot
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

// ---- Safe standard-compliant message handling ----
self.addEventListener('message', async (event) => {
    const { id, type, question, context } = event.data;

    // Route A: Warmup Proactive Model Caching Actions
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

    // Route B: Context Query Search Executions (askAI)
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

        // Validate structure input parameters before passing to the model pipeline
        if (!question || !context) {
            throw new Error("Missing required 'question' or 'context' values inside payload parameters.");
        }

        const output = await answerer(question, context);

        self.postMessage({
            id,
            success: true,
            answer: output?.answer || "",
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
