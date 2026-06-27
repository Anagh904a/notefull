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
    if (model) { llama_model_free(model); model = nullptr; } // ← fixed

    const char *path = env->GetStringUTFChars(pathJ, nullptr);
    LOGI("Loading: %s", path);

    static bool backend_init = false;
    if (!backend_init) { llama_backend_init(); backend_init = true; }

    llama_model_params mp = llama_model_default_params();
    mp.n_gpu_layers = 0;

    model = llama_model_load_from_file(path, mp); // ← fixed
    env->ReleaseStringUTFChars(pathJ, path);
    if (!model) { LOGE("Model load failed"); return JNI_FALSE; }

    llama_context_params cp = llama_context_default_params();
    cp.n_ctx     = 2048;
    cp.n_threads = 4;
    cp.n_batch   = 512;
    // removed flash_attn — not in this version ← fixed

    ctx = llama_init_from_model(model, cp); // ← fixed
    if (!ctx) {
        LOGE("Context failed");
        llama_model_free(model); // ← fixed
        model = nullptr;
        return JNI_FALSE;
    }

    LOGI("Model ready!");
    return JNI_TRUE;
}

JNIEXPORT jstring JNICALL
Java_app_notefull_com_AIPlugin_nativeAsk(JNIEnv *env, jobject, jstring jprompt) {
    if (!model || !ctx) {
        LOGE("Model not loaded");
        return env->NewStringUTF("");
    }

    const char *prompt = env->GetStringUTFChars(jprompt, nullptr);
    const llama_vocab *vocab = llama_model_get_vocab(model);

    std::vector<llama_token> tokens(2048);
    int n = llama_tokenize(vocab, prompt, strlen(prompt), tokens.data(), 2048, true, true);
    tokens.resize(n);
    env->ReleaseStringUTFChars(jprompt, prompt);

    llama_memory_clear(llama_get_memory(ctx), true); // ← fixed

    llama_batch batch = llama_batch_get_one(tokens.data(), n);
    if (llama_decode(ctx, batch)) {
        LOGE("Decode failed");
        return env->NewStringUTF("");
    }

    llama_sampler *sampler = llama_sampler_chain_init(llama_sampler_chain_default_params());
    llama_sampler_chain_add(sampler, llama_sampler_init_temp(0.1f));
    llama_sampler_chain_add(sampler, llama_sampler_init_greedy());

    std::string result;
    result.reserve(512);
    for (int i = 0; i < 150; i++) {
        llama_token token = llama_sampler_sample(sampler, ctx, -1);
        if (llama_vocab_is_eog(vocab, token)) break;

        char buf[256] = {};
        llama_token_to_piece(vocab, token, buf, sizeof(buf), 0, true);
        result += buf;

        if (result.size() > 10 &&
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
    if (model) { llama_model_free(model); model = nullptr; } // ← fixed
    llama_backend_free();
    LOGI("Model freed");
}

} // extern "C"