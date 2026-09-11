# Design Thinking: Ideate Stage Report
## Smart Vision Sentry — AI-Powered CCTV False-Alarm Elimination System

> [!NOTE]
> **Design Phase Document Disclaimer**: This report reflects the original design thinking and theoretical proposal evaluated during the initial project ideation phase. The shipped production prototype implements a custom **Lightweight IoU Tracker** and **Prototype Visual Feature Matcher (512-D Cosine Similarity)** in place of full ByteTrack/InsightFace weight packages for privacy, edge-computational efficiency, and real-time browser test capability.

### Project Context & Core Architecture
- **Problem Statement**: Standard PIR and pixel-motion CCTV alert systems generate 99+ false alarms per day due to environmental triggers (wind, foliage, shadows, lighting shifts). Residents mute notifications, destroying the real-time security value.
- **Chosen Baseline Solution**: A 3-Gate Edge AI Pipeline:
  1. **Gate 1 — YOLOv8 Human Detection**: Filters non-human motion (animals, shadows, wind).
  2. **Gate 2 — ByteTrack Dwell-Time Tracking**: Verifies loitering (>20 seconds) vs. normal transit.
  3. **Gate 3 — InsightFace Resident Whitelisting**: Compares face crop against stored resident embeddings to suppress alerts for known household members.
  - *Alert Rule*: An alarm fires **only** if all 3 gates pass (Human = True, Dwell > 20s, Face = UNKNOWN).

---

## 💡 Evaluation of 8 Solution Ideas vs. Chosen Triple-Gate Architecture

### Idea 1: Two-Gate "Fast Mode" (Human Detection + Dwell Time Only)
* **Technical Mechanism**: Bypasses Gate 3 (InsightFace recognition). Evaluates only Gate 1 (YOLOv8 Human) and Gate 2 (ByteTrack Dwell >20s).
* **Unsolved Problem / Edge-Case Handled**: Solves severe low-light/night-vision IR illumination failures where face features are washed out, blurred, or occluded. Reduces inference latency by ~40-50% and lowers edge hardware memory consumption.
* **Trade-Off / Weakness**: Loses the "known resident bypass." Whitelisted family members who linger in the corridor (e.g., tying shoes, searching for keys, talking on the phone) will trigger false alarms.
* **Recommendation**: **Combine as an Enhancement (Dynamic Fallback Mode)**.
  - *Why*: Automatically activate Fast Mode when ambient light drops below IR thresholds or when face crop resolution is too low (<48x48 px), while using full 3-Gate mode during daylight.

---

### Idea 2: Audio-Assisted Verification (Microphone + Acoustic Cues)
* **Technical Mechanism**: Integrates a directional microphone array to perform acoustic event classification (footsteps, voice activity, door clicks) concurrently with visual tracking.
* **Unsolved Problem / Edge-Case Handled**: Distinguishes visual motion artifacts (glass door reflections, headlight sweeps, moving tree shadows) from actual physical human presence.
* **Trade-Off / Weakness**: High environmental noise sensitivity (HVAC hum, street traffic, adjacent unit TVs), additional hardware cost ($15–$30 per node), and severe legal/privacy friction regarding audio recording in shared hallways.
* **Recommendation**: **Reject**.
  - *Why*: Severe privacy/wiretapping concerns in residential corridors. Corridor acoustic reverberation distorts sound signatures, whereas depth/thermal vision solves shadow artifacts far more reliably without privacy issues.

---

### Idea 3: Scheduled Sensitivity Profiles (Time-of-Day Adaptive Rules)
* **Technical Mechanism**: A time-based policy layer dynamically adjusts gate parameters (e.g., Night Mode [11 PM–6 AM]: Dwell threshold 10s, Face Gate optional; Delivery Window [10 AM–2 PM]: Dwell threshold 45s).
* **Unsolved Problem / Edge-Case Handled**: Cuts down false alarms during predictable, high-traffic periods (morning departure, mail delivery) while tightening threat sensitivity during vulnerable overnight hours.
* **Trade-Off / Weakness**: Rigid schedules fail when routine changes occur (delayed delivery, late-night family return, holiday shifts), risking either missed threats or surprise alerts.
* **Recommendation**: **Adopt / Combine**.
  - *Why*: Software-only implementation with zero compute overhead that directly aligns security posture with human living routines.

---

### Idea 4: Community/Household Confirmation Loop (Human-in-the-Loop Tiering)
* **Technical Mechanism**: Borderline events (e.g., Gate 1 & Gate 2 pass, but Gate 3 is UNCLEAR/PARTIAL due to a face mask or hat) trigger a low-priority interactive push notification ("Unknown person loitering for 22s: Is this a guest? [Dismiss / Verify]").
* **Unsolved Problem / Edge-Case Handled**: Handles real-world biometric edge cases (face masks, caps, dark sunglasses, turned heads) without binary false alarms or total security oversight.
* **Trade-Off / Weakness**: Relies on resident availability (delays if resident is sleeping/busy); risks user fatigue if ambiguous events occur frequently.
* **Recommendation**: **Adopt / Combine**.
  - *Why*: Essential UX bridge between rigid AI confidence scores and real-world human context. Prevents false alarms without ignoring suspicious activity.

---

