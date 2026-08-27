// 4장 캐러셀 원고 생성기. 벤치마크에서 뽑은 것은 구조뿐이고 문장은 저장하지 않는다.
//
//   node scripts/carousel4.mjs briefs/dak.json           생성 + 검수 (저장 안 함)
//   node scripts/carousel4.mjs briefs/dak.json --save    통과하면 drafts.json 에 pending 으로 저장
//   node scripts/carousel4.mjs --demo                    내장 예시로 한 번 돌려보기
//
// brief 스키마 (ZodiacBrief 를 이 저장소에 맞춘 것):
//   zodiac        "닭"            띠 이름
//   birthYears    [1969,1981,...] 출생연도 — 띠와 안 맞으면 검수에서 FAIL
//   topic         wealth|love|reunion|career|temperament
//   emotion       놀람|안도|의문|애틋함  (1장 감정 반응. 같은 걸 반복하지 말 것)
//   timeWindow    "올해 하반기"
//   visibleTrait  남들이 보는 모습 (형용 아님, 평가 문장)
//   hiddenStruggle 혼자 감당한 것
//   concreteScenes [ "...", "...", "..." ]  관찰 가능한 행동 3개 이상
//   saju          { term: "유금", plain: "일상어 번역" }
//   practicalShift 실천 전환 한 가지
//   productName / productSlug / cta
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { review } from "./content-review.mjs";

const ZODIAC_EMOJI = { 쥐: "🐭", 소: "🐮", 호랑이: "🐯", 토끼: "🐰", 용: "🐉", 뱀: "🐍", 말: "🐴", 양: "🐑", 원숭이: "🐵", 닭: "🐔", 개: "🐶", 돼지: "🐷" };

const TOPIC_LABEL = {
  wealth: "돈이 붙는 자리", love: "연애가 붙는 자리", reunion: "옛 인연이 도는 자리",
  career: "일이 풀리는 자리", temperament: "타고난 결",
};

/** 받침 유무로 조사를 고른다. 슬롯을 문장에 끼울 때 "사람 라고" 같은 게 나오지 않게. */
function josa(word, withBatchim, withoutBatchim) {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return withoutBatchim; // 한글 아니면 받침 없음 취급
  return (code - 0xac00) % 28 ? withBatchim : withoutBatchim;
}
const j = (w, pair) => w + josa(w, ...pair.split("/"));

/**
 * 슬롯을 구조 템플릿에 끼워 4장을 만든다.
 * 템플릿은 문장이 아니라 배치다 — 어떤 슬롯이 몇 번째 줄에 오는지만 정한다.
 */
export function buildCards(b) {
  const z = b.zodiac.replace(/띠$/, "");
  const emoji = ZODIAC_EMOJI[z] ?? "";
  const years = b.birthYears.map((y) => String(y).slice(2)).join("·");
  const scenes = b.concreteScenes ?? [];

  // 1장 — 대상 식별 + 감정 반응 + 미완결 절단
  const c1 = [
    `${z}띠 사주 펼쳐 놓고 ${b.emotion ?? "한참을 봤다"} ${emoji}`.trim(),
    `${years}년생 얘기임`,
    b.hook1 ?? `왜 여태 이 자리였는지가 여기서 갈림`,
  ].join("\n");

  // 2장 — 남들이 보는 모습 ↔ 혼자 감당한 것 + 장면 + 용어 번역
  const c2 = [
    `남들은 ${z}띠를 ${j(b.visibleTrait, "이라고/라고")} 봄`,
    `근데 정작 본인은 다르게 알고 있음`,
    ...scenes.slice(0, 2).map((s) => `: ${s}`),
    `${j(b.hiddenStruggle, "을/를")} 혼자 처리해 온 쪽임`,
    ``,
    `${z}띠는 지지가 ${b.saju.branch}임`,
    `${j(b.saju.term, "은/는")} ${b.saju.plain}`,
    `밖에서는 ${j(b.visibleTrait, "으로/로")} 보이는데`,
    `안에서는 ${j(b.hiddenStruggle, "으로/로")} 남음`,
  ].join("\n");

  // 3장 — 시기 + 누적 + 실천 전환 (보장 아님, 가능성)
  const c3 = [
    `${j(b.timeWindow, "이/가")} 점검하기 좋은 구간임`,
    `${TOPIC_LABEL[b.topic] ?? "그 자리"}가 열릴 수 있는 흐름이 들어옴`,
    ...scenes.slice(2, 3).map((s) => `: ${s}`),
    `그동안 쌓인 게 ${b.accumulated ?? "경험"} 쪽으로 붙을 여지가 생김`,
    ``,
    `다만 저절로 되는 게 아님`,
    `${b.practicalShift}`,
    `이거 하나 바꾸는지로 같은 구간이 다르게 지나감`,
  ].join("\n");

  // 4장 — 요약 + CTA (미리보기 / 전체 풀이 경계 명시, 공포·판매 압박 없음)
  const c4 = [
    `${emoji} ${z}띠 ${b.birthYears.join(" ")}`,
    `${b.summary ?? `${TOPIC_LABEL[b.topic]}가 어디에 붙었는지 확인해볼 만함`}`,
    ``,
    `미리보기에서는 반복되는 패턴이 어디서 걸리는지까지 나옴`,
    `${b.productName} 전체 풀이에서는 ${b.cta ?? "시기와 확인 기준"}까지 봄`,
    b.productSlug ? `https://loverebbit.xyz/product/${b.productSlug}` : "",
    `생년월일만 넣으면 됨`,
  ].filter(Boolean).join("\n");

  return [c1, c2, c3, c4];
}

