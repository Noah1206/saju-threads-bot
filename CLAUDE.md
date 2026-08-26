# saju-threads-bot

내 Threads 계정 운영 자동화. 수집 → 아이디어 → 초안 → 승인 → 발행 → 성과 회수 루프.

**니치: 사주·명리 콘텐츠** (2026-08-24 전환). 말투 기준은 벤치마크 스와이프 코퍼스
`data/corpus/2026-08-24-saju-20.md` 에서 추출됨 — 조회수 없는 남의 글 20건이라
WIN/LOSS 대조가 안 된 상태다. 내 계정 성과 데이터가 쌓이면
`/voice-extract --update` 로 실측 기반으로 갈아탈 것.

## 절대 규칙

1. **승인 없이 발행 금지.** `publish` 는 사람이 명시적으로 실행하는 경우에만. 초안 생성과 발행은 절대 한 턴에 묶지 않는다.
2. **말투는 추측하지 않는다.** 글을 쓸 때는 반드시 `.claude/skills/threads-voice/` 를 로드한다. voice-profile.md 가 비어 있으면 글을 쓰지 말고 `/voice-extract` 부터 하라고 말한다.
3. **금지어 리스트를 어기면 그 초안은 버린다.** 생성 후 자체 검사한다.
4. 500자 초과 금지 (Threads API 텍스트 상한).

## 디렉토리

```
.claude/skills/threads-voice/   말투 스킬 (voice-profile, few-shots)
.claude/commands/               /voice-extract /ideate /draft /review
scripts/threads.ts              Threads API CLI (sync/insights/publish/token)
data/posts.json                 내 글 + 성과 (sync 로 갱신)
data/ideas.json                 아이디어 풀
data/drafts.json                승인 대기 초안
data/sources.md                 소재 인풋 (신살·십신 소재, 시의성 이벤트, 상담 사례)
data/corpus/                    벤치마크 원문 보관 (append only, 정제 금지)
```

## 발행 규칙

- **정서군 간격**: 같은 정서군(예: "억울하게 안 풀리는 나" — ideas.json 의 `cluster` 필드)
  글은 연달아 올리지 않는다. 최소 2~3편 간격, 사이에 다른 결(돈·반박·시의성)을 끼운다.
  연달면 서로 잡아먹고 계정 톤이 징징으로 굳는다.
- 시한부 소재(`deadline` 필드)는 점수보다 만료가 우선한다.

## 파이프라인

| 단계 | 실행 | 산출 |
|---|---|---|
| 수집 | `npm run sync` | data/posts.json (인사이트 포함) |
| 말투 추출 | `/voice-extract` | voice-profile.md, few-shots.md |
| 아이디어 | `/ideate` | data/ideas.json |
| 초안 | `/draft` | data/drafts.json (아이디어당 3안) |
| 검수 | `/review` | 블라인드 테스트 + 금지어 검사 |
| 발행 | `npm run publish -- <id> [<id> ...]` 또는 `--all` (approved 전부, 병렬 3) | Threads |
| 회수 | `npm run sync` (발행 72h 후) | 성과 라벨 갱신 |

## 월 1회 유지보수

`npm run sync` 후 상위 20% / 하위 20% 재분류 → `/voice-extract --update` 로 voice-profile 갱신.
이 루프를 돌리지 않으면 그냥 글 생성기다.

## loverebbit 계정 (2026-08-26 추가)

`@loverebbit` (LOVEREBBIT 사주 웹앱 마케팅) 은 **별도 계정·별도 톤**이다. threads-voice 압축체 적용 안 함 —
따뜻한 존대체, 5~10줄, 본문 끝 댓글 질문 + 해시태그 ≤3, **2/2 답글에 상품 URL** 구조.

```
.env.loverebbit              토큰(claude/threads_token_loverabbit.json 복사, 만료 2026-10-17) + DATA_DIR=data/loverebbit/
npm run publish:lr -- lr-001 --variant 0 [--dry]     sync:lr / limit:lr / token:refresh:lr 동일
data/loverebbit/drafts.json  variants[].pages = [본문, 답글]  (pages 가 있으면 2장~ 는 reply_to_id 로 이어붙임)
data/loverebbit/products.md  상품 13종 URL — 답글은 주제에 맞는 상품 페이지로 연결
```

- 토큰은 스케줄러 자동갱신 대상이 아님. 갱신되면 `.env.loverebbit` 에 다시 복사.
- `{{LINK}}` 플레이스홀더를 쓰면 `LOVEREBBIT_LINK` 로 치환 (비어 있으면 발행 거부). 현재 초안은 URL 직접 기입.
- 발행 이력: 2026-08-26 lr-001(재회), lr-007(속궁합), lr-011~021(사주봇 draft-010~020 크로스포스트, 연애 소재 6편만 링크 답글). lr-009 도 08-26 발행 (--all 테스트). 승인 대기 0건.
- 크로스포스트 규칙: 연애·재회·궁합 소재만 상품 링크 답글, 돈·직업·띠 소재는 답글 없이 본문만.
