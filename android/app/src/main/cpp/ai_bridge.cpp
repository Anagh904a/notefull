#include <jni.h>
#include <fstream>
#include <android/log.h>
#include <string>
#include <vector>
#include "llama.h"

#define LOG_TAG "LLAMA_NATIVE"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

extern "C" {

llama_model   *model = nullptr;
llama_context *ctx   = nullptr;

JNIEXPORT jboolean JNICALL
Java_app_notefull_com_AIPlugin_nativeLoadModel(JNIEnv *env, jobject, jstring pathJ) {
    if (!pathJ) { LOGE("Path null"); return JNI_FALSE; }

    if (ctx)   { llama_free(ctx);       ctx   = nullptr; }
    if (model) { llama_model_free(model); model = nullptr; }

    const char *path = env->GetStringUTFChars(pathJ, nullptr);
    LOGI("Loading: %s", path);

    static bool backend_init = false;
    if (!backend_init) { llama_backend_init(); backend_init = true; }

    llama_model_params mp = llama_model_default_params();
    mp.n_gpu_layers = 0;

    model = llama_model_load_from_file(path, mp);
    env->ReleaseStringUTFChars(pathJ, path);
    if (!model) { LOGE("Model load failed"); return JNI_FALSE; }

    llama_context_params cp = llama_context_default_params();
    cp.n_ctx     = 2048;
    cp.n_threads = 4;
    cp.n_threads_batch = 4;
    cp.n_batch   = 512;

    ctx = llama_init_from_model(model, cp);
    if (!ctx) {
        LOGE("Context failed");
        llama_model_free(model);
        model = nullptr;
        return JNI_FALSE;
    }

    LOGI("Model ready!");
    return JNI_TRUE;
}

JNIEXPORT jstring JNICALL
Java_app_notefull_com_AIPlugin_nativeAsk(JNIEnv *env, jobject, jstring jprompt,
                                         jboolean enableThinking, jboolean shortAnswer) {
    if (!model || !ctx) {
        LOGE("Model not loaded");
        return env->NewStringUTF("");
    }

    const char *promptRaw = env->GetStringUTFChars(jprompt, nullptr);
    std::string prompt(promptRaw);
    env->ReleaseStringUTFChars(jprompt, promptRaw);

    // Gemma 4 thinking is triggered by inserting <|think|> as the first thing
    // in the user turn. Only add it when the caller explicitly asked for it.
    if (enableThinking) {
        size_t pos = prompt.find("<start_of_turn>user\n");
        if (pos != std::string::npos) {
            prompt.insert(pos + strlen("<start_of_turn>user\n"), "<|think|>");
        }
    }

    const llama_vocab *vocab = llama_model_get_vocab(model);

    std::vector<llama_token> tokens(2048);
    int n = llama_tokenize(vocab, prompt.c_str(), prompt.size(), tokens.data(), 2048, true, true);
    tokens.resize(n);

    llama_memory_clear(llama_get_memory(ctx), true);

    llama_batch batch = llama_batch_get_one(tokens.data(), n);
    if (llama_decode(ctx, batch)) {
        LOGE("Decode failed");
        return env->NewStringUTF("");
    }

    llama_sampler *sampler = llama_sampler_chain_init(llama_sampler_chain_default_params());
    llama_sampler_chain_add(sampler, llama_sampler_init_greedy());

    std::string result;
    result.reserve(1024); // bigger reserve — full note rewrites can be long

    // Token budget: thinking mode needs the most room for its reasoning pass,
    // shortAnswer caps things tight for fast factual replies,
    // otherwise (full note correct/summarize) gets a generous cap.
    int maxTokens = enableThinking ? 300 : (shortAnswer ? 80 : 600);

    for (int i = 0; i < maxTokens; i++) {
        llama_token token = llama_sampler_sample(sampler, ctx, -1);
        if (llama_vocab_is_eog(vocab, token)) break;

        char buf[256] = {};
        llama_token_to_piece(vocab, token, buf, sizeof(buf), 0, true);
        result += buf;

        // Only cut at the first sentence when shortAnswer is true —
        // full rewrites (correctNote/summarizeNote) must not be truncated this way
        if (shortAnswer && result.size() > 10 &&
            (result.back() == '.' ||
             result.back() == '!' ||
             result.back() == '?')) break;

        llama_batch next = llama_batch_get_one(&token, 1);
        if (llama_decode(ctx, next)) break;
    }

    llama_sampler_free(sampler);
    LOGI("Done: %s", result.c_str());
    return env->NewStringUTF(result.c_str());
}

JNIEXPORT void JNICALL
Java_app_notefull_com_AIPlugin_nativeDeLoadModel(JNIEnv *env, jobject) {
if (ctx)   { llama_free(ctx);         ctx   = nullptr; }
if (model) { llama_model_free(model); model = nullptr; }
llama_backend_free();
LOGI("Model freed");
}

} // extern "C"