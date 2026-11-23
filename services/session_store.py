import os
import json
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

class SessionStore:
    def __init__(self):
        # In-memory dictionary mapped by session_id with fallback persistence to JSON if needed
        self._sessions: Dict[str, Dict[str, Any]] = {}

    def get_or_create_session(self, session_id: Optional[str] = None) -> Dict[str, Any]:
        now_iso = datetime.now(timezone.utc).isoformat()
        if not session_id or session_id not in self._sessions:
            new_id = session_id or f"sess_{uuid.uuid4().hex[:12]}"
            self._sessions[new_id] = {
                "session_id": new_id,
                "created_at": now_iso,
                "updated_at": now_iso,
                "messages": [],
                "context": {
                    "language": "auto",
                    "active_view": "chat",
                    "last_verdict_id": None,
                    "last_report": None,
                    "escalations": [],
                }
            }
            return self._sessions[new_id]
        return self._sessions[session_id]

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        return self._sessions.get(session_id)

    def append_message(self, session_id: str, role: str, content: str, **kwargs) -> Dict[str, Any]:
        session = self.get_or_create_session(session_id)
        msg_id = f"msg_{uuid.uuid4().hex[:8]}"
        now_iso = datetime.now(timezone.utc).isoformat()

        message = {
            "id": msg_id,
            "role": role,  # 'user' or 'assistant'
            "content": content,
            "timestamp": now_iso,
            "input_type": kwargs.get("input_type", "text"),
            "url": kwargs.get("url"),
            "image_path": kwargs.get("image_path"),
            "cropped_image_path": kwargs.get("cropped_image_path"),
            "verdict_data": kwargs.get("verdict_data"),
            "triggered_skills": kwargs.get("triggered_skills", []),
            "cards": kwargs.get("cards", []),
            "quick_replies": kwargs.get("quick_replies", []),
            "audit_log": kwargs.get("audit_log", [])
        }

        session["messages"].append(message)
        session["updated_at"] = now_iso

        # Update context shortcuts
        if kwargs.get("verdict_data"):
            session["context"]["last_verdict_id"] = kwargs["verdict_data"].get("id")
            session["context"]["last_report"] = kwargs["verdict_data"]

        return message

    def update_context(self, session_id: str, updates: Dict[str, Any]) -> None:
        session = self.get_or_create_session(session_id)
        session["context"].update(updates)
        session["updated_at"] = datetime.now(timezone.utc).isoformat()

    def export_transcript(self, session_id: str, format_type: str = "md", include_audit: bool = True) -> Dict[str, Any]:
        """
        Exports the full session transcript into markdown (.md), json (.json), or text (.txt).
        Returns: {"filename": str, "content_type": str, "content": str}
        """
        session = self.get_or_create_session(session_id)
        messages = session.get("messages", [])
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        sess_short = session_id[:12]

        if format_type.lower() == "json":
            export_payload = {
                "session_id": session_id,
                "exported_at": now_str,
                "app": "Sachbot Multimodal Autonomous AI Fact-Checker",
                "version": "2.0.0",
                "total_messages": len(messages),
                "context": session.get("context", {}),
                "messages": [
                    {
                        "id": m["id"],
                        "role": m["role"],
                        "content": m["content"],
                        "timestamp": m["timestamp"],
                        "triggered_skills": m.get("triggered_skills", []),
                        "cards": m.get("cards", []),
                        "quick_replies": m.get("quick_replies", []),
                        "verdict": m.get("verdict_data", {}).get("overall_verdict") if m.get("verdict_data") else None,
                        "confidence_score": m.get("verdict_data", {}).get("confidence_score") if m.get("verdict_data") else None,
                        "actual_fact": m.get("verdict_data", {}).get("actual_fact") if m.get("verdict_data") else None,
                        "viewer_correction": m.get("verdict_data", {}).get("viewer_correction") if m.get("verdict_data") else None,
                        "fetched_image_data": m.get("verdict_data", {}).get("fetched_image_data") if m.get("verdict_data") else None,
                        "image_origin_metadata": m.get("verdict_data", {}).get("image_origin_metadata") if m.get("verdict_data") else None,
                        "audit_log": m.get("audit_log", []) if include_audit else []
                    }
                    for m in messages
                ]
            }
            return {
                "filename": f"sachbot_transcript_{sess_short}.json",
                "content_type": "application/json",
                "content": json.dumps(export_payload, indent=2)
            }

        elif format_type.lower() in ["txt", "text"]:
            lines = [
                "================================================================================",
                "               SACHBOT MULTIMODAL AI FACT-CHECKING TRANSCRIPT                  ",
                "================================================================================",
                f"Session ID : {session_id}",
                f"Exported At: {now_str}",
                f"Turns Count: {len(messages)} messages",
                "--------------------------------------------------------------------------------",
                ""
            ]

            for idx, m in enumerate(messages, 1):
                role_label = "USER INVESTIGATOR" if m["role"] == "user" else "SACHBOT AI VERIFIER"
                time_label = m["timestamp"].split("T")[1][:8] if "T" in m["timestamp"] else m["timestamp"]
                lines.append(f"[{idx}] {role_label} @ {time_label}")
                lines.append("-" * 40)
                if m.get("content"):
                    lines.append(f"{m['content']}")
                if m.get("url"):
                    lines.append(f"Attached URL: {m['url']}")
                if m.get("image_path"):
                    lines.append(f"Attached Media: {m['image_path']}")

                # Triggered skills
                if m.get("triggered_skills"):
                    skills_str = ", ".join([s.get("display_name", s.get("skill_name", "")) for s in m["triggered_skills"]])
                    lines.append(f">> Triggered Skills: {skills_str}")

                # Verdict details
                if m.get("verdict_data"):
                    vd = m["verdict_data"]
                    lines.append(f">> VERDICT STAMP : {vd.get('overall_verdict')} ({vd.get('confidence_score', 0)}% Confidence)")
                    lines.append(f">> FINDINGS      : {vd.get('summary_explanation', '')}")
                    if vd.get("actual_fact"):
                        lines.append(f">> ACTUAL FACT   : {vd.get('actual_fact')}")
                    if vd.get("fetched_image_data") and vd["fetched_image_data"].get("has_image_data"):
                        fid = vd["fetched_image_data"]
                        lines.append(">> FETCHED IMAGE DATA:")
                        if fid.get("extracted_text"):
                            lines.append(f"   • Extracted Text : {fid.get('extracted_text')}")
                        if fid.get("depicted_subject"):
                            lines.append(f"   • Subject        : {fid.get('depicted_subject')}")
                        if fid.get("watermark_or_source"):
                            lines.append(f"   • Watermark/Brand: {fid.get('watermark_or_source')}")
                    if vd.get("image_origin_metadata") and vd["image_origin_metadata"].get("has_origin_data"):
                        iom = vd["image_origin_metadata"]
                        lines.append(">> IMAGE ORIGIN & PROVENANCE:")
                        if iom.get("captured_date"):
                            lines.append(f"   • Date/Timestamp : {iom.get('captured_date')}")
                        if iom.get("by_whom"):
                            lines.append(f"   • By Whom / Author: {iom.get('by_whom')}")
                        if iom.get("camera_or_device"):
                            lines.append(f"   • Camera/Device  : {iom.get('camera_or_device')}")
                        if iom.get("dimensions"):
                            lines.append(f"   • Dimensions     : {iom.get('dimensions')}")
                        if iom.get("provenance_integrity"):
                            lines.append(f"   • Integrity Status: {iom.get('provenance_integrity')}")
                    if vd.get("viewer_correction"):
                        vc = vd["viewer_correction"]
                        lines.append(">> VIEWER COGNITIVE CORRECTION:")
                        if vc.get("misconception"):
                            lines.append(f"   • Misconception: {vc.get('misconception')}")
                        if vc.get("why_it_misleads"):
                            lines.append(f"   • Why It Misleads: {vc.get('why_it_misleads')}")
                        if vc.get("corrected_perspective"):
                            lines.append(f"   • Corrected View: {vc.get('corrected_perspective')}")
                        if vc.get("critical_thinking_tip"):
                            lines.append(f"   • Critical Rule: {vc.get('critical_thinking_tip')}")
                    if vd.get("claims"):
                        lines.append(">> ATOMIC CLAIMS:")
                        for c_idx, c in enumerate(vd["claims"], 1):
                            lines.append(f"   {c_idx}. [{c.get('verdict')}] \"{c.get('claim_text')}\"")

                # Cards
                if m.get("cards"):
                    for card in m["cards"]:
                        lines.append(f">> CARD [{card.get('type', 'action').upper()}]: {card.get('title')} ({card.get('badge', '')})")
                        for met in card.get("metrics", []):
                            lines.append(f"   • {met.get('label')}: {met.get('value')}")

                # Audit Log
                if include_audit and m.get("audit_log"):
                    lines.append(">> RUN AUDIT LOG:")
                    for step in m["audit_log"]:
                        lines.append(f"   [{step.get('status', 'OK').upper()}] {step.get('step_name')} ({step.get('duration_ms', 0)}ms) - {step.get('summary')}")

                lines.append("")
                lines.append("--------------------------------------------------------------------------------")
                lines.append("")

            lines.append("================================================================================")
            lines.append("End of Transcript • Verified by Sachbot Autonomous Multi-Agent Engine")
            lines.append("================================================================================")
            return {
                "filename": f"sachbot_transcript_{sess_short}.txt",
                "content_type": "text/plain",
                "content": "\n".join(lines)
            }

        else:
            # Default: Markdown format
            md = [
                f"# 🛡️ Sachbot Fact-Checking Transcript",
                f"",
                f"> **Session Reference:** `{session_id}`  ",
                f"> **Exported Timestamp:** `{now_str}`  ",
                f"> **Total Turns:** {len(messages)}  ",
                f"",
                f"---",
                f""
            ]

            for idx, m in enumerate(messages, 1):
                if m["role"] == "user":
                    md.append(f"### 🧑 Investigator Query #{idx}")
                    md.append(f"*Timestamp: {m['timestamp']}*")
                    md.append(f"")
                    if m.get("content"):
                        md.append(f"{m['content']}")
                    if m.get("url"):
                        md.append(f"- **Target URL:** [{m['url']}]({m['url']})")
                    if m.get("image_path"):
                        md.append(f"- **Uploaded Media:** `{m['image_path']}`")
                    md.append(f"")
                else:
                    md.append(f"### 🤖 Sachbot Autonomous Adjudication #{idx}")
                    md.append(f"*Timestamp: {m['timestamp']}*")
                    md.append(f"")

                    # Triggered Skills Badges
                    if m.get("triggered_skills"):
                        skill_pills = [f"`⚡ Skill: {s.get('display_name', s.get('skill_name'))}`" for s in m["triggered_skills"]]
                        md.append(f"**Triggered Actions:** {' '.join(skill_pills)}")
                        md.append(f"")

                    # Verdict summary
                    if m.get("verdict_data"):
                        vd = m["verdict_data"]
                        v_badge = vd.get("overall_verdict", "UNVERIFIED")
                        conf = vd.get("confidence_score", 0)
                        md.append(f"#### 🏛️ Verdict: **{v_badge}** ({conf}% Confidence)")
                        md.append(f"")
                        md.append(f"{vd.get('summary_explanation', '')}")
                        md.append(f"")

                        if vd.get("actual_fact"):
                            md.append(f"#### 🏛️ The Actual Fact (Ground Truth Reality)")
                            md.append(f"> {vd.get('actual_fact')}")
                            md.append(f"")

                        if vd.get("fetched_image_data") and vd["fetched_image_data"].get("has_image_data"):
                            fid = vd["fetched_image_data"]
                            md.append(f"#### 🖼️ Fetched Image Data & Visual Intelligence")
                            if fid.get("extracted_text"):
                                md.append(f"- **Extracted Text (OCR):** `{fid.get('extracted_text')}`")
                            if fid.get("depicted_subject"):
                                md.append(f"- **Depicted Subject:** {fid.get('depicted_subject')}")
                            if fid.get("watermark_or_source"):
                                md.append(f"- **Watermark / Source Brand:** {fid.get('watermark_or_source')}")
                            if fid.get("extracted_claim"):
                                md.append(f"- **Extracted Claim:** {fid.get('extracted_claim')}")
                            md.append(f"")

                        if vd.get("image_origin_metadata") and vd["image_origin_metadata"].get("has_origin_data"):
                            iom = vd["image_origin_metadata"]
                            md.append(f"#### 🔍 Image Origin & Provenance Dossier")
                            if iom.get("captured_date"):
                                md.append(f"- **Captured / Creation Date:** {iom.get('captured_date')}")
                            if iom.get("by_whom"):
                                md.append(f"- **By Whom / Attribution:** {iom.get('by_whom')}")
                            if iom.get("camera_or_device"):
                                md.append(f"- **Camera / Device:** {iom.get('camera_or_device')}")
                            if iom.get("dimensions"):
                                md.append(f"- **Format & Dimensions:** {iom.get('dimensions')}")
                            if iom.get("provenance_integrity"):
                                md.append(f"- **Provenance Integrity:** {iom.get('provenance_integrity')}")
                            md.append(f"")

                        if vd.get("viewer_correction"):
                            vc = vd["viewer_correction"]
                            md.append(f"#### 🧠 Cognitive Correction & Reality Check for Viewers")
                            if vc.get("misconception"):
                                md.append(f"- **Common Misconception:** {vc.get('misconception')}")
                            if vc.get("why_it_misleads"):
                                md.append(f"- **Why This Misleads:** {vc.get('why_it_misleads')}")
                            if vc.get("corrected_perspective"):
                                md.append(f"- **Corrected Viewer Perspective:** {vc.get('corrected_perspective')}")
                            if vc.get("critical_thinking_tip"):
                                md.append(f"- **Critical Thinking Rule:** `{vc.get('critical_thinking_tip')}`")
                            md.append(f"")

                        if vd.get("claims"):
                            md.append(f"##### 📋 Atomic Claim Breakdown:")
                            for c in vd["claims"]:
                                md.append(f"- **[{c.get('verdict')}]** {c.get('claim_text')}")
                                if c.get("explanation"):
                                    md.append(f"  - *Reasoning:* {c.get('explanation')}")
                            md.append(f"")

                    elif m.get("content"):
                        md.append(f"{m['content']}")
                        md.append(f"")

                    # Action Cards
                    if m.get("cards"):
                        for card in m["cards"]:
                            md.append(f"#### 📦 Card: {card.get('title')} (`{card.get('badge', '')}`)")
                            if card.get("subtitle"):
                                md.append(f"*{card.get('subtitle')}*")
                            if card.get("metrics"):
                                metric_line = " | ".join([f"**{met['label']}:** {met['value']}" for met in card["metrics"]])
                                md.append(f"> {metric_line}")
                            for hl in card.get("highlights", []):
                                md.append(f"- {hl}")
                            if card.get("link_url"):
                                md.append(f"- **Link:** [{card.get('link_text', 'Open Link')}]({card['link_url']})")
                            md.append(f"")

                    # Per-turn Run Audit Log Table
                    if include_audit and m.get("audit_log"):
                        md.append(f"<details><summary>🔍 <b>Per-Turn Execution Audit Log ({len(m['audit_log'])} steps)</b></summary>")
                        md.append(f"")
                        md.append(f"| Step | Status | Duration | Summary |")
                        md.append(f"| :--- | :--- | :--- | :--- |")
                        for step in m["audit_log"]:
                            dur = f"{step.get('duration_ms', 0)}ms"
                            md.append(f"| `{step.get('step_name')}` | `{step.get('status')}` | `{dur}` | {step.get('summary')} |")
                        md.append(f"")
                        md.append(f"</details>")
                        md.append(f"")

                md.append(f"---")
                md.append(f"")

            md.append(f"*Report compiled by Sachbot Autonomous Multi-Agent Verification System • Grounded in Google Search & IFCN Registries*")

            return {
                "filename": f"sachbot_transcript_{sess_short}.md",
                "content_type": "text/markdown",
                "content": "\n".join(md)
            }

session_store = SessionStore()
