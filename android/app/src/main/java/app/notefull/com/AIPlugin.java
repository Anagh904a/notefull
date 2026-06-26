package app.notefull.com;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AIPlugin")
public class AIPlugin extends Plugin {

    static {
        // Loads your compiled libllama-android.so library
        System.loadLibrary("llama-android");
    }

    // Connects Java to the C++ nativeHello function
    public native String nativeHello();

    @PluginMethod
    public void getNativeHello(PluginCall call) {
        try {
            // Call C++ and get the string
            String result = nativeHello();

            // Package it for JavaScript
            JSObject ret = new JSObject();
            ret.put("value", result);

            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Phase 1 Bridge Broken: " + e.getMessage());
        }
    }
}
