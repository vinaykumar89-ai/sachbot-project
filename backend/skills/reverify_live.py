import re
from typing import Dict, Any, Tuple
try:
    from backend.skills.base import BaseSkill, SkillExecutionResult, SkillCard
except ImportError:
    from skills.base import BaseSkill, SkillExecutionResult, SkillCard

class ReverifyLiveSkill(BaseSkill):
    name = "reverify_live"
    display_name = "Live Re-verification"
    description = "Bypasses cached verification and forces a live real-time web search grounding audit."
    trigger_keywords = [
        "reverify", "re-verify", "check again", "refresh check", "recheck",
        "live update", "bypass cache", "verify live", "fresh check", "re-check",
        "update check", "live verification"
    ]

    def can_handle(self, query: str, context: Dict[str, Any], has_media: bool = False) -> Tuple[bool, float, str]:
        # Explicit context flag from client
        if context.get("force_refresh") is True or str(context.get("force_refresh", "")).lower() == "true":
            return True, 1.0, "Explicit force_refresh flag received from client"

        q_lower = (query or "").lower().strip()
        if not q_lower:
            return False, 0.0, "Empty query"

        # Check keyword matches
        for kw in self.trigger_keywords:
            if kw in q_lower:
                return True, 0.95, f"Matched live re-verification trigger phrase: '{kw}'"

        return False, 0.0, "No re-verification intent detected"

    def execute(self, query: str, context: Dict[str, Any], session_data: Dict[str, Any], **kwargs) -> SkillExecutionResult:
        cards = [
            SkillCard(
                id="reverify-notice",
                type="reverify_notice",
                title="Live Grounding Mode Engaged",
                subtitle="Semantic cache bypassed. Executing fresh multi-agent search.",
                badge="LIVE GROUNDING",
                badge_variant="cyan",
                metrics=[
                    {"label": "Cache Mode", "value": "BYPASS_FORCED"},
                    {"label": "Search Index", "value": "REALTIME"}
                ],
                highlights=[
                    "Bypassed previously cached SQLite audit records",
                    "Querying live Google Search Grounding & certified fact-checkers",
                    "Refreshing timestamp & provenance signatures"
                ]
            ).to_dict()
        ]

        quick_replies = [
            "Check source domain",
            "Generate share card",
            "Escalate for human review",
            "Export audit transcript"
        ]

        return SkillExecutionResult(
            status="success",
            summary="Forced fresh search grounding bypassing semantic cache.",
            data={"cache_bypassed": True},
            cards=cards,
            quick_replies=quick_replies,
            override_verdict_flow=False,  # Still runs fact-checker with force_refresh=True
            force_refresh=True
        )
