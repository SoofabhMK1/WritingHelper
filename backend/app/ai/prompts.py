"""Prompt templates for AI features.

Each prompt is a (system, user_template, json_mode) tuple. The user template
can reference variables from a context dict via Python str.format_map. Use
`{{` and `}}` for literal braces if you need them inside prompts.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class Prompt:
    name: str
    system: str
    user_template: str
    json_mode: bool = True
    temperature: float = 0.8


# ============================================================================
# OUTLINE / 大纲
# ============================================================================

OUTLINE_SYSTEM = """你是一位资深网文编辑与编剧,擅长把作品设定拆解成结构化的卷/章大纲。
只输出 JSON,不要任何解释或前后缀。"""

OUTLINE_USER = """作品标题:{title}
题材:{genre}
风格:{style}
视角:{pov}
简介:{description}
目标字数:{target_words}

请为这部作品设计一个 {volume_count} 卷的整体大纲。
要求:
- 每卷有 title(中文,简洁有力)、summary(2-4 句话描述本卷核心冲突与走向)
- 总字数控制在 {target_words} 字左右,按卷均匀分布
- 卷与卷之间存在递进或转折关系

输出 JSON:
{{
  "volumes": [
    {{ "title": "...", "summary": "...", "target_words": 100000 }}
  ]
}}"""

OUTLINE_PROMPT = Prompt(
    name="outline",
    system=OUTLINE_SYSTEM,
    user_template=OUTLINE_USER,
    json_mode=True,
    temperature=0.8,
)


CHAPTERS_SYSTEM = """你是网文结构师。把一个卷的大纲细化成结构化的章节列表。
只输出 JSON。"""

CHAPTERS_USER = """作品:{work_title}
卷:{volume_title}
卷概要:{volume_summary}
预计章节数:{target_chapter_count}

请把这一卷细化成 {target_chapter_count} 章,每章给 title 和 summary(2-3 句话)。
章节之间要有节奏起伏(铺垫→冲突→高潮→收束)。

输出 JSON:
{{
  "chapters": [
    {{ "title": "...", "summary": "...", "chapter_type": "plot|opening|climax|..." }}
  ]
}}"""

CHAPTERS_PROMPT = Prompt(
    name="chapters",
    system=CHAPTERS_SYSTEM,
    user_template=CHAPTERS_USER,
    json_mode=True,
    temperature=0.8,
)


# ============================================================================
# CHARACTER / 人物
# ============================================================================

CHARACTER_SYSTEM = """你是人物设定专家,根据作品题材与上下文,生成丰富、可信的人物卡。
只输出 JSON。"""

CHARACTER_USER = """作品:{work_title}
题材:{genre}
该人物定位:{role}
已有人物(避免重复):{existing_chars}

请创建一个新人物,字段:
- name(中文姓名,有韵味)
- aliases(可选,外号/称号)
- age, gender
- appearance(1-2 句)
- personality(2-3 段特质)
- background(出身,2-3 句)
- motivation(核心欲望)
- arc(人物弧光)
- speech_style(口头禅/说话风格)
- ability(技能/能力)

输出 JSON:
{{
  "character": {{ "name": "...", ... }}
}}"""

CHARACTER_PROMPT = Prompt(
    name="character",
    system=CHARACTER_SYSTEM,
    user_template=CHARACTER_USER,
    json_mode=True,
    temperature=0.9,
)


# ============================================================================
# EVENT / 事件
# ============================================================================

EVENT_SYSTEM = """你是剧情节奏分析师,基于作品设定和已有事件,建议推动剧情的关键事件。
只输出 JSON。"""

EVENT_USER = """作品:{work_title}
题材:{genre}
当前剧情摘要:{current_summary}
已有事件(避免重复):{existing_events}

请建议 {count} 个推动剧情的关键事件,字段:
- title(简洁)
- event_type(main / branch / climax / foreshadow / reveal)
- story_time(故事内时间,如 Day 90)
- importance(1-5)
- description(2-3 句)

