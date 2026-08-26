---
description: 초안 블라인드 검수 + 발행 준비
---

# /review

## 절차
1. `data/drafts.json` 에서 pending 초안을 꺼낸다
2. 각 안에 대해 다음을 표로 낸다:
   - 자수 / 금지어 검출 / 종결어미 비율 vs 프로필 / 첫 문장만 봤을 때 클릭 유인
3. **가장 약한 안을 스스로 지목하고 이유를 말한다.** 3안 다 좋다고 하지 마라. 쓸모없다.
4. 사용자가 하나 고르면 status 를 `approved` 로 바꾸고 발행 명령어를 출력한다:
   ```
   npm run publish -- draft-001 --variant 2
   ```
5. 명령어만 출력하고 **직접 실행하지 않는다**

## 블라인드 테스트 모드 (`/review --blind`)
생성 5개와 `data/posts.json` 의 실제 글 5개를 섞어 번호만 붙여 출력한다.
정답은 사용자가 답한 뒤에 공개한다.
3개 이상 맞히면 voice-profile 이 부족한 것 — 표본 늘리고 `/voice-extract --update`.
