# HANDOFF — 쿠팡파트너스용 Threads Bot 개발 인수인계 분석지

> 작성일 2026-08-26. 대상: **새 Claude Code 세션** (빈 폴더에서 시작).
> 원본: `C:\Users\ab409\OneDrive\Desktop\saju-threads-bot` (사주 니치 봇, TS)
> + `C:\Users\ab409\OneDrive\Desktop\claude` (Threads API 파이썬 도구, 멀티 프로필).
> 이 문서만 읽고 **쿠팡파트너스 니치**로 동일 구조의 봇을 새로 만들 수 있게 썼다.
> "그대로 복사할 것 / 니치에 맞게 바꿀 것 / 이번엔 하지 말 것"을 구분해 두었다.

---

## 0. 한 장 요약

사주 봇은 **코드가 아니라 문서(스킬·커맨드·데이터 파일)가 본체**인 프로젝트였다.

```
수집(sync) → 말투 추출(/voice-extract) → 아이디어(/ideate) → 초안(/draft) → 검수(/review) → 발행(publish) → 72h 후 회수(sync)
```

- 코드는 `scripts/threads.ts` **1파일(약 200줄, 의존성 0)** 뿐. Threads Graph API 호출 4개(sync/publish/limit/refresh).
- 글 품질은 전부 `.claude/skills/threads-voice/` (voice-profile / few-shots / banned) + `.claude/commands/*.md` 가 담당.
- 발행은 사람이 `npm run publish -- <draft-id>` 를 직접 쳐야만 나간다. Claude는 초안까지만.
- 2일간(08-24~25) 초안 11건, 발행 9건. **하지만 성과 회수(`npm run sync`)는 한 번도 안 돌았다** → `data/posts.json` 비어 있음. WIN/LOSS 대조 없이 남의 글 20건 흉내로만 굴렸다. 이게 최대 약점.

쿠팡파트너스 봇은 **같은 골격 + 아래 3가지가 다르다**:
1. 글의 목적이 "상담 유도"가 아니라 **"링크 클릭 → 구매"** — CTA·링크 처리·고지문이 핵심 제약.
2. 소재가 명리 개념이 아니라 **상품 + 사용 맥락** — 소재 입력 파일(sources.md) 구조가 바뀐다.
3. 성과 지표가 조회수만이 아니라 **클릭/구매(쿠팡 파트너스 리포트)** — 외부 지표 결합이 필요.

---

## 1. 어떤 식으로 개발했나 (아키텍처)

### 1.1 디렉토리 (사주 봇 실제 구조)

```
saju-threads-bot/
├── CLAUDE.md                          절대 규칙 4개 + 파이프라인 표 + 발행 규칙
├── package.json                       npm run sync|publish|limit|token:refresh
├── .env  (.gitignore)                 THREADS_APP_ID / THREADS_APP_SECRET / THREADS_ACCESS_TOKEN
├── scripts/threads.ts                 API CLI (node 20+, --experimental-strip-types, fetch 내장)
├── .claude/
│   ├── commands/ voice-extract.md ideate.md draft.md review.md
│   └── skills/threads-voice/
│       ├── SKILL.md                   로드 순서 + 초안 절차 + 자체검사 체크리스트 + AI티 제거
│       └── references/ voice-profile.md few-shots.md banned.md
└── data/
    ├── corpus/  <날짜>-<주제>-<N>.md  벤치마크 원문 (append only, 정제 금지)
    ├── patterns/<주제>.md             소재군별 훅/골격/금지 패턴
    ├── sources.md                     소재 인풋 (여기 없는 소재로 아이디어 생성 금지)
    ├── ideas.json                     아이디어 풀 (score 는 사람이 매김)
    ├── drafts.json                    아이디어당 3안, status: pending→approved→published
    └── posts.json                     sync 결과 (내 글 + views/likes/replies + tier)
```

### 1.2 `scripts/threads.ts` — 그대로 복사해도 되는 부분

의존성 없이 잘 돌았다. 핵심만 요약(원본 파일 통째로 복사 권장):

