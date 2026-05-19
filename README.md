## Notefull (Android Branch)

Welcome to the official **Android branch** of Notefull.

This branch contains the source code for the native Android version of the app, built using Capacitor. It is directly linked to the Play Store release of Notefull.

---

## 📱 About This Branch

This repository is structured into two main branches:

* **main branch** → Web version of Notefull
* **android branch (this branch)** → Native Android app (Capacitor-based)

These branches are built on different platforms and may have different features, behaviors, and update cycles.

---

## 🔧 Migration Overview

With **Notefull v4 (Foundation Update)**, the app has undergone a major architectural transformation.

Previously, Notefull was essentially running the website directly inside a basic WebView wrapper, which resulted in limited capabilities and a less integrated app experience.

The app has now been migrated to a modern architecture using Capacitor.

This allows us to:

* Package web technologies (HTML, CSS, JavaScript) into a structured native app
* Access native device features directly
* Improve performance, stability, and responsiveness
* Enable full offline functionality

---

## 🚀 Key Benefits

* ⚡ Better performance and smoother experience
* 📱 Improved native integration and system behavior
* 🔌 Access to device features (system bars, lifecycle, etc.)
* 💾 Full offline support
* 🔓 Open-source availability
* 🔮 Scalable architecture for future updates

---

## 🔄 Platform Strategy

We aim to keep both the **web** and **Android** versions aligned in terms of core functionality.

However:

* Some features may be **Android-only** due to platform capabilities
* The web version is being optimized for **desktops and broader platform support**
* Adjustments are made to ensure better responsiveness across devices

---

## 🌐 Web App & PWA Support

The web version of Notefull supports installation as a Progressive Web App (PWA).

* Users can install Notefull directly from supported browsers
* This allows the app to run like a native application across platforms

> ⚠️ Note: PWA support depends on browser compatibility.
> It has been tested primarily on Google Chrome and may not be available on some older or unsupported browsers.

---

## ⚙️ Platform Potential

Capacitor also opens the possibility of extending Notefull to additional platforms in the future, including other mobile and desktop environments.

---

## 📱 Device Requirements

Notefull is designed to be lightweight and accessible:

* Works on most modern Android devices
* No specific hardware requirements
* App size may increase as you store more notes and lists

> ⚠️ Note: Devices running **Android versions below 7** may not support Notefull v4 (currently under development).

---

## ⚠️ Important Notes

* The Android and Web versions are now **separate platforms**
* Features and updates may differ between versions
* Some updates may be **Android-focused**

> Due to the architectural shift, major feature development is currently focused on the Android version.

---

## 📄 Changelog

You can view the full changelog here:
👉 [View Changelog](./changelog.md)

---

## 📌 Additional Notes

* This branch reflects the **production Android app**
* Updates here are directly related to Play Store releases
* Due to major internal changes, some updates may require data reset

---

## 🚀 What's Next

The **Foundation Update (Full Version)** will continue to evolve with:

* Stability improvements
* New features
* Better cross-platform consistency

---
