# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# readable release stack traces
-keepattributes SourceFile,LineNumberTable,Signature,InnerClasses,EnclosingMethod,*Annotation*,RuntimeVisibleAnnotations
-renamesourcefileattribute SourceFile

# LiteRT-LM: native code finds these classes by name through JNI
-keep class com.google.ai.edge.litertlm.** { *; }
-keepclasseswithmembernames class * { native <methods>; }
-dontwarn com.google.ai.edge.litertlm.**

# bridge between base and the dynamic module
-keep interface app.notefull.com.ILiteRTRuntime { *; }
-keep interface app.notefull.com.ILiteRTRuntime$* { *; }
-keep class app.notefull.com.ondevice_ai.** { *; }

# Kotlin metadata used by reflection-based libraries
-keep class kotlin.Metadata { *; }