| 명령 | 동작 | 비고 |
|---|---|---|
| `sync` | `GET /me/threads?fields=id,media_type,text,permalink,timestamp&limit=100` 커서 페이지네이션 → 글마다 `GET /{id}/insights?metric=views,likes,replies,reposts,quotes` → `tier()` 로 상/하위 20% WIN/LOSS 라벨 → posts.json | 글 사이 120ms sleep. views=0(인사이트 없음)은 tier 제외 |
| `publish <draft-id> [--variant N] [--dry]` | drafts.json 에서 `status==="approved"` 확인 → `pages[]` 각 장 500자 검사 → 장마다 `POST /me/threads?media_type=TEXT&text=...(&reply_to_id=이전ID)` → 3초 대기 → `POST /me/threads_publish?creation_id=` → drafts.json 에 published_id 기록 | 1장=본문, 2장~=답글 스레드(캐러셀 아님). `--dry` 필수 습관 |
| `limit` | `GET /me/threads_publishing_limit?fields=quota_usage,config` | |
| `refresh` | `GET https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=` | 새 토큰을 **출력만** 하고 .env 는 사람이 교체 |

설계 결정 중 유지할 것:
- **approved 가 아니면 publish 가 throw** — 승인 게이트를 코드로 강제.
- 초안 구조가 `pages: string[]` 라 장문을 답글 스레드로 자동 분할 발행.
- 오류는 `status path :: {error}` 한 줄로 던짐 → 디버깅이 빨랐다.

### 1.3 파이썬 도구 (`Desktop\claude`) — 참고용, 재사용 후보

- `threads_client.py` 의 `ThreadsClient` 는 **이미지/영상/캐러셀/링크 첨부(`link_attachment`)** 를 지원한다. TS 버전은 TEXT 만 됨.
- 쿠팡 봇은 **상품 이미지 + 링크**가 필요하므로 TS 에 `media_type=IMAGE&image_url=` 와 `link_attachment=` 를 추가하거나 파이썬 클라이언트를 가져다 써라. 컨테이너 생성 후 `GET /{container-id}?fields=status,error_message` 로 `FINISHED` 폴링(`wait_until_ready`)이 미디어에는 필수.
- `--profile <이름>` 로 계정별 토큰 파일(`threads_token_<이름>.json`)을 분리하는 패턴, 작업 스케줄러 `REFRESH_TOKEN.bat` 30일 주기 자동 갱신은 이미 돌아가고 있다. **쿠팡 계정도 여기 프로필로 등록하면 갱신을 공짜로 얻는다.**
- Windows 주의(이미 세 번 깨짐): `.bat` 은 ASCII+CRLF만, 파이썬 출력에 `✓ → ─` 금지, `python` 대신 `py -3`.

### 1.4 인증 — 절대 OAuth 시도하지 말 것

Meta 가 localhost 리디렉션을 거부해서 OAuth 는 안 된다. **Meta 개발자 콘솔 → Threads API 설정 → "사용자 토큰 생성기"** 에서 테스터 계정 줄 클릭 → 60일 장기 토큰 복사가 유일한 경로. 이 팝업은 브라우저 자동화로 열면 닫힌다 — 사용자에게 직접 클릭을 요청해라. 새 쿠팡 계정은 (1) 앱에 Threads 테스터로 추가 (2) Threads 앱 설정 → 웹사이트 권한 → 초대 수락 (3) 토큰 생성. 필요 스코프: `threads_basic, threads_content_publish, threads_manage_insights` (+답글 쓰면 `threads_manage_replies`).

---

## 2. 글은 어떤 식으로 작성했나

### 2.1 원칙: "말투는 추측하지 않는다"

글을 쓸 때 반드시 스킬을 로드하고, 순서가 고정이다: **voice-profile(규칙) → few-shots(원문) → banned(금지어)**. 그리고 **few-shots 가 규칙보다 우선** — 규칙과 예시가 충돌하면 예시. 규칙은 예시로 읽히지 않는 부분만 보조.

### 2.2 초안 절차 (`/draft`)

1. few-shots 중 이번 소재와 **구조가 가장 가까운 3개**를 고르고 어떤 걸 골랐는지 밝힌다 (drafts.json 의 `few_shots_used` 에 기록).
2. 그 **골격(구조·리듬)** 만 복제하고 문장은 새로 쓴다. 단, 원문 고유의 **시그니처 토큰**("특징 ;", "~특:", "= XX 사주")은 복제 금지 — 블라인드에서 쌍둥이로 걸렸다.
3. 아이디어당 3안, **서로 앵글이 달라야** 한다 (같은 말 세 번 바꿔쓰기 금지). 각 안에 `hook_type`, `angle` 표기.
4. 자체 검사 체크리스트를 **실제로 돌리고** 결과 표시. 하나라도 실패하면 출력하지 않고 다시 쓴다.

### 2.3 자체 검사 체크리스트 (그대로 가져갈 것 — 니치 무관)

