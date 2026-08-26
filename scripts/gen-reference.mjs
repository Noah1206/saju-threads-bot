// 세운·지지 관계 참조표 생성기. 기억으로 쓰지 말고 이 표를 대조할 것.
//   node scripts/gen-reference.mjs  ->  data/reference/seun.md
import { writeFileSync, mkdirSync } from "node:fs";

const STEMS = "갑을병정무기경신임계".split("");
const BRANCHES = "자축인묘진사오미신유술해".split("");
const STEM_EL = "목목화화토토금금수수".split("");
const BR_EL = "수토목목토화화토금금토수".split("");
const BR_HOUR = ["23~1시","1~3시","3~5시","5~7시","7~9시","9~11시","11~13시","13~15시","15~17시","17~19시","19~21시","21~23시"];
const ZODIAC = ["쥐","소","호랑이","토끼","용","뱀","말","양","원숭이","닭","개","돼지"];
const GEN = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };
const CTRL = { 목: "토", 토: "수", 수: "화", 화: "금", 금: "목" };

// 기본 쌍 (여기만 사람이 검증하면 나머지는 자동)
const STEM_HAP = ["갑기", "을경", "병신", "정임", "무계"];
const STEM_CHUNG = ["갑경", "을신", "병임", "정계"];
const YUKHAP = ["자축", "인해", "묘술", "진유", "사신", "오미"];
const CHUNG = ["자오", "축미", "인신", "묘유", "진술", "사해"];
const WONJIN = ["자미", "축오", "인유", "묘신", "진해", "사술"];
const SAMHAP = { 신자진: "수", 해묘미: "목", 인오술: "화", 사유축: "금" };
const BANGHAP = { 인묘진: "목(봄)", 사오미: "화(여름)", 신유술: "금(가을)", 해자축: "수(겨울)" };
const HYEONG = ["인사", "사신", "인신", "축술", "술미", "축미", "자묘"];
const SELF_HYEONG = ["진", "오", "유", "해"];
const DOHWA = ["자", "오", "묘", "유"];
const YEOKMA = ["인", "신", "사", "해"];
const HWAGAE = ["진", "술", "축", "미"];

const pair = (list, a, b) => list.includes(a + b) || list.includes(b + a);
function rel(a, b) {
  const r = [];
  if (a === b) r.push(SELF_HYEONG.includes(a) ? "같은 글자(자형)" : "같은 글자");
  if (pair(YUKHAP, a, b)) r.push("육합");
  if (pair(CHUNG, a, b)) r.push("충");
  if (pair(WONJIN, a, b)) r.push("원진");
  if (pair(HYEONG, a, b)) r.push("형");
  for (const [k, v] of Object.entries(SAMHAP)) if (k.includes(a) && k.includes(b) && a !== b) r.push(`삼합(${k}·${v})`);
  for (const [k, v] of Object.entries(BANGHAP)) if (k.includes(a) && k.includes(b) && a !== b) r.push(`방합(${k}·${v})`);
  return r.length ? r.join("·") : "-";
}
function sipsin(me, other) {
  const [e1, e2] = [STEM_EL[STEMS.indexOf(me)], STEM_EL[STEMS.indexOf(other)]];
  const same = STEMS.indexOf(me) % 2 === STEMS.indexOf(other) % 2;
  if (e1 === e2) return same ? "비견" : "겁재";
  if (GEN[e1] === e2) return same ? "식신" : "상관";
  if (CTRL[e1] === e2) return same ? "편재" : "정재";
  if (CTRL[e2] === e1) return same ? "편관" : "정관";
  return same ? "편인" : "정인";
}
// 60갑자: 2024 = 갑진
function ganji(year) { const i = year - 2024; return STEMS[((i % 10) + 10) % 10] + BRANCHES[((i % 12) + 12 + 4) % 12]; }
// 월건: 인월 천간 = 년간 기준 (갑기→병, 을경→무, 병신→경, 정임→임, 무계→갑)
function months(year) {
  const ys = ganji(year)[0];
  const start = { 갑: 2, 기: 2, 을: 4, 경: 4, 병: 6, 신: 6, 정: 8, 임: 8, 무: 0, 계: 0 }[ys];
  const jeolgi = ["입춘 2/4경","경칩 3/6경","청명 4/5경","입하 5/6경","망종 6/6경","소서 7/7경","입추 8/7경","백로 9/8경","한로 10/8경","입동 11/7경","대설 12/7경","소한 1/6경(익년)"];
  return Array.from({ length: 12 }, (_, m) => ({ name: STEMS[(start + m) % 10] + BRANCHES[(m + 2) % 12], from: jeolgi[m] }));
}

