// 참조표 부분 조회 — seun.md 전체를 읽지 말고 이걸로 필요한 줄만 뽑는다.
//   node scripts/lookup.mjs 인 2026        내 지지 인 × 2026년 관계
//   node scripts/lookup.mjs 신금 2026      일간 신금 × 2026 천간 십신
//   node scripts/lookup.mjs 2027           연도 한 줄 (간지·띠·합충원진삼합)
//   node scripts/lookup.mjs 월 2026        그 해 월건 12줄
//   node scripts/lookup.mjs 쌍             기본 쌍 목록
import { readFileSync } from "node:fs";
const md = readFileSync(new URL("../data/reference/seun.md", import.meta.url), "utf8").split("\n");
const [a, b] = process.argv.slice(2);
const table = (title) => { const i = md.findIndex((l) => l.startsWith(title)); const rows = []; for (let j = i + 2; j < md.length && md[j].startsWith("|"); j++) rows.push(md[j]); return rows; };
const cells = (l) => l.split("|").slice(1, -1).map((s) => s.trim());
const out = [];
if (!a) { console.log(readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(1, 7).join("\n")); process.exit(0); }
if (a === "쌍") { const i = md.findIndex((l) => l.startsWith("## 5.")); out.push(...md.slice(i + 2, i + 12)); }
else if (a === "월") { const i = md.findIndex((l) => l.startsWith(`### ${b}`)); for (let j = i; j < md.length && md[j] && !md[j].startsWith("## "); j++) out.push(md[j]); }
else if (/^\d{4}$/.test(a)) { const r = table("| 연도 |").find((l) => l.startsWith(`| ${a} `)); out.push("| 연도 | 간지 | 띠 | 육합 | 충 | 원진 | 삼합 |", r); }
else {
  const isStem = a.length === 2;
  const rows = table(isStem ? "| 일간 |" : "| 내 지지 |");
  const head = cells(md[md.findIndex((l) => l.startsWith(isStem ? "| 일간 |" : "| 내 지지 |"))]);
  const r = rows.find((l) => l.startsWith(`| **${a}**`));
  if (!r) { console.error("없음:", a); process.exit(1); }
  const c = cells(r);
  if (b) { const k = head.findIndex((h) => h.startsWith(b)); out.push(`${c[0]} × ${head[k]} = ${c[k]}`); }
  else head.slice(1).forEach((h, k) => out.push(`${c[0]} × ${h} = ${c[k + 1]}`));
}
console.log(out.join("\n"));
