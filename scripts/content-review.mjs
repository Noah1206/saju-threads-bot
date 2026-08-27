// 4장 캐러셀 원고 자동 검수. 스펙의 ContentReview 를 이 저장소 규칙에 맞춰 구현.
//   import { review } from "./content-review.mjs"
//   node scripts/content-review.mjs --id lr-107      drafts.json 의 초안 검수
//
// 명리 사실(간지·합충·십신·시점)은 check-draft.mjs 가 본다. 여기는 화법·구조·독창성만.
import { readFileSync, existsSync, readdirSync } from "node:fs";

const BRANCHES = "자축인묘진사오미신유술해".split("");
const STEMS = "갑을병정무기경신임계".split("");
const ZODIAC = { 쥐: "자", 소: "축", 호랑이: "인", 토끼: "묘", 용: "진", 뱀: "사", 말: "오", 양: "미", 원숭이: "신", 닭: "유", 개: "술", 돼지: "해" };
const ganji = (y) => STEMS[(((y - 2024) % 10) + 10) % 10] + BRANCHES[(((y - 2024) % 12) + 12 + 4) % 12];

// 결과 보장 · 공포 · 판매 압박 · 타 계정 시그니처.
// 벤치마크 2건이 실제로 쓴 표현을 그대로 금지 목록에 넣었다 (베끼지 않기 위해서가 아니라 쓰면 안 되는 화법이라서).
const BAD = [
  ["unsupported_certainty", /무조건|반드시|100\s*%|백퍼|운명(이다|입니다)|확정|틀림없/],
  ["unsupported_certainty", /억대|평생\s*(부자|마르지)|인생\s*역전|대박\s*(터|나)|돈방석|횡재수|폭발|쏟아지는|불려가게|채워가게/],
  ["fear_pressure", /액운|부적|큰일\s*(난|나)|안\s*보면\s*(후회|손해)|지금\s*아니면|늦는다|놓치면/],
  ["fear_pressure", /🚨|❗{2,}/u],
  ["fake_testimonial", /실제\s*(고객|후기|사연)|적중(률|한|했)|후기\s*폭주|\d+\s*명이\s*(신청|확인)/],
  ["copied_phrase", /스하리|스치니/], // 타 계정 시그니처 (claims.md 3번)
  ["missing_cta_boundary", /무료/], // 이 계정은 가격·판촉어를 아예 쓰지 않는다 (2026-08-27 결정)
];

const SCENE_HINT = /확인|열어|눌러|지우|보내|읽|적|미루|참|삼키|말하|묻|기다리|돌려|버티|덮|미뤄|되뇌|복기|검색|저장/;

/**
 * 구체적인 행동 장면 수. "예민하다" 같은 형용은 안 센다.
 * 우리 포맷에서 ": " 로 시작하는 줄이 장면 표시자이므로 그것도 센다 —
 * 행동 동사 목록만으로는 "모임 끝나고 집 오는 길이 제일 조용함" 같은 장면을 놓친다 (2026-08-28 실측).
 * 벤치마크의 "9월: 목돈 회수" 는 줄 시작이 ":" 가 아니라 여전히 안 잡힌다.
 */
function countScenes(text) {
  return text
    .split(/\n|(?<=[.?!])\s/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 10 && (/^:/.test(s) || SCENE_HINT.test(s))).length;
}

/**
 * 코퍼스 원문과 n자 연속 일치하는 구간을 찾는다 (기본 8자).
 * 한글 음절만 남기고 비교한다 — 숫자·이모지·구두점을 섞으면 출생연도 목록 같은
 * 사실 데이터가 "복제"로 잡히는 오탐이 난다 (2026-08-28 실측).
 */
const hangul = (s) => s.replace(/[^가-힣]/g, "");
function copiedFrom(text, corpusDir = "data/corpus", n = 8) {
  if (!existsSync(corpusDir)) return [];
  const hay = hangul(
    readdirSync(corpusDir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => readFileSync(`${corpusDir}/${f}`, "utf8"))
      .join("\n")
  );
  const flat = hangul(text);
  const hits = new Set();
  for (let i = 0; i + n <= flat.length; i++) {
    const seg = flat.slice(i, i + n);
    if (hay.includes(seg)) hits.add(seg);
  }
  return [...hits];
}

/** 같은 어미·구조가 과하게 반복되는지 */
function repetitive(lines) {
  const tails = lines.map((l) => l.trim().slice(-3)).filter(Boolean);
  const c = {};
  tails.forEach((t) => (c[t] = (c[t] ?? 0) + 1));
  const worst = Object.entries(c).sort((a, b) => b[1] - a[1])[0];
  return worst && worst[1] > Math.max(3, tails.length * 0.5) ? worst : null;
}

/**
 * @param {{cards: string[], zodiac?: string, birthYears?: number[], productName?: string}} post
 */
