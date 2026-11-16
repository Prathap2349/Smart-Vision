import datetime
from typing import Dict, Any, Optional
from config import (
    ENABLE_SCHEDULED_PROFILES,
    NIGHT_START_HOUR,
    NIGHT_END_HOUR,
    NIGHT_DWELL_THRESHOLD,
    DAY_DWELL_THRESHOLD,
    ALERT_ON_UNVERIFIED_FACE,
)


class DecisionEngine:
    def get_current_schedule_profile(self) -> Dict[str, Any]:
        """
        Scheduled Sensitivity Profiles:
        Calculates time-of-day profile (NIGHT_STRICT vs DAY_STANDARD).
        """
        if not ENABLE_SCHEDULED_PROFILES:
            return {"name": "STANDARD", "dwell_threshold": DAY_DWELL_THRESHOLD}

        current_hour = datetime.datetime.now().hour
        is_night = (current_hour >= NIGHT_START_HOUR) or (current_hour < NIGHT_END_HOUR)

        if is_night:
            return {"name": "NIGHT_STRICT", "dwell_threshold": NIGHT_DWELL_THRESHOLD}
        else:
            return {"name": "DAY_STANDARD", "dwell_threshold": DAY_DWELL_THRESHOLD}

    def resolve_dwell_threshold(
        self,
        dwell_threshold: Optional[float] = None,
        profile: Optional[Dict[str, Any]] = None,
    ) -> float:
        """
        Dwell threshold precedence rule:
        1. Use explicit zone.dwell_threshold if set (not None), else use the active schedule profile threshold.
        2. At night (NIGHT_STRICT), enforce min(zone.dwell_threshold, night_threshold) so a permissive
           zone setting never weakens nighttime protection.
        """
        active_profile = profile or self.get_current_schedule_profile()
        profile_threshold = float(active_profile["dwell_threshold"])
        if dwell_threshold is None:
            return profile_threshold
        zone_val = float(dwell_threshold)
        if active_profile.get("name") == "NIGHT_STRICT":
            return min(zone_val, profile_threshold)
        return zone_val

    def evaluate_gates(
        self,
        is_human: bool = True,
        human_confidence: float = 0.0,
        dwell_seconds: float = 0.0,
        dwell_threshold: Optional[float] = None,
        face_status: str = "UNKNOWN",
        low_light_ir: bool = False,
        has_package: bool = False,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Evaluates the Triple-Gate Decision Engine Logic:
        - GATE 1: Human Presence & Confidence Threshold
        - GATE 2: Dwell / Loitering Threshold Duration
        - GATE 3: Biometric Identity Verification (Resident vs Unknown / Unverified Face)

        Returns Decision Dictionary with final_decision:
        SAFE_RESIDENT | MONITORING | VERIFIED_THREAT | UNVERIFIED_LOITERER | IDLE
        """
        # Support backward-compatible kwargs for human_conf or confidence
        if "human_conf" in kwargs and human_confidence == 0.0:
            human_confidence = float(kwargs["human_conf"])
        elif "confidence" in kwargs and human_confidence == 0.0:
            human_confidence = float(kwargs["confidence"])

        profile = self.get_current_schedule_profile()
        effective_threshold = self.resolve_dwell_threshold(dwell_threshold, profile)

        fast_mode_active = low_light_ir or (face_status in ["UNCLEAR", "LOW_LIGHT_IR"])
        is_known_resident = face_status in {"KNOWN", "VERIFIED_RESIDENT"}
        face_not_visible = face_status in {"NO_FACE", "LOW_QUALITY"}

        gate1_pass = is_human and (human_confidence >= 0.70)
        gate2_pass = dwell_seconds >= effective_threshold
        gate3_pass = (not is_known_resident) and (
            (face_status == "UNKNOWN")
            or fast_mode_active
            or (face_not_visible and ALERT_ON_UNVERIFIED_FACE)
        )

        # Package Carrying Sub-Classification
        detection_category = "Delivery / Package Carrying" if (has_package and gate1_pass) else "Unknown Person Loitering"

        if gate1_pass and is_known_resident:
            final_decision = "SAFE_RESIDENT"
            severity = "LOW"
        elif gate1_pass and gate2_pass and face_not_visible and ALERT_ON_UNVERIFIED_FACE:
            final_decision = "UNVERIFIED_LOITERER"
            severity = "HIGH"
        elif gate1_pass and gate2_pass and gate3_pass:
            final_decision = "VERIFIED_THREAT"
            severity = "CRITICAL"
        elif gate1_pass:
            final_decision = "MONITORING"
            severity = "LOW"
        else:
            final_decision = "IDLE"
            severity = "LOW"

        # Generate Explainable Plain-English Reasoning Summary
        if final_decision == "UNVERIFIED_LOITERER":
            reasoning = (
                f"⚠️ Unverified loiterer detected with face not visible ({face_status}). "
                f"Lingered in zone for {int(dwell_seconds)}s (threshold {int(effective_threshold)}s); "
                "no whitelisted resident was matched."
            )
        elif final_decision == "VERIFIED_THREAT":
            mode_str = "Two-Gate Fast Mode (Low Light IR)" if fast_mode_active else "Triple-Gate"
            reasoning = (
                f"🚨 [{mode_str}] {detection_category} detected with {int(human_confidence * 100)}% confidence. "
                f"Lingered in zone for {int(dwell_seconds)}s (exceeding {profile['name']} threshold of {int(effective_threshold)}s). "
                f"Face status: {face_status} (no whitelisted resident match)."
            )
        elif final_decision == "SAFE_RESIDENT":
            reasoning = f"✅ Known whitelisted resident detected ({face_status}). Alert suppressed."
        elif final_decision == "MONITORING":
            reasoning = f"👀 Human detected ({int(dwell_seconds)}s). Monitoring loitering threshold ({int(effective_threshold)}s)."
        else:
            reasoning = "ℹ️ No threat activity detected."

        if is_known_resident:
            gate3_label = "KNOWN RESIDENT"
        elif face_not_visible and gate3_pass:
            gate3_label = "FACE NOT VISIBLE — ALERT"
        elif face_not_visible:
            gate3_label = "FACE NOT VISIBLE"
        elif fast_mode_active:
            gate3_label = "FAST MODE (IR)"
        elif gate3_pass:
            gate3_label = "PASS (UNKNOWN)"
        else:
            gate3_label = "WAITING"

        return {
            "gate1_human": {
                "pass": gate1_pass,
                "confidence": human_confidence,
                "label": f"PASS ({int(human_confidence * 100)}%)" if gate1_pass else "NO HUMAN"
            },
            "gate2_dwell": {
                "pass": gate2_pass,
                "dwell_seconds": dwell_seconds,
                "threshold_seconds": effective_threshold,
                "label": f"PASS ({dwell_seconds}s)" if gate2_pass else f"{dwell_seconds}s / {effective_threshold}s"
            },
            "gate3_unknown": {
                "pass": gate3_pass,
                "face_status": face_status,
                "label": gate3_label
            },
            "active_profile": profile["name"],
            "fast_mode_fallback": fast_mode_active,
            "detection_category": detection_category,
            "severity": severity,
            "explainable_summary": reasoning,
            "final_decision": final_decision
        }


decision_engine = DecisionEngine()
