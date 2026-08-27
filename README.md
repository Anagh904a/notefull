# Notefull

[![Platform: Android](https://img.shields.io/badge/Platform-Android-3DDC84?logo=android&logoColor=white)](https://play.google.com/store/apps/details?id=app.notefull.com)
[![Version: v8](https://img.shields.io/badge/Release-v8%20(Development)-6366f1)](#-whats-new-in-v8)
[![License: Open Source](https://img.shields.io/badge/License-Open%20Source-blue.svg)](LICENSE)
[![Zero Ads / No Tracking](https://img.shields.io/badge/Privacy-100%25%20Offline%20%26%20Ad--Free-success)](#-privacy--local-first)

Notefull is a fast, lightweight, and 100% open-source notes and lists app for Android. Built with a local-first philosophy: **no accounts, no cloud dependencies, no ads, and zero tracking**. Your data stays on your device.

---

## 📥 Download & Install

| Distribution Channel | Link / Status | Details |
| :--- | :--- | :--- |
| **Google Play Store** | [![Get it on Google Play](https://img.shields.io/badge/Google_Play-414141?logo=google-play&logoColor=white)](https://play.google.com/store/apps/details?id=app.notefull.com) | Official stable releases |
| **GitHub Releases** | [**Download Latest APK**](https://github.com/Anagh904a/Notefull/releases/latest) | Standalone direct APK install |
| **Beta Channel** | [**Download Beta APK**](https://github.com/Anagh904a/Notefull/releases) | Pre-release builds *(See AI note below)* |

> ⚠️ **Beta Build Note:** On-device AI search features are temporarily unavailable in current Beta builds while the underlying execution engine transitions to **Google LiteRT** for enhanced efficiency and speed.

---

## ✨ What's New in v8

The v8 release series focuses on local collaboration, networking foundations, and next-generation inference architectures:

* **P2P Networking Foundation:** Introduction of decentralized peer-to-peer (P2P) protocol layers designed for direct device-to-device synchronization without centralized cloud servers.
* **Shared Lists (Preview / UI Ready):** Complete interface support for collaborative list sharing. *(Currently under active development — backend synchronization logic is in progress, but the UI is fully accessible for testing and inspection).*
* **AI Engine Migration (LiteRT):** Ongoing architectural migration to Google's LiteRT runtime for faster model loading, reduced memory usage, and enhanced on-device inference.
* **UI & Performance Enhancements:** Smoother interactions, reduced baseline RAM footprint, and extensive stability fixes across note rendering.

---

## ⚡ Key Features

### 🤝 Shared Lists & P2P Foundation *(Under Development)*
Collaborate directly without giving away your personal data. 
* Uses a decentralized, peer-to-peer foundation to share checklists and task boards directly between devices.
* **Current Status:** The user interface code is fully designed and functional in the v8 codebase; network sync protocols are being actively refined.

### ⏰ Offline Reminders
Set precise notifications on any note or list item.
* Runs entirely through local Android system alarms.
* No accounts, push-notification servers, or background internet access required.
* *(Note: Delivery timing may vary slightly based on OEM battery optimization policies).*

### 🗑️ Trash & Recovery System
Accidentally deleted a critical note or list? 
* Dedicated recycle bin allows restoring deleted items with full formatting.
* Granular controls to restore individually, batch recover, or permanently purge items.

### 🤖 On-Device AI Natural Language Search *(Optional)*
Search your notes semantically using natural language (e.g., *"where did I save the WiFi password?"* or *"what tasks are due this Friday?"*).
* **100% Local & Private:** Inference runs exclusively on your device. Zero telemetry, zero external API calls, zero server processing.
* **Modular & Lightweight:** The base app excludes heavy AI binaries. The model is downloaded strictly on demand if you choose to activate it.
* **Completely Free:** No API keys, no subscription tiers, no usage caps.
* **Open Source Model:** Powered by the open-weights **Qwen 2.5 3B Instruct** model, utilizing local on-device runtimes.

---

## 📱 Hardware & Compatibility Requirements

| Component | Minimum Specification | Recommended Specification |
| :--- | :--- | :--- |
| **OS Version** | Android 7.0 (Nougat) | Android 10.0+ |
| **Base App Memory** | 300 MB RAM | 700 MB RAM |
| **Optional AI Features** | 2 GB RAM *(May experience latency)* | **4 GB+ RAM** |
| **Storage** | ~25 MB (Base app) | ~1 GB (With optional AI model) |

---

## 🛡️ Privacy & Security Principles

* **Zero Tracking:** No tracking SDKs, no behavioral telemetry, and no ad libraries.
* **Offline-First:** All notes, lists, and metadata are stored locally in SQLite on your device storage.
* **No Account Lock-In:** Open the app and start writing immediately. No logins, phone numbers, or passwords required.

---

## 🧑‍💻 About the Developer

Notefull is an independent, non-profit project engineered and maintained by **Anagh Manglick**, a Class 9 student solo developer (Age 14).

> *"Modern utility software has become bogged down by forced cloud logins, invasive telemetry, mandatory recurring subscriptions, and intrusive ads. Notefull is built to prove that productivity tools can remain private, performant, completely open-source, and user-first."*

---

## 🤝 Contributing & Community

Contributions, issue reports, and architecture discussions are warmly welcomed:

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

For bugs and feature requests, open an issue in the [GitHub Issues](https://github.com/Anagh904a/Notefull/issues) tracker.

---

## 📄 License

This project is licensed under the open-source **MIT License** (or Apache 2.0 where specified). Open-source models and external libraries remain under their respective licenses.
