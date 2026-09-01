// 웹 챗(claude.ai)에서 뽑은 초안을 data/drafts.json 에 넣는다. 승인된 안 1개 = 파일 1개.
//
// node scripts/import-draft.mjs inbox/xxx.txt
// node scripts/import-draft.mjs inbox/xxx.txt --product jaehoe 답글에 상품 링크 자동
// node scripts/import-draft.mjs inbox/ 폴더면 안의 .txt 전부 (처리 후 .done)
//
// 파일 형식: 본문 그대로. 답글(2/2)을 직접 쓰려면 본문 뒤에 "=====" 한 줄 넣고 그 아래에.
// 첫 줄이 "# 메모:" 로 시작하면 hook_type 메모로 저장하고 본문에서 뺀다.
import { readFileSync, writeFileSync, readdirSync, renameSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const target = args.find((a) => !a.startsWith("--"));
if (!target) { console.log(readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(1, 10).join("\n")); process.exit(1); }
const product = args.includes("--product") ? args[args.indexOf("--product") + 1] : null;
const file = "data/drafts.json";
const prefix = "lr-";
// 상품 목록은 data/products.md 가 단일 출처. 표 행에서 slug|이름 을 읽는다.
const PRODUCTS = Object.fromEntries(readFileSync("data/products.md", "utf8").split("\n")
  .map((l) => l.match(/^\|\s*([a-z]+)\s*\|\s*([^|]+?)\s*\|/))
  .filter((m) => m && m[1] !== "slug").map((m) => [m[1], m[2]]));
if (product && !PRODUCTS[product]) { console.error("상품 slug 없음:", product, "->", Object.keys(PRODUCTS).join(" ")); process.exit(1); }

const banned = readFileSync(".claude/skills/threads-voice/references/banned.md", "utf8").split("\n").filter((l) => l.startsWith("- ")).map((l) => l.slice(2).split(" (")[0].split(" / ")).flat().map((s) => s.replace(/^~/, "").trim()).filter((s) => s.length > 1);

const drafts = JSON.parse(readFileSync(file, "utf8"));
const files = statSync(target).isDirectory() ? readdirSync(target).filter((f) => f.endsWith(".txt")).map((f) => join(target, f)) : [target];
let added = 0;
for (const f of files) {
 let raw = readFileSync(f, "utf8").replace(/\r\n/g, "\n").trim();
 let hook_type = "웹 챗 초안";
 if (raw.startsWith("# 메모:")) { const nl = raw.indexOf("\n"); hook_type = raw.slice(5, nl).trim(); raw = raw.slice(nl + 1).trim(); }
 let [body, reply] = raw.split(/\n=====+\n/);
 body = body.trim();
 if (!reply && product) reply = `${PRODUCTS[product]} 미리보기\nhttps://loverebbit.xyz/product/${product}\n생년월일만 넣으면 됨`;
 const pages = reply ? [body, reply.trim()] : [body];
 const hits = banned.filter((b) => body.includes(b));
 const polite = body.split("\n").filter((l) => /(니다|세요|해요|어요|예요|네요)$/.test(l.trim())).length;
 const problems = [];
 if (body.length > 500) problems.push(`${body.length}자 (500 초과)`);
 if (hits.length) problems.push(`금지어: ${hits.join(", ")}`);
 if (polite) problems.push(`존대 어미 ${polite}줄`);
 const n = Math.max(0, ...drafts.map((d) => Number(d.id.split("-")[1]) || 0)) + 1;
 const id = prefix + String(n).padStart(3, "0");
 const ok = problems.length === 0;
 drafts.push({ id, source: `web-chat:${f.replace(/\\/g, "/")}`, product: product || undefined, created: new Date().toISOString().slice(0, 10),
 variants: [{ hook_type, pages, chars: body.length, checks_passed: ok }], status: ok ? "approved" : "pending", approved_variant: 0, approved_at: ok ? new Date().toISOString().slice(0, 10) : undefined,
 import_problems: ok ? undefined : problems });
 console.log(`${id} <- ${f} ${body.length}자 ${ok ? "approved" : "pending: " + problems.join(" / ")}`);
 if (statSync(target).isDirectory()) renameSync(f, f + ".done");
 added++;
}
writeFileSync(file, JSON.stringify(drafts, null, 2) + "\n");
console.log(`${added}건 -> ${file}. 발행: npm run publish -- --all`);
