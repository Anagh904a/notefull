package app.notefull.com;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "AIPlugin")
public class AIPlugin extends Plugin {

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    static { System.loadLibrary("llama-android"); }

    public native boolean nativeLoadModel(String path);
    public native String  nativeAsk(String prompt);
    public native void    nativeDeLoadModel();

    @PluginMethod
    public void loadModel(PluginCall call) {
        String path = call.getString("path");
        if (path == null) { call.reject("path required"); return; }
        executor.execute(() -> {
            try {
                if (nativeLoadModel(path)) { call.resolve(); }
                else { call.reject("Model load failed"); }
            } catch (Exception e) { call.reject(e.getMessage()); }
        });
    }

    @PluginMethod
    public void ask(PluginCall call) {
        String prompt = call.getString("prompt");
        if (prompt == null) { call.reject("prompt required"); return; }

        JSObject thinking = new JSObject();
        thinking.put("status", "thinking");
        notifyListeners("aiStatus", thinking);

        executor.execute(() -> {
            try {
                String answer = nativeAsk(prompt);

                JSObject done = new JSObject();
                done.put("status", "done");
                notifyListeners("aiStatus", done);

                JSObject ret = new JSObject();
                ret.put("answer", answer);
                call.resolve(ret);
            } catch (Exception e) { call.reject(e.getMessage()); }
        });
    }

    @PluginMethod
    public void deLoadModel(PluginCall call) {
        executor.execute(() -> {
            try { nativeDeLoadModel(); call.resolve(); }
            catch (Exception e) { call.reject(e.getMessage()); }
        });
    }
}