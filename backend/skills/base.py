from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple

@dataclass
class SkillCardAction:
    label: str
    action: str  # e.g., 'send_message', 'open_modal', 'reverify', 'copy'
    payload: Dict[str, Any] = field(default_factory=dict)
    variant: str = "primary"  # 'primary', 'secondary', 'danger', 'outline'

@dataclass
class SkillCard:
    id: str
    type: str  # 'domain_audit', 'share_receipt', 'escalation_ticket', 'evidence_digest'
    title: str
    subtitle: str = ""
    badge: str = ""
    badge_variant: str = "cyan"  # 'cyan', 'amber', 'rose', 'emerald', 'purple'
    metrics: List[Dict[str, str]] = field(default_factory=list)  # e.g., [{"label": "Trust Score", "value": "95%"}]
    highlights: List[str] = field(default_factory=list)
    link_url: Optional[str] = None
    link_text: Optional[str] = None
    actions: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "type": self.type,
            "title": self.title,
            "subtitle": self.subtitle,
            "badge": self.badge,
            "badge_variant": self.badge_variant,
            "metrics": self.metrics,
            "highlights": self.highlights,
            "link_url": self.link_url,
            "link_text": self.link_text,
            "actions": self.actions,
        }

@dataclass
class SkillTriggerInfo:
    skill_name: str
    display_name: str
    reason: str
    confidence: float
    status: str = "executed"  # 'executed', 'skipped', 'fallback'
    summary: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "skill_name": self.skill_name,
            "display_name": self.display_name,
            "reason": self.reason,
            "confidence": round(self.confidence, 2),
            "status": self.status,
            "summary": self.summary,
        }

@dataclass
class SkillExecutionResult:
    status: str = "success"  # 'success', 'fallback', 'skipped', 'error'
    summary: str = ""
    data: Dict[str, Any] = field(default_factory=dict)
    cards: List[Dict[str, Any]] = field(default_factory=list)
    quick_replies: List[str] = field(default_factory=list)
    override_verdict_flow: bool = False
    session_updates: Dict[str, Any] = field(default_factory=dict)
    force_refresh: bool = False
    direct_message: Optional[str] = None
    triggered_skills: List[SkillTriggerInfo] = field(default_factory=list)

class BaseSkill:
    name: str = "base_skill"
    display_name: str = "Base Skill"
    description: str = "Base skill interface"
    trigger_keywords: List[str] = []

    def can_handle(self, query: str, context: Dict[str, Any], has_media: bool = False) -> Tuple[bool, float, str]:
        """
        Evaluates whether this skill should trigger.
        Returns: (can_handle: bool, confidence: float 0.0-1.0, reason: str)
        """
        raise NotImplementedError

    def execute(self, query: str, context: Dict[str, Any], session_data: Dict[str, Any], **kwargs) -> SkillExecutionResult:
        """
        Executes the skill's action and returns structured output.
        """
        raise NotImplementedError
