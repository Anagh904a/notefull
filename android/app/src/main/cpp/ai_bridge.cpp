#include <jni.h>
#include <string>
#include <android/log.h>

#define LOG_TAG "LLAMA_NATIVE"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)

extern "C" {

JNIEXPORT jstring JNICALL
Java_app_notefull_com_AIPlugin_nativeHello(JNIEnv *env, jobject thiz) {
    // 1. Log to Android Logcat so we see it on the native side
    LOGI(">>> Phase 1: Native C++ function successfully reached! <<<");

    // 2. Return the test string back to Java
    std::string msg = "Hello from native C++ running llama.cpp!";
    return env->NewStringUTF(msg.c_str());
}

} // extern "C"