export function review(post) {
  const cards = post.cards ?? [];
  const all = cards.join("\n");
  const lines = all.split("\n").map((s) => s.trim()).filter(Boolean);
  const issues = [];
  const suggestions = [];
  let needsManualReview = false;

  for (const [issue, re] of BAD) {
    const m = all.match(re);
    if (m) {
      issues.push(issue);
      suggestions.push(`금지 표현 "${m[0]}" — ${issue === "unsupported_certainty" ? "가능성·경향·확인 기준으로 바꿔라" : issue === "fear_pressure" ? "불안·판매 압박 제거" : issue === "copied_phrase" ? "타 계정 시그니처. 우리 어휘로" : "삭제"}`);
    }
  }

  // 장면 수
  const scenes = countScenes(all);
  if (scenes < 3) {
    issues.push("generic");
    suggestions.push(`구체적 행동 장면 ${scenes}개 — 3개 이상 필요. 감정어 대신 관찰 가능한 행동으로`);
  }

  // 카드별 구조
  if (cards.length !== 4) {
    issues.push("generic");
    suggestions.push(`카드 ${cards.length}장 — carousel4 는 4장이어야 함`);
  } else {
    const hasTarget = /\d{2,4}\s*년?생|띠/.test(cards[0]);
    if (!hasTarget) { issues.push("weak_hook"); suggestions.push("1장에 대상 식별(띠 또는 출생연도)이 없음"); }
    if (cards[0].length > 200) { issues.push("weak_hook"); suggestions.push(`1장 ${cards[0].length}자 — 60~140자 권장, 후킹이 늘어짐`); }
    if (!/남들은|겉으로|밖에선|사람들은/.test(cards[1]) || !/근데|하지만|정작|혼자/.test(cards[1])) {
      issues.push("generic");
      suggestions.push("2장에 '남들이 보는 모습 ↔ 혼자 감당한 내면' 대비가 없음");
    }
    if (!/올해|내년|하반기|\d+월|지금부터|앞으로/.test(cards[2])) {
      issues.push("generic");
      suggestions.push("3장에 시기 표현이 없음");
    }
    if (!/미리보기/.test(cards[3]) || !/전체\s*풀이/.test(cards[3])) {
      issues.push("missing_cta_boundary");
      suggestions.push("4장 CTA 가 '미리보기에서 보이는 것'과 '전체 풀이에서 더 보는 것'을 구분하지 않음");
    }
    const len = [
      [140, 1], [320, 2], [340, 3], [220, 4],
    ];
    cards.forEach((c, i) => {
      if (c.length > len[i][0] * 1.3) {
        issues.push("too_long_for_reels");
        suggestions.push(`${i + 1}장 ${c.length}자 — 권장 상한 ${len[i][0]}자 대비 과다. 릴스 카드로 쪼개기 어려움`);
      }
      if (c.length > 500) {
        issues.push("too_long_for_reels");
        suggestions.push(`${i + 1}장 ${c.length}자 — Threads 500자 상한 초과. 발행 거부됨`);
      }
    });
  }

  // 띠 - 출생연도 기계 검증
  if (post.zodiac && post.birthYears?.length) {
    const want = ZODIAC[post.zodiac.replace(/띠$/, "")];
    if (!want) { needsManualReview = true; suggestions.push(`띠 이름 '${post.zodiac}' 을 지지로 못 바꿈 — 눈으로 확인`); }
    else {
      const bad = post.birthYears.filter((y) => ganji(y)[1] !== want);
      if (bad.length) {
        issues.push("generic");
        suggestions.push(`${post.zodiac} = ${want}인데 ${bad.map((y) => `${y}(${ganji(y)})`).join(", ")} 는 안 맞음`);
      }
    }
  }

  // 원문 유사성
  const copied = copiedFrom(all);
  if (copied.length) {
    issues.push("copied_phrase");
    suggestions.push(`코퍼스와 8자 이상 연속 일치 ${copied.length}건: ${copied.slice(0, 3).map((s) => `"${s}"`).join(", ")}`);
  }

  // 반복
  const rep = repetitive(lines);
  if (rep) {
    issues.push("repetitive");
    suggestions.push(`어미 "${rep[0]}" 가 ${rep[1]}회 — 리듬이 단조로움`);
  }

  // 문자열 검사로 못 잡는 것
  if (/기운|흐름|대운/.test(all) && !/봐야|확인|기준/.test(all)) {
    needsManualReview = true;
    suggestions.push("추상적 기운 서술은 있는데 확인 기준이 없음 — 사람이 판단할 것");
  }

  const uniq = [...new Set(issues)];
  return { passed: uniq.length === 0, issues: uniq, suggestions, needsManualReview, scenes };
}

/* ------------------------------------------------------------------ CLI */
const a = process.argv.slice(2);
if (a[0] === "--id") {
  const d = JSON.parse(readFileSync("data/drafts.json", "utf8")).find((x) => x.id === a[1]);
  if (!d) { console.error("없음:", a[1]); process.exit(1); }
  const r = review({ cards: d.variants[0].pages, zodiac: d.zodiac, birthYears: d.birthYears });
  console.log(`[${r.passed ? "PASS" : "FAIL"}] ${a[1]}  장면 ${r.scenes}개${r.needsManualReview ? "  (수동확인 필요)" : ""}`);
  r.issues.forEach((x) => console.log("   X  " + x));
  r.suggestions.forEach((x) => console.log("   !  " + x));
  process.exit(r.passed ? 0 : 1);
}
