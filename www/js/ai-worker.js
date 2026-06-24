// www/js/ai-worker.js
// Runs in a separate thread (Web Worker) so model loading + inference
// never blocks the main UI thread / app responsiveness.
//
// IMPORTANT: transformers.min.js AND the model files now live in native
// Capacitor Filesystem storage (downloaded at runtime), not bundled in
// www/. A static `import ... from '../libs/transformers/transformers.min.js'`
// cannot reach native storage at all — it would silently crash the worker
// before it ever registers a message listener.
//
// Fix: load transformers.min.js via a DYNAMIC import(), using the real
// converted URL sent by the main thread in the 'init' message. Nothing
// model-related happens until that dynamic import resolves.

let pipeline, env;
let libLoaded = false;
let memoryFiles = {};

const MODEL_ID = 'distilbert-base-cased-distilled-squad';
const MAX_LOAD_RETRIES = 2;

let answererPromise = null;
let modelReady = false;
let modelFailed = false;
let isCurrentlyLoading = false;
let initialized = false;

function loadModelWithProgress(onProgress) {
return pipeline('question-answering', MODEL_ID, {
    dtype: 'q8',
    model_file_name: 'model',
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
    console.log('worker received:', event.data)

    // ---- Route INIT: dynamically load the library, then configure paths ----
    if (type === 'init') {
const { wasmDir, modelDir, libUrl, configFiles } = event.data;
memoryFiles = configFiles || {};
        if (!wasmDir || !modelDir || !libUrl) {
            self.postMessage({ id, status: 'failed', error: 'init missing wasmDir/modelDir/libUrl' });
            return;
        }
        

        try {
          if (!libLoaded) {
const mod = await import(
    /* webpackIgnore: true */
    `${libUrl}?t=${Date.now()}`
);
    pipeline = mod.pipeline;
    env = mod.env;

    env.allowRemoteModels = false;
    env.allowLocalModels = true;
    env.useBrowserCache = false;
    env.backends.onnx.wasm.numThreads = 1; // force single-thread

    // Intercept ALL fetches from this point forward — catches tokenizer loading
const originalFetch = self.fetch || fetch;

self.fetch = async (...args) => {

    const url =
        typeof args[0] === 'string'
            ? args[0]
            : args[0]?.url || '';

    const filename =
        url.split('?')[0].split('/').pop();

    // Serve tokenizer/config files from memory
    if (memoryFiles[filename]) {

        console.log('[MEMORY FILE]', filename);

        return new Response(
            memoryFiles[filename],
            {
                status: 200,
                headers: {
                    'Content-Type':
                        filename.endsWith('.json')
                            ? 'application/json'
                            : 'text/plain'
                }
            }
        );
    }

    console.log('[NETWORK FETCH]', url);

    return originalFetch(...args);
};

    libLoaded = true;
}

env.backends.onnx.wasm.wasmPaths = wasmDir;
env.localModelPath = modelDir;
console.log('modelDir =', modelDir);

            initialized = true;
            self.postMessage({ id, status: 'initialized' });

        } catch (err) {
            self.postMessage({
                id,
                status: 'failed',
                error: 'Failed to dynamically load transformers.min.js: ' + (err.message || String(err))
            });
        }
        return;
    }

    if (!initialized) {
        self.postMessage({
            id,
            success: false,
            status: 'failed',
            error: 'Worker not initialized — send an "init" message with wasmDir/modelDir/libUrl first.'
        });
        return;
    }

console.log('[WORKER] proceeding to ask/warmup logic, type:', type);  // ← THIS line, inside ai-worker.js
    
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
        console.log('answerer:', answerer);
console.log('tokenizer:', answerer.tokenizer);
console.log('processor:', answerer.processor);
console.log('model:', answerer.model);

        if (!wasAlreadyWarm) {
            self.postMessage({ id, status: 'ready' });
        }

        if (!question || !context) {
            throw new Error("Missing required 'question' or 'context' values in payload.");
        }

      console.log('[WORKER] about to call answerer with:', question, context);  // ← add this too
const testOutput = await answerer("When is the meeting?", "Meeting with Vikas at 9pm tomorrow.");
console.log('[WORKER] TEST answerer returned:', testOutput);

const output = await answerer(question, context);
console.log('[WORKER] answerer returned:', output);

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