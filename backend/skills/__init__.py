try:
    from backend.skills.base import (
        BaseSkill,
        SkillExecutionResult,
        SkillTriggerInfo,
        SkillCard,
        SkillCardAction
    )
    from backend.skills.registry import skill_registry, SkillRegistry
except ImportError:
    from skills.base import (
        BaseSkill,
        SkillExecutionResult,
        SkillTriggerInfo,
        SkillCard,
        SkillCardAction
    )
    from skills.registry import skill_registry, SkillRegistry

__all__ = [
    "BaseSkill",
    "SkillExecutionResult",
    "SkillTriggerInfo",
    "SkillCard",
    "SkillCardAction",
    "skill_registry",
    "SkillRegistry"
]
