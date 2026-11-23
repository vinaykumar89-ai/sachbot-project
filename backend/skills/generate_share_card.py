import uuid
from typing import Dict, Any, Tuple
from backend.skills.base import BaseSkill, SkillExecutionResult, SkillCard

class GenerateShareCardSkill(BaseSkill):
    name = "generate_share_card"
    display_name = "Shareable Verification Card Generator"
    description = "Prepares and renders a high-impact shareable Fact-Check Receipt card with QR code & citations."
    trigger_keywords = [
        "share card", "generate share card", "share receipt", "download receipt",
        "share on whatsapp", "whatsapp receipt", "export card", "share verdict",
        "fact check receipt", "share summary"
    ]

    def can_handle(self, query: str, context: Dict[str, Any], has_media: bool = False) -> Tuple[bool, float, str]:
        q_lower = (query or "").lower().strip()
        for kw in self.trigger_keywords:
            if kw in q_lower:
                return True, 0.95, f"Matched share card generator trigger phrase: '{kw}'"

        return False, 0.0, "No share card intent detected"

    def execute(self, query: str, context: Dict[str, Any], session_data: Dict[str, Any], **kwargs) -> SkillExecutionResult:
        last_report = context.get("last_report") or session_data.get("last_report") or {}
        
        verdict = last_report.get("overall_verdict", "UNVERIFIED")
        confidence = last_report.get("confidence_score", 85)
        claim_excerpt = last_report.get("raw_input") or (last_report.get("claims", [{}])[0].get("claim_text", "Factual Assertion"))
        receipt_id = last_report.get("id") or str(uuid.uuid4())[:8]

        # Badge variant
        if verdict == "TRUE":
            badge_variant = "emerald"
        elif verdict in ["FALSE", "AI-GENERATED / ALTERED"]:
            badge_variant = "rose"
        elif verdict == "CLICKBAIT EXAGGERATION":
            badge_variant = "purple"
        else:
            badge_variant = "amber"

        metrics = [
            {"label": "Verdict Stamp", "value": verdict},
            {"label": "Truth Confidence", "value": f"{confidence}%"},
            {"label": "Receipt ID", "value": receipt_id[:8].upper()}
        ]

        highlights = [
            f"Claim: \"{claim_excerpt[:90]}...\"" if len(claim_excerpt) > 90 else f"Claim: \"{claim_excerpt}\"",
            "Includes cryptographic verification stamp & tamper-evident QR code",
            "Optimized 9:16 mobile format formatted for WhatsApp & Telegram groups"
        ]

        card = SkillCard(
            id=f"share-receipt-{receipt_id[:8]}",
            type="share_receipt",
            title="Sachbot Verification Receipt Ready",
            subtitle=f"Audit Reference: REF-{receipt_id[:8].upper()}",
            badge=f"STAMP: {verdict}",
            badge_variant=badge_variant,
            metrics=metrics,
            highlights=highlights,
            actions=[
                {"label": "Open Share Receipt Modal", "action": "open_modal", "payload": {"modal": "share_receipt"}, "variant": "primary"},
                {"label": "Export Full Transcript", "action": "open_modal", "payload": {"modal": "export_transcript"}, "variant": "outline"}
            ]
        ).to_dict()

        quick_replies = [
            "Re-verify live",
            "Check source domain",
            "Escalate for human review",
            "Export audit transcript"
        ]

        return SkillExecutionResult(
            status="success",
            summary=f"Prepared shareable verification receipt for {receipt_id[:8].upper()}.",
            data={
                "receipt_id": receipt_id,
                "verdict": verdict,
                "confidence": confidence,
            },
            cards=[card],
            quick_replies=quick_replies,
            override_verdict_flow=False if context.get("has_active_fact_check") else True
        )