/** 릴스 장면 카드로 쪼갠다. 카드당 최대 4줄. */
export function toReelScenes(cards) {
  const ROLE = ["hook", "scene", "interpretation", "cta"];
  const DUR = [3200, 4500, 5000, 4000];
  const out = [];
  let order = 0;
  cards.forEach((c, ci) => {
    const lines = c.split("\n").filter((l) => l.trim() && !/^https?:/.test(l));
    for (let i = 0; i < lines.length; i += 4) {
      out.push({
        order: ++order,
        type: ROLE[ci],
        text: lines.slice(i, i + 4).join("\n"),
        durationMs: DUR[ci],
      });
    }
  });
  return out;
}

const DEMO = {
  zodiac: "닭", birthYears: [1969, 1981, 1993, 2005], topic: "career",
  emotion: "손이 한 번 멈췄다", timeWindow: "올해 하반기",
  visibleTrait: "빈틈이 없는 사람", hiddenStruggle: "남이 흘린 것까지 대신 정리하던 시간",
  concreteScenes: [
    "회의 끝나고 남이 놓친 걸 혼자 다시 확인함",
    "보내기 전 문장을 세 번 고쳐 읽고도 마음에 안 듦",
    "내 공이 남 이름으로 올라가도 그 자리에서 말을 못 함",
  ],
  saju: { branch: "유금", term: "유금", plain: "깎아서 정확하게 만드는 글자임. 빠르기보다 틀리지 않는 쪽으로 감" },
  accumulated: "다듬어 온 정확도",
  practicalShift: "남 빈자리 메우기 전에 내 몫부터 이름 붙여 두기",
  summary: "일이 풀리는 자리가 어디 붙었는지 확인해볼 만함",
  productName: "직업 사주", productSlug: null, cta: "언제부터 흐름이 바뀌는지와 확인 기준",
};

/* ------------------------------------------------------------------ CLI */
const a = process.argv.slice(2);
if (a.length) {
  const brief = a[0] === "--demo" ? DEMO : JSON.parse(readFileSync(a[0], "utf8"));
  const cards = buildCards(brief);

  cards.forEach((c, i) => console.log(`\n--- ${i + 1}/4 · ${c.length}자 ---\n${c}`));

  const r = review({ cards, zodiac: brief.zodiac, birthYears: brief.birthYears });
  console.log(`\n[검수 ${r.passed ? "PASS" : "FAIL"}] 장면 ${r.scenes}개${r.needsManualReview ? " (수동확인 필요)" : ""}`);
  r.issues.forEach((x) => console.log("   X  " + x));
  r.suggestions.forEach((x) => console.log("   !  " + x));

  // 명리 사실은 기존 검사기에 맡긴다
  try {
    const out = execFileSync("node", ["scripts/check-draft.mjs", cards.join("\n")], { encoding: "utf8" });
    console.log("\n[명리] " + (out.match(/\[(PASS|WARN|FAIL)\][^\n]*/) ?? ["?"])[0]);
  } catch (e) {
    console.log("\n[명리] FAIL");
    console.log((e.stdout ?? "").split("\n").filter((l) => l.includes("X")).join("\n"));
  }

  console.log(`\n릴스 장면 ${toReelScenes(cards).length}개`);

  if (a.includes("--save")) {
    if (!r.passed) { console.error("\n검수 FAIL — 저장하지 않음"); process.exit(1); }
    const drafts = existsSync("data/drafts.json") ? JSON.parse(readFileSync("data/drafts.json", "utf8")) : [];
    const n = Math.max(0, ...drafts.map((x) => +String(x.id).split("-")[1] || 0)) + 1;
    const id = "lr-" + String(n).padStart(3, "0");
    drafts.push({
      id, topic: `${brief.zodiac}띠 ${brief.topic} (carousel4)`, product: brief.productSlug ?? null,
      created: new Date().toISOString().slice(0, 10), batch: "carousel4",
      zodiac: brief.zodiac, birthYears: brief.birthYears,
      variants: [{ hook_type: "carousel4 (대상식별→대비→시기전환→CTA)", pages: cards, chars: cards.join("").length, checks_passed: true }],
      reelScenes: toReelScenes(cards),
      status: "pending",
    });
    writeFileSync("data/drafts.json", JSON.stringify(drafts, null, 2) + "\n");
    console.log(`\n저장: ${id} (status=pending — 사람이 승인해야 발행됨)`);
  }
}
