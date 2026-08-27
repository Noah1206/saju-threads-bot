// 초안의 명리 주장을 기계 검사. 참조표와 어긋나면 FAIL.
//   node scripts/check-draft.mjs "본문 텍스트"
//   node scripts/check-draft.mjs --id lr-032        drafts.json 의 해당 초안 전체 안
//   node scripts/check-draft.mjs --file inbox/x.txt
//
// 잡는 것: 지지 합/충/원진/삼합, 천간 합/충, 연도-간지, 시지-시간대, 십신, 결과보장·공포 화법
// 못 잡는 것: 해석의 타당성 (그건 claims.md 의 사람 판단 영역)
import { readFileSync } from "node:fs";

const STEMS = "갑을병정무기경신임계".split("");
const BRANCHES = "자축인묘진사오미신유술해".split("");
const STEM_EL = "목목화화토토금금수수".split("");
const GEN = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };
const CTRL = { 목: "토", 토: "수", 수: "화", 화: "금", 금: "목" };
const HOUR = [[23, 1], [1, 3], [3, 5], [5, 7], [7, 9], [9, 11], [11, 13], [13, 15], [15, 17], [17, 19], [19, 21], [21, 23]];
const YUKHAP = ["자축", "인해", "묘술", "진유", "사신", "오미"];
const CHUNG = ["자오", "축미", "인신", "묘유", "진술", "사해"];
const WONJIN = ["자미", "축오", "인유", "묘신", "진해", "사술"];
const HYEONG = ["인사", "사신", "인신", "축술", "술미", "축미", "자묘"];
const SAMHAP = { 신자진: "수", 해묘미: "목", 인오술: "화", 사유축: "금" };
const BANGHAP = { 인묘진: "목", 사오미: "화", 신유술: "금", 해자축: "수" };
const STEM_HAP = ["갑기", "을경", "병신", "정임", "무계"];
const STEM_CHUNG = ["갑경", "을신", "병임", "정계"];
const has = (list, a, b) => list.includes(a + b) || list.includes(b + a);
const ganji = (y) => STEMS[(((y - 2024) % 10) + 10) % 10] + BRANCHES[(((y - 2024) % 12) + 12 + 4) % 12];
const rels = (a, b) => {
  const r = [];
  if (has(YUKHAP, a, b)) r.push("합");
  if (has(CHUNG, a, b)) r.push("충");
  if (has(WONJIN, a, b)) r.push("원진");
  if (has(HYEONG, a, b)) r.push("형");
  return r;
};
function sipsin(me, other) {
  const [e1, e2] = [STEM_EL[STEMS.indexOf(me)], STEM_EL[STEMS.indexOf(other)]];
  const same = STEMS.indexOf(me) % 2 === STEMS.indexOf(other) % 2;
  if (e1 === e2) return same ? "비견" : "겁재";
  if (GEN[e1] === e2) return same ? "식신" : "상관";
  if (CTRL[e1] === e2) return same ? "편재" : "정재";
  if (CTRL[e2] === e1) return same ? "편관" : "정관";
  return same ? "편인" : "정인";
}

// "올해" 의 기준 연도. 해가 바뀌면 이 값을 고치거나 BASE_YEAR 환경변수로 넘긴다.
const BASE = Number(process.env.BASE_YEAR ?? 2026);
const B = `[${BRANCHES.join("")}]`, S = `[${STEMS.join("")}]`;
const FAIL = [], WARN = [], OK = [];