- 500자 이하 / banned 0개 / 종결어미 비율이 프로필 분포 안 / 문장 길이·줄바꿈 리듬이 few-shots 와 유사
- 숫자·고유명사 포함 (구체성 없는 일반론 폐기)
- 첫 문장만 읽고 다음 줄이 궁금한가
- **"A가 아니라 B" 구문 전수 검사** — 마무리·핵심 문장에 있으면 폐기 (생성 5건 중 4건이 이걸 씀. 습관성 결함)
- **대칭 정의 커플릿** ("X는 ~이고 Y는 ~임") 있으면 하나를 비대칭으로 부순다
- **펀치라인 밀도** 글당 1개 이하. 나머지 줄은 정보만 나른다
- 마지막 문장이 명언·교훈처럼 읽히면 폐기. 종결은 CTA / 절단 / 무뚝뚝한 사실 / "등등" 여운 4종만

### 2.4 블라인드 테스트에서 배운 것 (가장 값진 실측)

생성 5 + 실제 5 섞어서 사용자가 판별. **판별축은 "매끈함"이었다.** 실제 글 2건(오탈자·절단 포함)이 AI로 오인되고, 잘 다듬은 생성물이 걸렸다. 통과한 생성물의 공통점 = **짧고 건조하거나 미완결(절단)**. 즉 잘 쓸수록 걸린다. 규칙을 늘리는 게 아니라 **"잘 쓴 마무리·대구·균질한 펀치"를 빼는** 방향으로 패치했고 2차에서 개선됐다.

→ 쿠팡 봇에서도 첫 배치 발행 전에 **반드시 블라인드 1회**. 상품 추천 글은 광고체가 되기 쉬워 더 위험하다.

### 2.5 아이디어 (`/ideate`) 와 소재 관리

