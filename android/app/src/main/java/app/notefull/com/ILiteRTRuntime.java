package app.notefull.com;

public interface ILiteRTRuntime {
    void initAI(String modelPath, String backend, int ctx, Callback<Boolean> callback);
    void askAI(String prompt, boolean stream, boolean thinking, int maxTokens, int thinkBudget, StreamCallback callback);
    void stopAI();
    void releaseAI();
    boolean isInitialized();
    boolean isGenerating();
    void testAiBackends(String modelPath, BenchmarkCallback callback);
void resetConversation();
    interface Callback<T> {
        void onSuccess(T result);
        void onError(String error);
    }

    interface StreamCallback {
        void onToken(String token, String fullText, String thought);
        void onComplete(String response, String thinking);
        void onError(String error);
    }

    interface BenchmarkCallback {
        void onProgress(int percent);
        void onComplete(String bestBackend, long bestTimeMs, String rawResultsJson);
        void onError(String error);
    }
}