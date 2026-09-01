// 줄 길이 검사. 분기 해설(": ~") 아닌 줄이 24자를 넘으면 잡는다.
// 스와이프 코퍼스 719줄 중앙 17자 / 75% 24자 기준 (voice-profile 규칙 6-1).
//
//   node scripts/check-lines.mjs "<본문>"
//   node scripts/check-lines.mjs --id lr-172
import { readFileSync } from "node:fs";

const LIMIT = 24;
export function checkLines(body) {
  const bad = [];
  for (const raw of body.split("\n")) {
    const l = raw.trim();
    if (!l || l.startsWith(":")) continue;        // 분기 해설줄은 길어도 됨(코퍼스 중앙 52자)
    if (l.length > LIMIT) bad.push({ len: l.length, line: l, 마침표: /[^.]\.\s/.test(l) });
  }
  return bad;
}

const a = process.argv.slice(2);
if (!a.length) { console.log(readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(1, 6).join("\n")); process.exit(0); }
let body = a[0];
if (a[0] === "--id") {
  const d = JSON.parse(readFileSync("data/drafts.json", "utf8")).find((x) => x.id === a[1]);
  if (!d) { console.error("없음:", a[1]); process.exit(1); }
  body = d.variants[d.approved_variant ?? 0].pages[0];
}
const bad = checkLines(body);
const all = body.split("\n").filter((l) => l.trim() && !l.trim().startsWith(":")).map((l) => l.trim().length).sort((x, y) => x - y);
const 중앙 = all.length ? all[Math.floor(all.length / 2)] : 0;
console.log(`${bad.length ? "[FAIL]" : "[PASS]"} 줄 ${all.length}개 · 중앙 ${중앙}자 (목표 ~17자, 상한 ${LIMIT}자)`);
for (const b of bad) console.log(`   X ${String(b.len).padStart(3)}자  ${b.line}${b.마침표 ? "   <- 마침표에서 줄 나눌 것" : ""}`);
process.exit(bad.length ? 1 : 0);
