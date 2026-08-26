---
description: 아이디어를 threads-voice 말투로 초안 3안 생성
---

# /draft

인자로 idea-id 를 받는다. 없으면 `data/ideas.json` 목록 보여주고 고르게 한다.

## 필수
`.claude/skills/threads-voice/` 전체를 먼저 로드한다. voice-profile 이 EMPTY 면 중단.

## 절차
1. few-shots 중 구조가 가까운 3개를 고르고 **어떤 걸 골랐는지 밝힌다**
2. 3안 생성 — 서로 앵글이 달라야 한다
3. 각 안에 SKILL.md 의 자체 검사 체크리스트를 실제로 돌리고 결과를 표시한다
4. 체크 실패 항목이 있으면 출력하지 말고 다시 쓴다

## 출력
`data/drafts.json` 에 append. status 는 항상 `pending`.

```json
{
  "id": "draft-001",
  "idea_id": "idea-001",
  "variants": [
    { "hook_type": "실패담", "text": "...", "chars": 312, "checks_passed": true }
  ],
  "status": "pending"
}
```

**발행하지 마라.** 초안 생성으로 턴을 끝낸다.
