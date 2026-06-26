cmake_minimum_required(VERSION 3.22.1)
project(llama-android)

set(CMAKE_CXX_STANDARD 17)
set(BUILD_SHARED_LIBS OFF)
# Add these size reduction optimizations at the top of your CMake file
set(CMAKE_BUILD_TYPE Release)
set(CMAKE_CXX_FLAGS_RELEASE "-Os -s -fvisibility=hidden -fdata-sections -ffunction-sections")
set(CMAKE_C_FLAGS_RELEASE "-Os -s -fvisibility=hidden -fdata-sections -ffunction-sections")
set(CMAKE_SHARED_LINKER_FLAGS "-Wl,--gc-sections -Wl,--strip-all")
set(GGML_METAL OFF CACHE INTERNAL "")
set(GGML_CUDA OFF CACHE INTERNAL "")
set(GGML_OPENCL OFF CACHE INTERNAL "")
set(GGML_VULKAN OFF CACHE INTERNAL "")
set(GGML_OPENMP OFF CACHE INTERNAL "")
set(GGML_BLAS OFF CACHE INTERNAL "")
set(LLAMA_CURL OFF CACHE INTERNAL "")


# Turn off things we don't need for an Android library to keep builds fast
set(LLAMA_BUILD_COMMON OFF CACHE INTERNAL "")
set(LLAMA_BUILD_TESTS OFF CACHE INTERNAL "")
set(LLAMA_BUILD_EXAMPLES OFF CACHE INTERNAL "")
set(LLAMA_BUILD_SERVER OFF CACHE INTERNAL "")
set(LLAMA_BUILD_TOOLS OFF CACHE INTERNAL "")

# Add llama.cpp as a subdirectory dependency 
add_subdirectory(llama.cpp)

# Define your bridge library code
add_library(llama-android SHARED ai_bridge.cpp)

# Link explicitly against llama, ggml, and standard Android logging tools
target_link_libraries(llama-android
    llama
    android
    log
)

# Clean header paths so you don't get 'File Not Found' compilation errors
target_include_directories(llama-android PRIVATE
    llama.cpp
    llama.cpp/include
)