### Idea 5: On-Device LLM / VLM Reasoning Layer (Local Vision-Language Model)
* **Technical Mechanism**: When fast gates produce ambiguous confidence scores, a quantized local Vision-Language Model (e.g., Moondream2, MobileVLM) is triggered on the cropped frame with a targeted zero-shot prompt ("Is this person delivering a package or attempting to open a door lock?").
* **Unsolved Problem / Edge-Case Handled**: Adds semantic context understanding that bounding boxes and feature vectors lack (e.g., distinguishing a delivery person dropping off a box vs. an intruder testing door handles).
* **Trade-Off / Weakness**: High edge compute/RAM footprint (requires 2GB+ RAM, adds 1–3s inference latency); potential visual hallucinations in small quantized models.
* **Recommendation**: **Combine as an Enhancement (Asynchronous Tier-2 Trigger)**.
  - *Why*: Execute VLM reasoning off the critical real-time path only for tier-2 ambiguous events to provide high-level semantic filtering.

---

### Idea 6: Package / Vehicle Sub-Classification
* **Technical Mechanism**: Expands YOLOv8 detection classes to include `package`, `delivery_box`, and `courier_uniform`.
* **Unsolved Problem / Edge-Case Handled**: Solves doorstep package theft and identifies delivery workers carrying parcels (suppressing false loitering alarms for legitimate couriers).
* **Trade-Off / Weakness**: Scope expansion beyond core human loitering; slightly increases object detector memory footprint.
* **Recommendation**: **Combine as an Enhancement**.
  - *Why*: High practical value for residential security with minimal computational overhead when using multi-class YOLOv8 model weights.

---

### Idea 7: Federated Household Whitelist Sharing (Multi-Unit Vector Synchronization)
* **Technical Mechanism**: Multi-tenant/hostel architecture where encrypted facial embeddings of shared building staff (cleaners, maintenance, security) are synchronized across neighboring unit edge nodes.
* **Unsolved Problem / Edge-Case Handled**: Eliminates redundant false alarms across 20+ units when building staff perform routine maintenance in shared corridors.
* **Trade-Off / Weakness**: Complex distributed synchronization, severe GDPR/biometric privacy risks if tenant data is shared across nodes without explicit central governance.
* **Recommendation**: **Reject (Defer to Centralized Building Admin)**.
  - *Why*: P2P federated biometric vector sharing creates severe legal and security vulnerabilities. Centralized admin whitelisting is safer.

---

### Idea 8: Explainable Alert Cards (Gate-by-Gate Plain-English Reasoning)
* **Technical Mechanism**: Formats alert payloads with structured gate evaluation telemetry and a generated plain-English summary (e.g., *"Gate 1: Human (97%) | Gate 2: Dwell 34s (>20s) | Gate 3: Unknown Face. Threat Level: CRITICAL"*).
* **Unsolved Problem / Edge-Case Handled**: Eliminates the "black-box AI" trust gap. Residents immediately understand *why* an alert fired, reducing panic and building confidence in system precision.
* **Trade-Off / Weakness**: Slight increase in payload size (~1KB).
* **Recommendation**: **Adopt / Combine**.
  - *Why*: Zero hardware cost, trivial software effort, massive improvement in user trust and operational transparency.

---

## 🏆 Top 2-3 Prototype Shortlist

1. **Scheduled Sensitivity Profiles + Confirmation Loop (Combined UX Layer)**:
   - *Justification*: Zero additional hardware cost, pure software enhancement. Solves time-based routine variations and ambiguous biometric edge cases (masks/hats) with human-in-the-loop validation.
2. **Two-Gate "Fast Mode" IR Fallback**:
   - *Justification*: Solves the primary technical failure point of face recognition (night-time IR lighting wash-out). Improves system resilience under adverse optical conditions.

---

## ⚠️ Self-Critical Technical Reality Check (Critique of Analysis)

1. **Edge VLM Latency Realism**: Claims that an On-Device VLM (Idea 5) runs in under 500ms on edge hardware (e.g., Raspberry Pi 4 / Jetson Nano) are unrealistically optimistic. Quantized 1B–3B parameter VLMs take 2–5 seconds per frame on edge accelerators, requiring asynchronous off-path execution.
2. **Corridor Acoustics Overhead**: Idea 2 assumes directional microphones can easily isolate footsteps in residential corridors. In reality, hard concrete/tiled walls cause severe acoustic reverberation, rendering simple audio classifiers unreliable without expensive multi-mic beamforming arrays.
3. **InsightFace Night IR Capability**: Standard RGB biometric face embedding models (InsightFace MobileFaceNet/ArcFace) degrade significantly under single-wavelength IR illumination unless specialized NIR-trained biometric models are deployed.

---

## 📊 Summary Table

| Idea | Status | Core Reason |
| :--- | :--- | :--- |
| **1. Two-Gate "Fast Mode"** | **Combined** | Essential dynamic fallback for night/IR low-light conditions when face matching fails. |
| **2. Audio-Assisted Verification** | **Rejected** | Severe hallway privacy/legal friction; acoustic reverberation causes high false triggers. |
| **3. Scheduled Sensitivity Profiles** | **Adopted** | Software-only win; aligns alert thresholds with time-of-day human activity patterns. |
| **4. Confirmation Loop** | **Adopted** | Bridges binary AI decision-making with human-in-the-loop validation for masked/obscured faces. |
| **5. On-Device LLM Reasoning** | **Combined** | Provides semantic context on tier-2 ambiguous events asynchronously without slowing fast path. |
| **6. Package Sub-Classification** | **Combined** | Solves doorstep delivery loitering false alarms with minimal YOLOv8 class head overhead. |
| **7. Federated Whitelist Sharing** | **Rejected** | P2P biometric vector sharing introduces severe privacy liabilities; use central admin instead. |
| **8. Explainable Alert Cards** | **Adopted** | Trivial to implement; eliminates black-box AI distrust by displaying clear gate reasoning. |
