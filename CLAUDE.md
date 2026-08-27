# saju-threads-bot

**@loverebbit 전용.** LOVEREBBIT 사주 웹앱 마케팅 계정 운영 자동화.
수집 → 아이디어 → 초안 → 승인 → 발행 → 성과 회수 루프.

**니치: 사주·명리 콘텐츠.** 말투 기준은 **v3부터 내 계정 실측**이다
(2026-08-27 첫 `npm run sync` → 65건, WIN 10 / LOSS 10 대조).
스와이프 코퍼스는 실측이 못 덮는 구조 3종만 보조로 남아 있다.
**최대 변수는 "독자가 자기 글자를 찾아 읽는 분기 구조"** — WIN 6.4줄 / LOSS 0줄.
절단 조각 훅(첫 줄 12자 이하)은 폐기 대상. 상세는 `voice-profile.md`.

## 절대 규칙

1. **승인 없이 발행 금지.** `publish` 는 사람이 명시적으로 실행하는 경우에만. 초안 생성과 발행은 절대 한 턴에 묶지 않는다.
2. **말투는 추측하지 않는다.** 글을 쓸 때는 반드시 `.claude/skills/threads-voice/` 를 로드한다. voice-profile.md 가 비어 있으면 글을 쓰지 말고 `/voice-extract` 부터 하라고 말한다.
3. **금지어 리스트를 어기면 그 초안은 버린다.** 생성 후 자체 검사한다.
4. 500자 초과 금지 (Threads API 텍스트 상한).
5. **간지·합충·십신은 기억으로 쓰지 않는다.** 연도·월·띠·합/충/원진/삼합·십신이 글에 들어가면 반드시
   `node scripts/check-draft.mjs "<본문>"` 로 기계 검사한다. FAIL 이면 폐기.
   해석의 경계(유파 갈림·금지 화법)는 `data/reference/claims.md`. 표 조회는 `node scripts/lookup.mjs <지지|일간> <연도>`.
   2026-08-26 "내년 자축합" 오류(정미년은 자미 원진) 로 댓글 지적받음.

## 톤 — 압축체 고정

**~함 / ~임 / ~됨 / 명사종결.** 존대체·반말 구어 금지.
2026-08-26 에 존대체로 10편 올렸다가 전부 압축체로 재발행함. 계정 톤은 압축체 하나다.

## 디렉토리

```
.claude/skills/threads-voice/   말투 스킬 (voice-profile, few-shots, banned)
.claude/commands/               /voice-extract /ideate /draft /review
scripts/threads.ts              Threads API CLI (sync/publish/limit/refresh)
scripts/lookup.mjs              세운·지지 참조표 부분 조회 (표 전체를 읽지 말 것)
scripts/gen-reference.mjs       data/reference/seun.md 재생성
scripts/import-draft.mjs        inbox/*.txt (웹 챗 초안) -> data/drafts.json
scripts/build-webpack.mjs       claude.ai Project 용 지식 팩 -> dist/
scripts/drafts.mjs              drafts/posts 발췌 조회 (summary|list|pending|show|grep|posts)
scripts/check-draft.mjs         초안 명리 주장 기계 검사 (연도·합충·십신·시점·금지화법)
scripts/carousel4.mjs           띠별 4장 캐러셀 생성 (briefs/*.json -> pages 4장 + 릴스 장면)
scripts/content-review.mjs      캐러셀 화법·구조 검수 (보장/공포/부적/타계정 시그니처/원문복제/띠-연도)
data/drafts.json                초안 + 발행 이력 — 통째로 Read 금지(권한에서 차단). drafts.mjs 로 볼 것
data/posts.json                 내 글 + 성과 (sync 로 갱신)
data/ideas.json                 아이디어 풀
data/products.md                상품 13종 URL — 답글은 주제에 맞는 상품 페이지로 연결
data/sources.md                 소재 인풋
data/corpus/                    벤치마크 원문 (append only, 정제 금지)
data/reference/seun.md          세운·지지·십신 참조표 (자동 생성)
data/reference/claims.md        확정/해석자유/유파갈림/금지 경계 — 사람 판단 영역
data/archive/                   구 fitpick_00 발행 목록 .md (소재 중복 방지용 20줄. 원문은 git 이력)
briefs/                         carousel4 입력 슬롯 .json (벤치마크 문장 복사 금지)
inbox/                          웹 챗에서 뽑은 초안 .txt 임시 보관
```

## 글 구조 — 본문 + 2/2 답글

`variants[].pages = [본문, 답글]`. pages 가 있으면 2장~ 는 `reply_to_id` 로 이어붙는다.

- 본문 끝: 댓글 질문 한 줄 + 해시태그 ≤3. **본문에 URL 넣지 않는다** (도달 깎임).
- 2/2 답글: 주제에 맞는 상품 URL + "생년월일만 넣으면 됨".
- **연애·재회·궁합 소재만 상품 링크.** 돈·직업·띠 소재는 답글 없이 본문만.
- **첫 줄은 꺾쇠 제목 고정** — `<~한 사주>` 형태. 훅 문구는 2행으로 내린다 (2026-08-27 결정).
- **가격·판촉 문구 금지.** 본문·답글 어디에도 금액("990원")·할인·특가·선착순·"오늘까지만" 을 쓰지 않는다.
  링크만 걸고 가격은 상품 페이지에서 보게 한다. `check-draft.mjs` 가 기계로 잡는다.
- `{{LINK}}` 플레이스홀더를 쓰면 `LOVEREBBIT_LINK` 로 치환 (비어 있으면 발행 거부). 상품별 URL 직접 기입이 기본.

## 발행 규칙

- **정서군 간격**: 같은 정서군(ideas.json 의 `cluster` 필드) 글은 연달아 올리지 않는다.
  최소 2~3편 간격, 사이에 다른 결(돈·반박·시의성)을 끼운다.
- 시한부 소재(`deadline` 필드)는 점수보다 만료가 우선한다.
- 하루 1~2편. 한 번에 몰아 올리면 서로 노출을 잡아먹고 성과 비교가 불가능해진다.

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

웹 챗(claude.ai)에서 쓴 초안은 `inbox/` 에 .txt 로 넣고
`node scripts/import-draft.mjs inbox/ --product <slug>` → `npm run publish -- --all`.

## 계정·토큰

`@loverebbit` (user_id `27988053430851129`). 토큰은 `.env` 의 `THREADS_ACCESS_TOKEN`,
**만료 2026-10-17**. 자동갱신 대상이 아니므로 만료 전 `npm run token:refresh` 필수.
토큰 재발급은 Meta 콘솔 "사용자 토큰 생성기" (자동화 불가, 사람이 직접 클릭).

## 발행 이력

2026-08-26: lr-001~031 (31편). 존대체 10편(lr-001~010)은 압축체 lr-022~031 로 재발행됨.
lr-032(바람기) 는 pending. 성과 회수는 `npm run sync` 로 08-29 이후.

## 월 1회 유지보수

`npm run sync` 후 상위 20% / 하위 20% 재분류 → `/voice-extract --update` 로 voice-profile 갱신.
이 루프를 돌리지 않으면 그냥 글 생성기다.