const YEARS = Array.from({ length: 12 }, (_, i) => 2024 + i);
let md = `# 세운·지지 관계 참조표 (자동 생성 — 수정은 scripts/gen-reference.mjs 에서)

> **글에 연도·간지·합충·십신을 쓸 때는 반드시 이 표와 대조한다.** 기억으로 쓰지 않는다.
> 2026-08-26 사고: "내년 자축합"이라고 썼으나 2027 정미년은 자수와 **자미 원진**. 자축합은 2033 계축년. 댓글로 지적받음.

## 1. 연도 간지

| 연도 | 간지 | 띠 | 년지와 육합 | 충 | 원진 | 삼합 |
|---|---|---|---|---|---|---|
`;
for (const y of YEARS) {
  const g = ganji(y), b = g[1];
  const f = (list) => { const p = list.find((x) => x.includes(b)); return p ? p.replace(b, "") : "-"; };
  const s = Object.keys(SAMHAP).find((k) => k.includes(b));
  md += `| ${y} | ${g}년 | ${ZODIAC[BRANCHES.indexOf(b)]}띠 | ${f(YUKHAP)} | ${f(CHUNG)} | ${f(WONJIN)} | ${s}(${SAMHAP[s]}) |\n`;
}

md += `\n## 2. 내 지지 × 세운 지지 관계 (행: 내 일지·년지 등, 열: 해당 연도)\n\n| 내 지지 |`;
const Y2 = YEARS.filter((y) => y >= 2026);
md += Y2.map((y) => ` ${y} ${ganji(y)[1]} |`).join("") + "\n|---|" + Y2.map(() => "---|").join("") + "\n";
for (const a of BRANCHES) md += `| **${a}** (${ZODIAC[BRANCHES.indexOf(a)]}띠·${BR_HOUR[BRANCHES.indexOf(a)]}) |` + Y2.map((y) => ` ${rel(a, ganji(y)[1])} |`).join("") + "\n";

md += `\n## 3. 내 일간 × 세운 천간 십신 (열: 연도 천간)\n\n| 일간 |` + Y2.map((y) => ` ${y} ${ganji(y)[0]} |`).join("") + "\n|---|" + Y2.map(() => "---|").join("") + "\n";
for (const s of STEMS) {
  md += `| **${s}${STEM_EL[STEMS.indexOf(s)]}** |` + Y2.map((y) => {
    const o = ganji(y)[0]; const t = sipsin(s, o);
    const hap = pair(STEM_HAP, s, o) ? " **합**" : pair(STEM_CHUNG, s, o) ? " 충" : "";
    return ` ${t}${hap} |`;
  }).join("") + "\n";
}

md += `\n천간합: ${STEM_HAP.join(" · ")} / 천간충: ${STEM_CHUNG.join(" · ")}\n`;

md += `\n## 4. 월건 (절입일 기준 — 양력 1일이 아님)\n`;
for (const y of [2026, 2027]) {
  md += `\n### ${y} ${ganji(y)}년\n| 월 | 간지 | 시작 |\n|---|---|---|\n`;
  months(y).forEach((m, i) => { md += `| ${i + 1} | ${m.name}월 | ${m.from} |\n`; });
}

md += `\n## 5. 지지 기본 쌍 (사람이 검증한 원본 — 나머지 표는 여기서 계산)

- 육합: ${YUKHAP.join(" · ")}
- 충: ${CHUNG.join(" · ")}
- 원진: ${WONJIN.join(" · ")}
- 형: ${HYEONG.join(" · ")} / 자형: ${SELF_HYEONG.join(" · ")}
- 삼합: ${Object.entries(SAMHAP).map(([k, v]) => `${k}(${v})`).join(" · ")}
- 방합: ${Object.entries(BANGHAP).map(([k, v]) => `${k}(${v})`).join(" · ")}
- 도화: ${DOHWA.join("·")} / 역마: ${YEOKMA.join("·")} / 화개: ${HWAGAE.join("·")}
- 지지 오행: ${BRANCHES.map((b, i) => b + BR_EL[i]).join(" ")}
- 시지: ${BRANCHES.map((b, i) => `${b}시 ${BR_HOUR[i]}`).join(" / ")}

## 6. 십신 규칙
같은 오행 = 비견(음양 같음)/겁재 · 내가 생함 = 식신/상관 · 내가 극함 = 편재/정재 · 나를 극함 = 편관/정관 · 나를 생함 = 편인/정인
(앞이 음양 같을 때, 뒤가 다를 때)
`;
mkdirSync("data/reference", { recursive: true });
writeFileSync("data/reference/seun.md", md);
console.log("data/reference/seun.md 생성");
