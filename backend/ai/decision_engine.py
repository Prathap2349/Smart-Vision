import datetime
from typing import Dict, Any, Optional
from config import (
    ENABLE_SCHEDULED_PROFILES,
    NIGHT_START_HOUR,
    NIGHT_END_HOUR,
    NIGHT_DWELL_THRESHOLD,
    DAY_DWELL_THRESHOLD
)

class DecisionEngine:
    def get_current_schedule_profile(self) -> Dict[str, Any]:
        """
        Idea 3: Scheduled Sensitivity Profiles.
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

    def evaluate_gates(
        self,
        is_human: bool,
        human_conf: float,
        dwell_seconds: float,
        dwell_threshold: Optional[float] = None,
        face_status: str = "UNKNOWN",
        low_light_ir: bool = False,
        has_package: bool = False
    ) -> Dict[str, Any]:
        """
        Evaluates the Smart Vision Sentry Logic with Ideate stage enhancements:
        - Idea 1: Two-Gate Fast Mode Fallback for low-light IR conditions
        - Idea 3: Scheduled Sensitivity Profiles (adaptive time-of-day loitering thresholds)
        - Idea 6: Package Carrying Sub-Classification
        - Idea 8: Explainable Alert Cards (Plain-English Reasoning Summary)
        """
        profile = self.get_current_schedule_profile()
        effective_threshold = dwell_threshold if dwell_threshold is not None else profile["dwell_threshold"]

        # Idea 1: Two-Gate Fast Mode IR Fallback
        fast_mode_active = low_light_ir or (face_status in ["UNCLEAR", "LOW_LIGHT_IR"])

        gate1_pass = is_human and (human_conf >= 0.70)
        gate2_pass = dwell_seconds >= effective_threshold
        gate3_pass = (face_status == "UNKNOWN") or fast_mode_active

        # Idea 6: Package Carrying Sub-Classification
        detection_category = "Delivery / Package Carrying" if (has_package and gate1_pass) else "Unknown Person Loitering"

        if gate1_pass and gate2_pass and gate3_pass:
            if face_status == "KNOWN" or face_status == "VERIFIED_RESIDENT":
                final_decision = "SAFE_RESIDENT"
            else:
                final_decision = "VERIFIED_THREAT"
        elif gate1_pass and (face_status in ["KNOWN", "VERIFIED_RESIDENT"]):
            final_decision = "SAFE_RESIDENT"
        elif gate1_pass:
            final_decision = "MONITORING"
        else:
            final_decision = "IDLE"

        # Idea 8: Generate Explainable Plain-English Reasoning Summary
        if final_decision == "VERIFIED_THREAT":
            mode_str = "Two-Gate Fast Mode (Low Light IR)" if fast_mode_active else "Triple-Gate"
            reasoning = (
                f"🚨 [{mode_str}] {detection_category} detected with {int(human_conf * 100)}% confidence. "
                f"Lingered in zone for {int(dwell_seconds)}s (exceeding {profile['name']} threshold of {int(effective_threshold)}s). "
                f"Face status: {face_status} (no whitelisted resident match)."
            )
        elif final_decision == "SAFE_RESIDENT":
            reasoning = f"✅ Known whitelisted resident detected ({face_status}). Alert suppressed."
        elif final_decision == "MONITORING":
            reasoning = f"👀 Human detected ({int(dwell_seconds)}s). Monitoring loitering threshold ({int(effective_threshold)}s)."
        else:
            reasoning = "ℹ️ No threat activity detected."

        return {
            "gate1_human": {
                "pass": gate1_pass,
                "confidence": human_conf,
                "label": f"PASS ({int(human_conf * 100)}%)" if gate1_pass else "NO HUMAN"
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
                "label": "FAST MODE (IR)" if fast_mode_active else ("PASS (UNKNOWN)" if gate3_pass else "KNOWN RESIDENT")
            },
            "active_profile": profile["name"],
            "fast_mode_fallback": fast_mode_active,
            "detection_category": detection_category,
            "explainable_summary": reasoning,
            "final_decision": final_decision
        }

decision_engine = DecisionEngine()

