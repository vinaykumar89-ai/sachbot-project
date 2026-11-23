from typing import List, Dict, Any, Tuple, Optional
from backend.skills.base import (
    BaseSkill,
    SkillExecutionResult,
    SkillTriggerInfo
)
from backend.skills.reverify_live import ReverifyLiveSkill
from backend.skills.domain_audit import DomainAuditSkill
from backend.skills.generate_share_card import GenerateShareCardSkill
from backend.skills.escalate_review import EscalateReviewSkill

class SkillRegistry:
    def __init__(self):
        self._skills: Dict[str, BaseSkill] = {}
        self._register_default_skills()

    def register(self, skill: BaseSkill) -> None:
        self._skills[skill.name] = skill

    def get_skill(self, name: str) -> Optional[BaseSkill]:
        return self._skills.get(name)

    def list_skills(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": s.name,
                "display_name": s.display_name,
                "description": s.description,
                "keywords": s.trigger_keywords,
            }
            for s in self._skills.values()
        ]

    def _register_default_skills(self) -> None:
        self.register(ReverifyLiveSkill())
        self.register(DomainAuditSkill())
        self.register(GenerateShareCardSkill())
        self.register(EscalateReviewSkill())

    def route(
        self,
        query: str,
        context: Dict[str, Any],
        has_media: bool = False
    ) -> List[Tuple[BaseSkill, float, str]]:
        """
        Evaluates registered skills against query and context.
        Returns matching skills sorted by confidence descending.
        """
        matches: List[Tuple[BaseSkill, float, str]] = []
        for skill in self._skills.values():
            try:
                can_handle, conf, reason = skill.can_handle(query, context, has_media=has_media)
                if can_handle and conf > 0.0:
                    matches.append((skill, conf, reason))
            except Exception as e:
                print(f"Error evaluating skill {skill.name}: {e}")

        matches.sort(key=lambda x: x[1], reverse=True)
        return matches

    def execute_pipeline(
        self,
        query: str,
        context: Dict[str, Any],
        session_data: Dict[str, Any],
        has_media: bool = False
    ) -> SkillExecutionResult:
        """
        Finds and executes matched skills, returning aggregated triggers and results.
        """
        matches = self.route(query, context, has_media=has_media)
        triggered_info: List[SkillTriggerInfo] = []
        combined_result = SkillExecutionResult()

        if not matches:
            combined_result.triggered_skills = triggered_info
            return combined_result

        # Execute top matching skill(s) above threshold 0.70
        for skill, conf, reason in matches:
            if conf < 0.70:
                continue

            try:
                res = skill.execute(query, context, session_data)
                
                # Record trigger badge info
                trig = SkillTriggerInfo(
                    skill_name=skill.name,
                    display_name=skill.display_name,
                    reason=reason,
                    confidence=conf,
                    status=res.status,
                    summary=res.summary
                )
                triggered_info.append(trig)

                # Merge cards
                combined_result.cards.extend(res.cards)

                # Merge quick replies (deduplicate)
                for qr in res.quick_replies:
                    if qr not in combined_result.quick_replies:
                        combined_result.quick_replies.append(qr)

                # Merge session updates
                combined_result.session_updates.update(res.session_updates)

                # Flags
                if res.force_refresh:
                    combined_result.force_refresh = True
                if res.override_verdict_flow:
                    combined_result.override_verdict_flow = True
                if res.direct_message:
                    combined_result.direct_message = res.direct_message
                if res.summary and not combined_result.summary:
                    combined_result.summary = res.summary

                # If primary skill completely overrides flow, stop evaluating further skills
                if res.override_verdict_flow:
                    break
            except Exception as e:
                print(f"Skill execution exception in {skill.name}: {e}")
                triggered_info.append(
                    SkillTriggerInfo(
                        skill_name=skill.name,
                        display_name=skill.display_name,
                        reason=reason,
                        confidence=conf,
                        status="error",
                        summary=f"Execution error: {str(e)}"
                    )
                )

        combined_result.triggered_skills = triggered_info
        return combined_result

skill_registry = SkillRegistry()
