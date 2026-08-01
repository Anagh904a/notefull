cmake_minimum_required(VERSION 3.22.1)
project(llama-android)

set(CMAKE_CXX_STANDARD 17)
set(BUILD_SHARED_LIBS OFF)
set(CMAKE_BUILD_TYPE Release)

# SPEED-FIRST flags — -O3 for max optimization, keep dead-code stripping for size hygiene
set(CMAKE_CXX_FLAGS_RELEASE "-O3 -DNDEBUG -fvisibility=hidden -fdata-sections -ffunction-sections")
set(CMAKE_C_FLAGS_RELEASE "-O3 -DNDEBUG -fvisibility=hidden -fdata-sections -ffunction-sections")
set(CMAKE_SHARED_LINKER_FLAGS "-Wl,--gc-sections -Wl,--strip-all")

# Target ARM's quantized-math acceleration explicitly — this is likely your biggest single win
set(GGML_NATIVE OFF CACHE INTERNAL "")   # OFF for cross-compiling — "native" would target the build machine, not the phone
set(GGML_CPU_ARM_ARCH "armv8.2-a+dotprod+i8mm" CACHE INTERNAL "")

set(GGML_METAL OFF CACHE INTERNAL "")
set(GGML_CUDA OFF CACHE INTERNAL "")
set(GGML_OPENCL OFF CACHE INTERNAL "")
set(GGML_VULKAN OFF CACHE INTERNAL "")
set(GGML_OPENMP ON CACHE INTERNAL "")    # ← turned back ON — re-test; this may restore threading you didn't know you lost
set(GGML_BLAS OFF CACHE INTERNAL "")
set(LLAMA_CURL OFF CACHE INTERNAL "")

set(LLAMA_BUILD_COMMON OFF CACHE INTERNAL "")
set(LLAMA_BUILD_TESTS OFF CACHE INTERNAL "")
set(LLAMA_BUILD_EXAMPLES OFF CACHE INTERNAL "")
set(LLAMA_BUILD_SERVER OFF CACHE INTERNAL "")
set(LLAMA_BUILD_TOOLS OFF CACHE INTERNAL "")

add_subdirectory(llama.cpp)

add_library(llama-android SHARED ai_bridge.cpp)

target_link_libraries(llama-android
    llama
    android
    log
)

target_include_directories(llama-android PRIVATE
    llama.cpp
    llama.cpp/include
)