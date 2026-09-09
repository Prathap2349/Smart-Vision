from typing import Dict, Any

class DecisionEngine:
    def evaluate_gates(self, is_human: bool, human_conf: float, dwell_seconds: float, dwell_threshold: float, face_status: str) -> Dict[str, Any]:
        """
        Evaluates the 3-Gate Smart Vision Sentry Logic:
        Gate 1: Human Detected (Pass if is_human == True & human_conf >= threshold)
        Gate 2: Dwell > threshold (Pass if dwell_seconds >= dwell_threshold)
        Gate 3: Unknown Face (Pass if face_status == 'UNKNOWN')
        """
        gate1_pass = is_human and (human_conf >= 0.70)
        gate2_pass = dwell_seconds >= dwell_threshold
        gate3_pass = (face_status == "UNKNOWN")

        if gate1_pass and gate2_pass and gate3_pass:
            final_decision = "VERIFIED_THREAT"
        elif gate1_pass and (face_status == "KNOWN" or face_status == "VERIFIED_RESIDENT"):
            final_decision = "SAFE_RESIDENT"
        elif gate1_pass:
            final_decision = "MONITORING"
        else:
            final_decision = "IDLE"

        return {
            "gate1_human": {
                "pass": gate1_pass,
                "confidence": human_conf,
                "label": f"PASS ({int(human_conf * 100)}%)" if gate1_pass else "NO HUMAN"
            },
            "gate2_dwell": {
                "pass": gate2_pass,
                "dwell_seconds": dwell_seconds,
                "threshold_seconds": dwell_threshold,
                "label": f"PASS ({dwell_seconds}s)" if gate2_pass else f"{dwell_seconds}s / {dwell_threshold}s"
            },
            "gate3_unknown": {
                "pass": gate3_pass,
                "face_status": face_status,
                "label": "PASS (UNKNOWN)" if gate3_pass else "KNOWN RESIDENT"
            },
            "final_decision": final_decision
        }

decision_engine = DecisionEngine()
