// drafts.json / posts.json 발췌 조회. 큰 JSON 을 통째로 컨텍스트에 올리지 않기 위한 도구.
//
//   node scripts/drafts.mjs                 요약 (건수 + 상태별)
//   node scripts/drafts.mjs list            id / status / 첫 줄 / 상품
//   node scripts/drafts.mjs pending         승인 대기만
//   node scripts/drafts.mjs show lr-032     한 건 전문 (모든 안)
//   node scripts/drafts.mjs grep 재회       본문에 그 말이 든 초안의 id + 첫 줄
//   node scripts/drafts.mjs posts           성과 요약 (sync 후) — tier 별 조회수
//   node scripts/drafts.mjs posts top 5     조회수 상위 5건 (id / 조회수 / 첫 줄)
import { readFileSync, existsSync } from "node:fs";
const read = (f) => (existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : []);
const D = () => read("data/drafts.json");
const P = () => read("data/posts.json");
const head = (v) => (Array.isArray(v.pages) ? v.pages[0] : v.text).split("\n")[0].slice(0, 46);
const [cmd = "summary", a, b] = process.argv.slice(2);

if (cmd === "summary") {
  const d = D(), s = {};
  d.forEach((x) => (s[x.status] = (s[x.status] || 0) + 1));
  console.log(`drafts ${d.length}건 ${JSON.stringify(s)}  (마지막 ${d.at(-1)?.id})`);
  const p = P();
  console.log(`posts ${p.length}건` + (p.length ? ` | WIN ${p.filter((x) => x.tier === "WIN").length} MID ${p.filter((x) => x.tier === "MID").length} LOSS ${p.filter((x) => x.tier === "LOSS").length}` : " (npm run sync 아직 안 돌림)"));
} else if (cmd === "list" || cmd === "pending") {
  D().filter((x) => (cmd === "pending" ? x.status !== "published" : true))
    .forEach((x) => console.log(`${x.id}  ${x.status.padEnd(9)} ${x.product ?? "-"}  ${head(x.variants[x.published_variant ?? x.approved_variant ?? 0])}`));
} else if (cmd === "show") {
  const x = D().find((v) => v.id === a);
  if (!x) { console.error("없음:", a); process.exit(1); }
  console.log(`${x.id} | ${x.status} | 상품 ${x.product ?? "-"} | ${x.published_id ?? ""}`);
  x.variants.forEach((v, i) => {
    console.log(`\n--- ${i}안 [${v.hook_type}] ${v.chars}자 ${i === (x.approved_variant ?? -1) ? "(승인)" : ""} ---`);
    (Array.isArray(v.pages) ? v.pages : [v.text]).forEach((p, j) => console.log((j ? "\n[답글]\n" : "") + p));
  });
  if (x.erratum) console.log("\n[정정]", JSON.stringify(x.erratum));
} else if (cmd === "grep") {
  D().forEach((x) => x.variants.forEach((v) => {
    const t = (Array.isArray(v.pages) ? v.pages : [v.text]).join("\n");
    if (t.includes(a)) console.log(`${x.id}  ${head(v)}`);
  }));
} else if (cmd === "posts") {
  const p = P();
  if (!p.length) { console.log("posts.json 비어 있음. npm run sync 먼저."); process.exit(0); }
  if (a === "top") {
    [...p].sort((x, y) => y.views - x.views).slice(0, Number(b) || 5)
      .forEach((x) => console.log(`${x.views.toString().padStart(6)} views  ${x.tier ?? "-"}  ${x.text.split("\n")[0].slice(0, 40)}`));
  } else {
    for (const t of ["WIN", "MID", "LOSS"]) {
      const g = p.filter((x) => x.tier === t);
      if (!g.length) continue;
      const avg = (k) => Math.round(g.reduce((s, x) => s + x[k], 0) / g.length);
      console.log(`${t.padEnd(5)} ${g.length}건 | 평균 조회 ${avg("views")} 좋아요 ${avg("likes")} 댓글 ${avg("replies")}`);
    }
  }
} else console.log(readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(1, 11).join("\n"));