- 소재는 `data/sources.md` 에 있는 것만 쓴다. 비어 있으면 멈춘다. **지어낸 경험담은 즉시 들킨다.**
- WIN 글에서 **내용이 아니라 구조(앵글)만** 템플릿화 → 소재 × 템플릿 매핑. 사주 봇 템플릿 예: `T1 체크리스트→명명→근거`, `T2 통념반박→재정의→특징`, `T3 N항목×한줄해설`, `T4 절단형 캐러셀`, `T5 시의성 명령훅→근거→처방`, `T6 타겟지목→시기→참여CTA`, `T7 결론 선공개 매트릭스`.
- 중복은 코퍼스 **선점 앵글 표**로 관리(patterns/*.md 의 "선점 상태" 열, sources.md 의 드롭 기록). 같은 제목 재사용 금지.
- 아이디어당 훅 첫 문장을 1개 써보고 안 나오면 버린다. 10개 이하. **score 는 사람이 매긴다.**
- `cluster`(정서군) 필드 → 같은 정서군 글을 연달아 올리지 않는다 (2~3편 간격). `deadline` 소재는 점수보다 만료 우선.

---

## 3. 글들을 어떻게 파악했나 (분석 방법론)

### 3.1 코퍼스 → 프로필 추출 (`/voice-extract`)

1. **수집**: 사용자가 붙여넣은 벤치마크 글을 `data/corpus/<날짜>-<주제>-<N>.md` 에 **원문 그대로(오탈자·줄바꿈 포함)** 저장. 정제하면 무의미.
2. **분류**: 조회수 상위 20% WIN / 하위 20% LOSS / 나머지 MID. 표본 30개 미만이면 그렇게 말한다.
3. **측정(인상이 아니라 카운트)**: 종결어미 비율, 문장 수·길이, 줄바꿈 간격, 이모지 개수·위치, 숫자·고유명사 빈도, 자수 분포, 첫 문장 유형별 WIN 비율(실패담/수치/통념반박/질문/선언/상황묘사), 마지막 문장 유형, 1인칭·독자호칭.
4. **차이 뽑기**: WIN/LOSS 가 **갈리는 항목만** 규칙으로. 최대 12개. 형식 `[항목] WIN=<수치> / LOSS=<수치> → 규칙`.
5. 파일 쓰기: voice-profile(규칙+수치+표본크기+날짜), few-shots(WIN 8~12건 원문 + 3줄 메타 `<!-- views / 훅 / 구조 -->`), banned(말뭉치 등장 0회인데 LLM 상용구 30개).
6. `--update` 모드는 덮어쓰지 않고 diff 로 보고 후 승인.

### 3.2 계정 클러스터 정규화 (남의 글 섞였을 때의 대응)

코퍼스 20건이 여러 계정 혼재라, 스타일 지문으로 **9개 클러스터를 추정**하고 원칙을 세웠다: **패턴이 3개 이상 클러스터에서 관측되면 장르 규칙, 1개 클러스터 전용이면 그 계정 버릇**(규칙 승격 금지, 의식적 차용만). 이걸로 "특정 계정 카피"가 되는 걸 막았다. 쿠팡 코퍼스도 여러 계정에서 긁을 거면 동일하게 적용.

### 3.3 레지스터 결정

3종(존대/반말/압축체)을 허용했다가 v2에서 **압축체(~함/~임/~됨/명사종결) 단일 고정**. 근거: 그 니치의 디폴트 문체(존대)는 피드에서 묻히고, 덜 흔하면서 few-shots 확보 가능한 문체를 골랐다. → 쿠팡 니치에서도 **"남들이 안 쓰는데 표본은 있는 레지스터"** 를 먼저 결정하고 시작해라. 뒤늦게 바꾸면 few-shots 를 다시 뽑아야 한다.

### 3.4 한계 (솔직히)

- 조회수 없는 스와이프 코퍼스 → 보증되는 건 "장르 유창성"까지. "내 계정에서 터지는 글"은 실측 후 재추출로만 증명된다.
- `npm run sync` 를 한 번도 안 돌려 posts.json 이 비어 있다. 발행 9건의 성과가 전혀 회수되지 않았다. 루프를 안 돌리면 그냥 글 생성기다.
- 압축체 원문이 7건뿐(기준 8~12 미달).

---

## 4. 쿠팡파트너스 봇 — 무엇이 달라지는가

### 4.1 제약 (코드·프롬프트 모두에 박을 것)

| 항목 | 내용 |
|---|---|
| **고지문 필수** | 쿠팡파트너스 약관상 모든 게시물에 대가성 고지가 있어야 한다. 표준 문구: `이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.` — **publish 함수에서 고지문 없으면 throw** 하도록 코드 게이트. 500자 안에 고지문(약 45자)이 들어가야 하므로 본문 실질 상한 ≈ 450자, 또는 고지문을 2장(답글)에 배치. 어느 쪽인지 정책을 CLAUDE.md 에 못박아라. 정확한 최신 규정은 파트너스 공지에서 재확인. |
| **링크** | Threads 는 본문 URL 이 자동 링크되지만 TEXT 컨테이너에 `link_attachment=<url>` 파라미터를 붙이면 링크 카드가 뜬다. 파트너스 링크(`link.coupang.com/a/...` 단축 딥링크)를 쓰고 **어느 위치(본문/첫 답글)가 클릭이 높은지 A/B** 하라. 첫 답글 배치가 알고리즘 억제를 덜 받는다는 통설이 있으니 실측. |
| **이미지** | 공개 URL만 가능. 쿠팡 상품 이미지 URL(`thumbnail*.coupangcdn.com/...`)은 공개라 `media_type=IMAGE&image_url=` 로 바로 쓸 수 있으나 저작권·규정 확인 필요. 직접 찍은 사진은 호스팅(R2/S3/GitHub raw) 필요 — 사주 봇에서 미해결 TODO 였다. |
| **상품 데이터** | 쿠팡 파트너스 Open API(딥링크 생성 `POST /v2/providers/affiliate_open_api/apis/openapi/v1/deeplink`, 상품 검색, HMAC 서명 `CEA algorithm=HmacSHA256, access-key=..., signed-date=..., signature=...`)로 링크 자동 생성 가능. `COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY` 를 .env 에 추가. 초기엔 수동으로 링크 붙여도 되지만 `scripts/coupang.ts deeplink <url>` 하나는 초반에 만들어 두면 초안→발행이 끊기지 않는다. |
| **성과 지표** | Threads 인사이트(views/likes)만으로는 부족. 파트너스 리포트(클릭·주문·수수료)를 **posts.json 에 합쳐야** WIN 정의가 맞다. 리포트 API(`.../reports/clicks`, `.../reports/orders`)가 있다. `tier()` 를 views 기준에서 **클릭률 또는 수수료 기준**으로 바꿀 것. 서브ID(`subId`)를 draft-id 로 넣으면 글 단위 귀속이 된다 — **이게 가장 큰 설계 포인트**. |
| **발행 한도** | 250/24h 는 여유. 문제는 **계정 신뢰도** — 신규 계정이 링크 글만 연속 올리면 도달이 죽는다. 발행 규칙에 "링크 없는 글 : 링크 글 = 최소 2:1" 같은 비율 규칙을 넣고 코드에서 최근 N건을 검사해라. |
| **금지 표현** | 파트너스 규정 + 표시광고법: "최저가 보장", 과장 효능, 의료 효과 단정 등. banned.md 에 **규정 금지어 섹션**을 별도로 두고 말뭉치 기반 금지어와 분리. |

### 4.2 데이터 스키마 변경 제안

`ideas.json` 에 추가: `product_url`, `product_name`, `price_snapshot`, `category`, `deeplink`, `sub_id`, `affiliate_angle`(비교/실패담/사용맥락/시의성).
`drafts.json` variant 에 추가: `has_disclosure: true`, `link_position: "body"|"reply"`, `image_url`.
`posts.json` 에 추가: `clicks`, `orders`, `commission`, `ctr` (sync 가 파트너스 리포트를 subId 로 조인).

`sources.md` 섹션 재편: `직접 산/쓴 것(실경험 필수)` / `시즌·이벤트(추석·와우데이·계절)` / `카테고리 갭(코퍼스 미선점)` / `댓글 질문` / `드롭 기록`. 사주 봇 원칙 유지 — **실제로 써본 것만 쓴다.** 안 써본 상품 후기는 지어낸 경험담이라 바로 들킨다. 안 써본 상품은 "비교표·스펙 정리" 앵글만 허용.

### 4.3 코퍼스 수집 — 시작 전에 이것부터

사주 봇의 최대 실수는 조회수 없는 코퍼스로 시작한 것. 이번엔:
1. 쿠팡파트너스/제품추천 Threads 계정 글 **30건 이상 + 조회수·좋아요 병기**로 붙여넣기 (터진 글 20 + 안 터진 글 10). 조회수는 스레드 화면에서 보인다.
2. 여러 계정이면 클러스터 표 먼저.
3. 레지스터 결정 후 `/voice-extract`.
4. 내 계정 글이 10건 이상 쌓이면 즉시 `--update` 로 실측 기반 전환.

---

## 5. 다음엔 어떻게 하면 더 효율적인가 (교훈 → 지시)

1. **첫날에 `sync` 를 돌리고 크론에 건다.** 발행 72h 후 회수가 안 되면 전체 루프가 죽는다. 작업 스케줄러에 `npm run sync` 를 매일 1회 등록(REFRESH_TOKEN.bat 패턴 재사용, ASCII 배치). 사주 봇은 이걸 안 해서 9건 발행 성과가 0 회수.
2. **코드보다 CLAUDE.md 절대 규칙을 먼저 쓴다.** 사주 봇의 4개 규칙(승인 없이 발행 금지 / 말투 추측 금지 / 금지어 위반 초안 폐기 / 500자)이 실제로 사고를 막았다. 쿠팡은 `고지문 없으면 발행 금지`, `실경험 없는 후기 금지`, `링크 글 비율` 3개를 추가.
3. **게이트는 프롬프트가 아니라 코드에.** approved 체크, 500자, 고지문, 링크 비율 — 전부 `publish()` 안에서 throw. Claude 가 잊어도 막힌다.
4. **첫 발행 전 블라인드 1회, 규칙은 12개 상한.** 규칙을 늘리면 품질이 떨어진다는 걸 실증했다. 걸리면 "빼는" 패치.
5. **few-shots 메타 3줄 + `few_shots_used` 기록**을 처음부터. 어떤 골격이 터졌는지 나중에 역추적이 된다.
6. **아이디어 점수는 사람이.** Claude 가 매기면 자기 초안을 자기가 고른다. score 0 으로 두고 사용자가 매긴 뒤 `publish_order`.
7. **정서군/카테고리 간격 규칙**을 ideas.json `cluster` 필드로 — 쿠팡은 `category` 로 같은 걸 한다 (주방용품 3연속 금지 등).
8. **TS 단일 파일 유지.** 프레임워크·DB 넣지 마라. JSON 파일 + node 내장 fetch 로 충분했고 디버깅이 가장 빨랐다. 파트너스 API 는 `scripts/coupang.ts` 로 파일 하나 더.
9. **토큰은 기존 인프라에 얹는다.** `Desktop\claude` 의 `--profile coupang` 으로 등록하면 30일 자동 갱신 공짜. 새 봇의 `.env` 에는 그 토큰을 복사만.
10. **Windows 함정 3개**(bat 한글, CP949 특수문자, `python` 껍데기)는 처음부터 CLAUDE.md 에 박아라. 세 번 깨졌다.
11. **하지 말 것**: OAuth 시도 / 브라우저 자동화로 토큰 생성기 열기 / 코퍼스 정제 / 초안과 발행을 한 턴에 / 조회수 없는 코퍼스로 시작.

---

## 6. 새 세션에서 실행할 순서 (체크리스트)

```
[ ] 1. 폴더 생성 coupang-threads-bot/ → 이 문서와 사주 봇의 다음 파일을 복사:
       scripts/threads.ts, package.json, .env.example, .gitignore,
       .claude/skills/threads-voice/SKILL.md, .claude/commands/*.md
       (references/*.md 는 복사하지 말고 EMPTY 상태로 새로 만든다 — 사주 규칙 오염 방지)
[ ] 2. CLAUDE.md 작성: 절대 규칙 4 + 쿠팡 3 (고지문/실경험/링크비율), Windows 함정 3, 파이프라인 표
[ ] 3. threads.ts 확장: link_attachment, IMAGE 컨테이너 + 상태 폴링, 고지문·링크비율 게이트, sync 에 subId 조인
[ ] 4. scripts/coupang.ts: deeplink 생성 + 리포트 조회 (HMAC). .env 에 COUPANG_* 추가
[ ] 5. Meta 콘솔: 쿠팡 계정 테스터 추가 → 초대 수락 → 사용자 토큰 생성기(사용자가 직접) → Desktop\claude 에 --profile coupang 등록 → .env 복사
[ ] 6. npm run limit 로 연결 확인
[ ] 7. 코퍼스 30건+조회수 수집 → data/corpus/ → 클러스터 표 → 레지스터 결정 → /voice-extract
[ ] 8. sources.md 에 실제로 써본 상품 5개 이상 → /ideate → 사람이 score → /draft → /review → 블라인드 1회
[ ] 9. 첫 발행(링크 없는 글부터 2~3편) → 72h 후 sync → 작업 스케줄러에 sync 일일 등록
[ ] 10. 글 10건 쌓이면 /voice-extract --update (클릭률 기준 WIN 으로 tier 재정의)
```

---

## 부록 A. 원본 파일 위치 (복사용)

| 용도 | 경로 |
|---|---|
| API CLI | `Desktop\saju-threads-bot\scripts\threads.ts` |
| 스킬·커맨드 | `Desktop\saju-threads-bot\.claude\` |
| 프로젝트 규칙 예시 | `Desktop\saju-threads-bot\CLAUDE.md` |
| 코퍼스 포맷 예시 | `Desktop\saju-threads-bot\data\corpus\2026-08-24-saju-20.md` (상단 클러스터 표 참고) |
| 패턴 문서 예시 | `Desktop\saju-threads-bot\data\patterns\jaehoe.md` (훅 3종 선점표 + 골격 6단계) |
| 이미지/링크 지원 클라이언트 | `Desktop\claude\threads_client.py` (`create_container`, `wait_until_ready`, `post_image`, `post_carousel`) |
| 토큰 갱신 인프라 | `Desktop\claude\get_token.py`, `REFRESH_TOKEN.bat`, 작업 스케줄러 `ThreadsTokenRefresh` |
| Threads 설정·인증 상세 | `C:\Users\ab409\CLAUDE.md` (Meta 앱 ID, 토큰 생성기 URL, 오류 대응표) |

## 부록 B. Threads API 치트시트

```
GET  /v1.0/me?fields=id,username
GET  /v1.0/me/threads?fields=id,media_type,text,permalink,timestamp&limit=100[&after=]
GET  /v1.0/{id}/insights?metric=views,likes,replies,reposts,quotes
GET  /v1.0/me/threads_publishing_limit?fields=quota_usage,config
POST /v1.0/me/threads?media_type=TEXT&text=...[&reply_to_id=][&link_attachment=]
POST /v1.0/me/threads?media_type=IMAGE&image_url=...&text=...[&alt_text=]
GET  /v1.0/{container-id}?fields=status,error_message      (FINISHED 까지 폴링, 미디어는 ~30s)
POST /v1.0/me/threads_publish?creation_id=...
GET  https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=...
```
제약: 본문 500자 / 250게시·1000답글 per 24h / 캐러셀 2~20 / 미디어는 공개 URL만 / 장기토큰 60일, 만료 시 복구 불가(갱신은 발급 24h 후부터).
