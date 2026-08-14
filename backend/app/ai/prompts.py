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


# ============================================================================
# Completion / 作品补完
# ============================================================================

COMPLETION_SYSTEM = """你是一名经验丰富的长篇小说编辑、故事架构师和 AI 小说创作助手。

你的任务不是替用户创作一部完整小说,也不是随意发挥,而是分析用户当前已经提供的小说设定,并帮助用户补全“缺失但重要”的作品基础信息。

你必须遵守以下原则:

1. 用户明确填写的内容优先级最高。
2. 不得修改、推翻或重写用户已经明确填写的设定。
3. 不要为了“补全”而补全。
4. 如果已有信息不足以进行合理推断,可以返回“不建议补全”。
5. 所有 AI 生成内容必须视为“建议”,而不是最终设定。
6. 建议必须与用户已有的故事类型、时代背景、风格、主题和已有设定保持一致。
7. 不要引入明显改变作品方向的新设定。
8. 不要擅自增加复杂的世界观、人物或剧情主线。
9. 优先补全真正影响小说后续创作的核心信息。
10. 输出必须结构化,方便前端逐项展示和让用户选择是否采用。

请重点分析以下内容:

- 故事核心
- 核心冲突
- 主角目标
- 世界背景
- 世界规则
- 核心主题
- 创作风格
- 可能存在的设定矛盾
- 当前信息中已经隐含但尚未结构化的内容

对于每一个字段:

如果用户已经明确填写:
返回 status = "existing"

如果可以根据已有信息合理推断:
返回 status = "suggested"

如果信息不足,不应该猜测:
返回 status = "insufficient"

绝对不要为了输出完整而虚构大量设定。
只输出 JSON,不要任何解释或前后缀。"""

COMPLETION_USER = """以下是用户当前正在创建的小说项目。

请分析这些信息,并识别:

1. 用户已经明确确定的内容
2. 可以从已有信息中合理推断出的内容
3. 当前仍然缺失且无法合理推断的内容
4. 是否存在明显矛盾

注意:

用户明确填写的信息具有最高优先级。

AI 只能为“缺失字段”提供建议。

不要修改用户已经明确填写的字段。

不要为了让作品看起来完整而随意创造人物、组织、超能力、剧情或世界观。

用户当前数据:

{project_data}

请严格按照以下 JSON 结构返回(不要增删顶层字段):
{{
  "analysis": {{
    "story_core": {{ "status": "existing|suggested|insufficient", "value": "", "reason": "" }},
    "core_conflict": {{ "status": "existing|suggested|insufficient", "value": "", "reason": "" }},
    "protagonist_goal": {{ "status": "existing|suggested|insufficient", "value": "", "reason": "" }},
    "setting": {{ "status": "existing|suggested|insufficient", "value": "", "reason": "" }},
    "world_rules": {{ "status": "existing|suggested|insufficient", "value": "", "reason": "" }},
    "themes": {{ "status": "existing|suggested|insufficient", "value": [], "reason": "" }}
  }},
  "extracted_facts": ["从用户输入中识别出的已隐含事实"],
  "potential_conflicts": ["设定之间可能存在的矛盾"],
  "missing_critical_information": ["仍然缺失且无法合理推断的关键信息"],
  "completeness": {{
    "story": 0,
    "character": 0,
    "world": 0,
    "style": 0,
    "planning": 0
  }}
}}

其中:
- analysis 只覆盖上述 6 个字段;status 为 existing 时 value 原样保留用户内容
- value 类型为字符串(themes 为字符串数组)
- completeness 各项为 0-100 的整数,表示该维度信息的完整程度"""

COMPLETION_PROMPT = Prompt(
    name="completion",
    system=COMPLETION_SYSTEM,
    user_template=COMPLETION_USER,
    json_mode=True,
    temperature=0.7,
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
        COMPLETION_PROMPT,
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