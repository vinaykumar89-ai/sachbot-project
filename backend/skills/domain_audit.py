import re
from typing import Dict, Any, Tuple, Optional
from backend.skills.base import BaseSkill, SkillExecutionResult, SkillCard
from backend.services.domain_checker import check_domain_reputation, extract_domain

URL_EXTRACT_REGEX = r'(https?://[^\s]+|[a-zA-Z0-9-]+\.(?:com|org|net|in|gov|io|co|xyz|news|ai|info|site|tv)[^\s]*)'

class DomainAuditSkill(BaseSkill):
    name = "domain_audit"
    display_name = "Domain Reputation & WHOIS Audit"
    description = "Audits domain registration age, satire registry status, and primary source credibility."
    trigger_keywords = [
        "check domain", "domain audit", "whois", "is this site real", "is this website real",
        "satire check", "domain age", "source credibility", "check website", "audit domain",
        "fake site", "lookalike domain"
    ]

    def _find_target_url(self, query: str, context: Dict[str, Any]) -> Optional[str]:
        # 1. URL from context
        if context.get("url"):
            return context["url"].strip()

        # 2. Extract from query text
        if query:
            match = re.search(URL_EXTRACT_REGEX, query)
            if match:
                found = match.group(0).strip("(),;'\"")
                if not found.startswith("http://") and not found.startswith("https://"):
                    found = f"https://{found}"
                return found

        # 3. Check session for last verified URL
        last_url = context.get("last_url")
        if last_url:
            return last_url

        return None

    def can_handle(self, query: str, context: Dict[str, Any], has_media: bool = False) -> Tuple[bool, float, str]:
        target_url = self._find_target_url(query, context)
        q_lower = (query or "").lower().strip()

        # Check explicit keywords
        for kw in self.trigger_keywords:
            if kw in q_lower:
                if target_url:
                    return True, 0.98, f"Detected domain audit intent '{kw}' for URL: {target_url}"
                return True, 0.85, f"Detected domain audit intent '{kw}'"

        # If query is JUST a URL or mostly a URL
        if target_url and (len(q_lower.split()) <= 2 or target_url.lower() in q_lower):
            return True, 0.80, f"Standalone URL detected: {target_url}"

        # If URL is in context along with text like "source" or "domain"
        if context.get("url") and any(w in q_lower for w in ["domain", "site", "source", "whois"]):
            return True, 0.90, "Context contains URL and query asks for source/domain check"

        return False, 0.0, "No domain audit intent detected"

    def execute(self, query: str, context: Dict[str, Any], session_data: Dict[str, Any], **kwargs) -> SkillExecutionResult:
        target_url = self._find_target_url(query, context)
        if not target_url:
            # Fallback card asking for URL
            card = SkillCard(
                id="domain-audit-missing-url",
                type="domain_audit",
                title="Domain Audit: URL Required",
                subtitle="Please specify or paste the website URL to inspect.",
                badge="INPUT NEEDED",
                badge_variant="amber",
                highlights=[
                    "Provide a news link, social media profile, or domain name (e.g., 'theonion.com' or 'bbc.com')",
                    "Sachbot will query RDAP registration age and verify against known satire and spoof registries."
                ],
                actions=[
                    {"label": "Audit TheOnion.com (Sample)", "action": "send_message", "payload": {"text": "check domain theonion.com"}},
                    {"label": "Audit PIB.gov.in (Sample)", "action": "send_message", "payload": {"text": "check domain pib.gov.in"}}
                ]
            ).to_dict()

            return SkillExecutionResult(
                status="fallback",
                summary="Domain audit skill paused: no target URL found in prompt or context.",
                cards=[card],
                quick_replies=["Audit theonion.com", "Audit pib.gov.in", "Re-verify live"]
            )

        # Run domain reputation audit
        rep = check_domain_reputation(target_url)
        domain = rep.get("domain", extract_domain(target_url))
        trust_score = rep.get("trust_score", 50)
        is_satire = rep.get("is_satire", False)
        is_trusted = rep.get("is_trusted", False)
        age_days = rep.get("domain_age_days")
        flags = rep.get("flags", [])

        # Choose badge
        if is_satire:
            badge = "KNOWN SATIRE / PARODY"
            badge_variant = "amber"
        elif is_trusted:
            badge = "VERIFIED PRIMARY / IFCN"
            badge_variant = "emerald"
        elif rep.get("is_newly_registered"):
            badge = "NEWLY REGISTERED (CAUTION)"
            badge_variant = "rose"
        else:
            badge = f"TRUST SCORE {trust_score}%"
            badge_variant = "cyan"

        metrics = [
            {"label": "Trust Score", "value": f"{trust_score}/100"},
            {"label": "Domain", "value": domain},
            {"label": "Category", "value": "Satire/Parody" if is_satire else "Primary Source" if is_trusted else "Standard Web"}
        ]

        if age_days is not None:
            age_str = f"{age_days // 365}y {age_days % 365}d" if age_days > 365 else f"{age_days} days"
            metrics.append({"label": "Domain Age", "value": age_str})

        highlights = []
        if is_satire:
            highlights.append(f"Originates from {rep.get('satire_name', 'established satire publisher')}. Stories are fictional satire.")
        if is_trusted:
            highlights.append(f"Official / IFCN recognized publisher: {rep.get('trusted_name', 'Primary Source')}.")
        for fl in flags:
            highlights.append(fl)
        if not highlights:
            highlights.append("Standard domain registration with no known malicious typosquatting tags.")

        card = SkillCard(
            id=f"domain-audit-{domain}",
            type="domain_audit",
            title=f"Domain Credibility Audit: {domain}",
            subtitle=f"Target URL: {target_url}",
            badge=badge,
            badge_variant=badge_variant,
            metrics=metrics,
            highlights=highlights,
            link_url=target_url,
            link_text="Visit Audited Source Link",
            actions=[
                {"label": "Verify Claims From This Link", "action": "send_message", "payload": {"url": target_url, "text": f"Verify claims in {target_url}"}},
                {"label": "Export Transcript", "action": "open_modal", "payload": {"modal": "export_transcript"}}
            ]
        ).to_dict()

        # Is this an isolated domain audit command, or does the user also want claim verification?
        is_isolated = any(w in query.lower() for w in ["check domain", "domain audit", "whois", "is this site real"])
        
        quick_replies = [
            f"Verify claims from {domain}",
            "Re-verify live",
            "Generate share card",
            "Export audit transcript"
        ]

        return SkillExecutionResult(
            status="success",
            summary=f"Domain audit completed for {domain}. Trust Score: {trust_score}%. Satire: {is_satire}.",
            data=rep,
            cards=[card],
            quick_replies=quick_replies,
            override_verdict_flow=is_isolated,  # If user just asked "check domain xyz", don't force full claim extraction
            session_updates={"last_audited_domain": domain, "last_url": target_url}
        )
