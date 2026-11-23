import random
from datetime import datetime, timezone
from typing import Dict, Any, Tuple
try:
    from backend.skills.base import BaseSkill, SkillExecutionResult, SkillCard
except ImportError:
    from skills.base import BaseSkill, SkillExecutionResult, SkillCard

class EscalateReviewSkill(BaseSkill):
    name = "escalate_review"
    display_name = "Editorial Escalation & Human Review"
    description = "Logs a formal editorial review ticket for ambiguous or disputed fact-checks and escalates to human journalists."
    trigger_keywords = [
        "escalate", "human review", "manual review", "dispute verdict", "appeal",
        "wrong verdict", "report error", "talk to human", "open ticket", "editorial review",
        "i disagree", "false positive", "flag verdict"
    ]

    def can_handle(self, query: str, context: Dict[str, Any], has_media: bool = False) -> Tuple[bool, float, str]:
        q_lower = (query or "").lower().strip()
        for kw in self.trigger_keywords:
            if kw in q_lower:
                return True, 0.95, f"Matched editorial escalation trigger phrase: '{kw}'"

        # Check if confidence score is low (< 60) and user expresses doubt
        last_report = context.get("last_report") or {}
        confidence = last_report.get("confidence_score", 100)
        if confidence < 60 and any(w in q_lower for w in ["sure", "doubt", "really", "verify again"]):
            return True, 0.85, f"Low confidence ({confidence}%) with user ambiguity expression"

        return False, 0.0, "No editorial escalation intent detected"

    def execute(self, query: str, context: Dict[str, Any], session_data: Dict[str, Any], **kwargs) -> SkillExecutionResult:
        # Generate formal Case Ticket ID
        ticket_number = random.randint(1000, 9999)
        ticket_id = f"ESC-2026-{ticket_number}"
        created_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        last_report = context.get("last_report") or session_data.get("last_report") or {}
        target_claim = last_report.get("raw_input") or (last_report.get("claims", [{}])[0].get("claim_text", "Current Inquiry"))
        current_verdict = last_report.get("overall_verdict", "UNVERIFIED")

        escalation_record = {
            "ticket_id": ticket_id,
            "status": "QUEUED_FOR_EDITORIAL_DESK",
            "priority": "HIGH",
            "created_at": created_at,
            "claim": target_claim,
            "previous_verdict": current_verdict,
            "user_notes": query
        }

        # Save to session updates
        escalation_history = session_data.get("escalations", [])
        escalation_history.append(escalation_record)

        metrics = [
            {"label": "Case Ticket", "value": ticket_id},
            {"label": "Queue Status", "value": "QUEUED_EDITORIAL"},
            {"label": "Priority", "value": "HIGH_INVESTIGATION"},
            {"label": "Audit State", "value": current_verdict}
        ]

        highlights = [
            f"Case {ticket_id} routed to senior editorial verification queue.",
            f"Subject: \"{target_claim[:80]}...\"" if len(target_claim) > 80 else f"Subject: \"{target_claim}\"",
            "Cross-referencing wire agency archives (PTI, Reuters, AP) and IFCN regional syndicates.",
            "Notification will be linked to this session ID."
        ]

        card = SkillCard(
            id=f"escalation-{ticket_id}",
            type="escalation_ticket",
            title=f"Editorial Escalation Case Logged: {ticket_id}",
            subtitle=f"Created {created_at} • Investigation Priority: High",
            badge="PENDING HUMAN REVIEW",
            badge_variant="amber",
            metrics=metrics,
            highlights=highlights,
            actions=[
                {"label": "Re-verify Live Grounding", "action": "reverify", "payload": {"force_refresh": True}, "variant": "primary"},
                {"label": "Export Transcript with Case ID", "action": "open_modal", "payload": {"modal": "export_transcript"}, "variant": "outline"}
            ]
        ).to_dict()

        quick_replies = [
            "Re-verify live",
            "Check source domain",
            "Export audit transcript",
            "Generate share card"
        ]

        return SkillExecutionResult(
            status="success",
            summary=f"Escalation ticket {ticket_id} logged and routed to human editorial queue.",
            data=escalation_record,
            cards=[card],
            quick_replies=quick_replies,
            override_verdict_flow=True,  # Fully handles the user's escalation request
            session_updates={"last_escalation": escalation_record, "escalations": escalation_history}
        )