输出 JSON:
{{
  "events": [
    {{ "title": "...", "event_type": "main", "story_time": "...", "importance": 4, "description": "..." }}
  ]
}}"""

EVENT_PROMPT = Prompt(
    name="event",
    system=EVENT_SYSTEM,
    user_template=EVENT_USER,
    json_mode=True,
    temperature=0.8,
)


# ============================================================================
# CONSISTENCY / 一致性检查
# ============================================================================

CONSISTENCY_SYSTEM = """你是一位严格的小说编辑,负责检查新章节内容是否与已有设定冲突。
只输出 JSON。"""

CONSISTENCY_USER = """作品设定摘要:{settings_summary}
新章节内容:
\"\"\"
{new_content}
\"\"\"

请检查以下方面:
- 与已有角色(姓名、性格、能力)是否矛盾
- 与已有事件、时间线是否矛盾
- 与世界观/题材惯例是否矛盾
- 是否有未交代的关键人物或事件突然出现

输出 JSON:
{{
  "issues": [
    {{ "severity": "high|medium|low", "category": "character|event|world|plot", "quote": "原句片段", "explanation": "...", "suggestion": "..." }}
  ],
  "summary": "总体评价"
}}"""

CONSISTENCY_PROMPT = Prompt(
    name="consistency",
    system=CONSISTENCY_SYSTEM,
    user_template=CONSISTENCY_USER,
    json_mode=True,
    temperature=0.3,
)


# ============================================================================
# Free chat / 自由对话
# ============================================================================

CHAT_SYSTEM = """你是作者的创作助手,基于已载入的作品上下文回答问题、给建议、扩展想法。
保持简洁、有条理。"""

CHAT_USER = """[作品上下文]
{context}

[用户问题]
{question}"""

CHAT_PROMPT = Prompt(
    name="chat",
    system=CHAT_SYSTEM,
    user_template=CHAT_USER,
    json_mode=False,
    temperature=0.7,
)


# ============================================================================
# Continue / Expand — 续写 / 扩写
# ============================================================================

CONTINUE_SYSTEM = """你是网文续写助手,基于作品已有风格、人物、节奏继续写下一段正文。
保持文风一致,不引入新人物,不要改变已设定的事实。
只输出要续写的正文段落,不要任何解释或前后缀。"""

CONTINUE_USER = """作品:{work_title}
题材:{genre}
风格:{style}
视角:{pov}

[已有章节设定]
{chapter_meta}

[人物速览]
{characters_summary}

[已写正文最后约 {tail_chars} 字]
\"\"\"
{tail}
\"\"\"

请接着往下续写约 {target_chars} 字,自然衔接,保持节奏。"""

CONTINUE_PROMPT = Prompt(
    name="continue",
    system=CONTINUE_SYSTEM,
    user_template=CONTINUE_USER,
    json_mode=False,
    temperature=0.85,
)


EXPAND_SYSTEM = """你是网文扩写助手,把一段简略的文本扩写为更详细、更生动的正文。
保持题材与文风一致,不要改变关键事实。
只输出扩写后的段落,不要任何解释或前后缀。"""

EXPAND_USER = """作品:{work_title}
题材:{genre}
风格:{style}

[待扩写片段]
\"\"\"
{selection}
\"\"\"

请把这段扩写到约 {target_chars} 字,加入更多感官细节、动作、对话、心理。
不要偏离原文意图。"""

EXPAND_PROMPT = Prompt(
    name="expand",
    system=EXPAND_SYSTEM,
    user_template=EXPAND_USER,
    json_mode=False,
    temperature=0.8,
)


PROMPTS = {
    p.name: p for p in (
        OUTLINE_PROMPT,
        CHAPTERS_PROMPT,
        CHARACTER_PROMPT,
        EVENT_PROMPT,
        CONSISTENCY_PROMPT,
        CONTINUE_PROMPT,
        EXPAND_PROMPT,
        CHAT_PROMPT,
    )
}


def list_prompts() -> list[Prompt]:
    """Return all registered prompts in stable insertion order."""
    return list(PROMPTS.values())


def get_prompt(name: str) -> Prompt | None:
    """Look up a registered prompt by name. Returns None if unknown."""
    return PROMPTS.get(name)


def render(prompt: Prompt, variables: dict[str, Any]) -> tuple[str, str]:
    """Return (system_message, user_message) rendered with the given variables."""
    safe_vars = {k: (v if v is not None else "") for k, v in variables.items()}
    try:
        user = prompt.user_template.format_map(safe_vars)
    except KeyError as e:
        raise ValueError(f"Missing variable for prompt '{prompt.name}': {e}") from e
    return prompt.system, user