export function check(text) {
  FAIL.length = WARN.length = OK.length = 0;

  // 1. 지지 2글자 + 관계어
  for (const m of text.matchAll(new RegExp(`(${B})(${B})\\s*(합|충|원진|형)`, "g"))) {
    const [, a, b, kind] = m;
    if (a === b) continue;
    const r = rels(a, b);
    const claim = `${a}${b}${kind}`;
    if (r.includes(kind)) OK.push(claim);
    else if (kind === "합" && Object.keys(SAMHAP).some((k) => k.includes(a) && k.includes(b))) OK.push(`${claim} (삼합 일부)`);
    else if (kind === "합" && Object.keys(BANGHAP).some((k) => k.includes(a) && k.includes(b))) OK.push(`${claim} (방합 일부)`);
    else { FAIL.push(`${claim} -> 실제 ${a}·${b} 관계는 ${r.length ? r.join("·") : "없음"}`); continue; }

    // 시점 검사: 앞 30자에 올해/내년/연도가 있으면 그 해의 지지가 쌍에 들어 있어야 함
    const before = text.slice(Math.max(0, m.index - 30), m.index);
    const tm = [...before.matchAll(/(올해|내년|후년|작년|재작년|20\d\d)/g)].pop();
    if (!tm) continue;
    const y = { 재작년: BASE - 2, 작년: BASE - 1, 올해: BASE, 내년: BASE + 1, 후년: BASE + 2 }[tm[1]] ?? +tm[1];
    const yb = ganji(y)[1];
    if (a !== yb && b !== yb)
      FAIL.push(`"${tm[1]}...${claim}" -> ${y}년은 ${ganji(y)}년(지지 ${yb}). ${yb}${a === yb ? "" : a}${b === yb ? "" : b} 로 엮이지 않음 · ${a}/${b} 와 ${yb} 관계는 ${rels(a, yb).join("·") || "-"} / ${rels(b, yb).join("·") || "-"}`);
    else OK.push(`${claim} @${y}(${ganji(y)})`);
  }
  // 2. 천간 합/충
  for (const m of text.matchAll(new RegExp(`(${S})(${S})\\s*(합|충)`, "g"))) {
    const [, a, b, kind] = m;
    if (a === b) continue;
    const ok = kind === "합" ? has(STEM_HAP, a, b) : has(STEM_CHUNG, a, b);
    const claim = `${a}${b}${kind}`;
    if (ok) OK.push(claim);
    else FAIL.push(`${claim} -> 천간합은 ${STEM_HAP.join("·")}, 충은 ${STEM_CHUNG.join("·")}`);
  }
  // 3. 삼합 오행
  for (const m of text.matchAll(new RegExp(`(신자진|해묘미|인오술|사유축)\\s*(?:삼합)?\\s*[(·)]?\\s*(${"목화토금수"}[)]?)?`, "g"))) {
    const [, k, el] = m;
    if (el) { const e = el.replace(")", ""); if (SAMHAP[k] !== e) FAIL.push(`${k}=${e} -> ${k} 는 ${SAMHAP[k]}`); else OK.push(`${k}(${e})`); }
  }
  // 4. 연도 - 간지
  for (const m of text.matchAll(new RegExp(`(20\\d\\d)\\s*년?\\s*(${S})(${B})`, "g"))) {
    const [, y, s, b] = m, real = ganji(+y), claim = `${y} ${s}${b}`;
    if (real !== s + b) FAIL.push(`${claim}년 -> ${y}년은 ${real}년`);
    else OK.push(claim + "년");
  }
  // 5. 시지 - 시간대
  for (const m of text.matchAll(new RegExp(`(${B})시\\s*\\(?\\s*(\\d{1,2})\\s*[~-]\\s*(\\d{1,2})\\s*시`, "g"))) {
    const [, b, f, t] = m, [rf, rt] = HOUR[BRANCHES.indexOf(b)], claim = `${b}시 ${f}~${t}시`;
    if (+f !== rf || +t !== rt) FAIL.push(`${claim} -> ${b}시는 ${rf}~${rt}시`);
    else OK.push(claim);
  }
  // 6. 십신: "X가 Y한테 정관" / "X = 정관" 형태 중 일간이 문맥에 있는 경우만
  // 십신 라벨 뒤에 다른 천간이 오면 그 라벨은 뒤 글자 소유이므로 건너뛴다 (오탐 방지)
  for (const m of text.matchAll(new RegExp(`(${S})(?:목|화|토|금|수)?\\s*일간[^\\n]{0,40}?(${S})(?:목|화|토|금|수)?\\s*(?:가|는|이)\\s*(비견|겁재|식신|상관|편재|정재|편관|정관|편인|정인)(?!\\s*${S}(?:목|화|토|금|수))`, "g"))) {
    const [, me, other, t] = m, real = sipsin(me, other), claim = `${me}일간 × ${other} = ${t}`;
    if (real !== t) FAIL.push(`${claim} -> 실제 ${real}`);
    else OK.push(claim);
  }
  // 7. 결과 보장 · 공포 · 단정 (플랫폼 리스크 + 명리적으로도 말이 안 됨)
  const BAD = [
    [/무조건\s*(재회|성공|잘됨|됨)/, "결과 보장"],
    [/100\s*%|백퍼|반드시\s*(옴|됨|함)|절대\s*(안|못)\s*\S+할\s*리\s*없/, "확률 단정"],
    [/(넘기면|안\s*보면|무시하면)\s*[^\n]{0,10}(불행|나빠|망|안\s*좋)/, "공포 조장"],
    [/(암|불치|시한부|죽|사망|이혼하게\s*됨|파산함)/, "의료·중대사 단정"],
    [/사주\s*상\s*(반드시|무조건)/, "운명 단정"],
    [/\d[\d,]*\s*원(?!국|진|칙|래|본|인|형)/, "가격 노출"],
    [/할인|특가|반값|최저가|세일|쿠폰|선착순|오늘까지만|결제하면|무료/, "프로모션 문구"],
  ];
  for (const [re, why] of BAD) { const m = text.match(re); if (m) FAIL.push(`금지 화법(${why}): "${m[0]}"`); }
  // 8. 한정 조항 유무 (명리 주장이 있는데 한정이 없으면 경고)
  const hasClaim = OK.length + FAIL.length > 0;
  if (hasClaim && !/(전체\s*사주|상대\s*사주|일지까지|원국|봐야|나옴)/.test(text)) WARN.push("한정 조항 없음 (\"전체 사주 봐야 함\" 류 1곳 권장)");
  return { FAIL: [...FAIL], WARN: [...WARN], OK: [...OK] };
}

const a = process.argv.slice(2);
if (a.length) {
  let items = [];
  if (a[0] === "--id") {
    const d = JSON.parse(readFileSync("data/drafts.json", "utf8")).find((x) => x.id === a[1]);
    if (!d) { console.error("없음:", a[1]); process.exit(1); }
    items = d.variants.map((v, i) => [`${a[1]} ${i}안`, (Array.isArray(v.pages) ? v.pages : [v.text]).join("\n")]);
  } else if (a[0] === "--file") items = [[a[1], readFileSync(a[1], "utf8")]];
  else items = [["입력", a.join(" ")]];

  let bad = 0;
  for (const [name, text] of items) {
    const r = check(text);
    const mark = r.FAIL.length ? "FAIL" : r.WARN.length ? "WARN" : "PASS";
    console.log(`\n[${mark}] ${name}  (검증 ${r.OK.length}건)`);
    r.OK.forEach((x) => console.log("   OK   " + x));
    r.WARN.forEach((x) => console.log("   !    " + x));
    r.FAIL.forEach((x) => console.log("   X    " + x));
    if (r.FAIL.length) bad++;
  }
  process.exit(bad ? 1 : 0);
}
