// 생년월일 -> 사주 네 기둥 + 올해 걸리는 달. 댓글로 받은 생일에 리포트를 만들 때 쓴다.
//
//   node scripts/saju.mjs 1995-03-14           년월일만 (시주 없음)
//   node scripts/saju.mjs 1995-03-14 14:30     시주까지
//   node scripts/saju.mjs 1995-03-14 --year 2026   기준 연도 지정 (기본 올해)
//
// 절입 시각은 근사(± 하루)다. 경계 하루 이내면 WARN 을 띄우니 그때는 만세력으로 확인할 것.
import { readFileSync } from "node:fs";

const 천간 = ["갑","을","병","정","무","기","경","신","임","계"];
const 지지 = ["자","축","인","묘","진","사","오","미","신","유","술","해"];
const 오행 = { 갑:"목",을:"목",병:"화",정:"화",무:"토",기:"토",경:"금",신:"금",임:"수",계:"수" };
const 지지오행 = { 인:"목",묘:"목",사:"화",오:"화",진:"토",술:"토",축:"토",미:"토",신:"금",유:"금",해:"수",자:"수" };
const 음양 = (g) => (천간.indexOf(g) % 2 === 0 ? "양" : "음");
const 상생 = { 목:"화", 화:"토", 토:"금", 금:"수", 수:"목" };
const 상극 = { 목:"토", 토:"수", 수:"화", 화:"금", 금:"목" };

/** 일간 기준 상대 오행·음양 -> 십신. seun.md 6절 규칙과 같다. */
export function 십신(일간, 상대간) {
  const me = 오행[일간], you = 오행[상대간] ?? 지지오행[상대간];
  const 같은음양 = 음양(일간) === 음양(상대간);
  if (me === you) return 같은음양 ? "비견" : "겁재";
  if (상생[me] === you) return 같은음양 ? "식신" : "상관";
  if (상극[me] === you) return 같은음양 ? "편재" : "정재";
  if (상극[you] === me) return 같은음양 ? "편관" : "정관";
  return 같은음양 ? "편인" : "정인";
}

// 절입일 근사표 (월지 인=입춘 시작). 실제 절기는 해마다 ±1일 흔들린다.
const 절입 = [[2,4],[3,6],[4,5],[5,6],[6,6],[7,7],[8,7],[9,8],[10,8],[11,7],[12,7],[1,6]];

/** 그 날짜가 속한 명리 월지 인덱스(0=인월)와 절입 경계까지의 거리(일). */
function 월지인덱스(d) {
  const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, day = d.getUTCDate();
  const t = Date.UTC(y, m - 1, day);
  // 절입[i] 는 인월(i=0)부터 축월(i=11). 축월만 이듬해 1월에 시작한다.
  let idx = 11, 경계거리 = 99;                 // 기본 = 입춘 전 구간(축월)
  for (let i = 0; i < 12; i++) {
    const [sm, sd] = 절입[i];
    const sy = i === 11 ? y : y;               // 소한은 같은 해 1월 = 전년도 축월의 시작
    const diff = (t - Date.UTC(sy, sm - 1, sd)) / 86400000;
    if (Math.abs(diff) < Math.abs(경계거리)) 경계거리 = diff;
  }
  // 입춘~소한 사이는 순서대로 훑으면 마지막으로 통과한 절입이 그 달
  for (let i = 0; i < 11; i++) {
    const [sm, sd] = 절입[i];
    if (t >= Date.UTC(y, sm - 1, sd)) idx = i;
  }
  // 1/1 ~ 입춘 전은 전해 축월
  if (t < Date.UTC(y, 1, 4)) idx = 11;
  return { idx, 경계거리 };
}

/** 사주 네 기둥. 시주는 시간을 줄 때만. */
export function 사주(dateStr, timeStr) {
  const [Y, M, D] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(Y, M - 1, D));
  const { idx: mi, 경계거리 } = 월지인덱스(d);

  // 입춘 전 출생은 전해 사주로 본다
  const 명리년 = (M === 1 || (M === 2 && D < 4)) ? Y - 1 : Y;
  const 년간 = 천간[(명리년 - 4) % 10], 년지 = 지지[(명리년 - 4) % 12];

  // 월간 = 년간에 따른 두간법 (갑기년 병인월 시작)
  const 월간 = 천간[((천간.indexOf(년간) % 5) * 2 + 2 + mi) % 10];
  const 월지 = 지지[(mi + 2) % 12];

  // 일주 = 1900-01-01 갑술일 기준 60갑자 순환 (정확한 산술)
  const 일수 = Math.floor((Date.UTC(Y, M - 1, D) - Date.UTC(1900, 0, 1)) / 86400000);
  const 일간 = 천간[((일수 + 10) % 10 + 10) % 10];
  const 일지 = 지지[((일수 + 10) % 12 + 12) % 12];

  let 시간 = null, 시지 = null;
  if (timeStr) {
    const [h] = timeStr.split(":").map(Number);
    const si = Math.floor(((h + 1) % 24) / 2);            // 23~1시 = 자시
    시지 = 지지[si];
    시간 = 천간[((천간.indexOf(일간) % 5) * 2 + si) % 10]; // 두시법
  }
  return { 년간, 년지, 월간, 월지, 일간, 일지, 시간, 시지, 명리년, 경계거리 };
}

/** 내 지지 × 그 해 지지 관계 — seun.md 표를 그대로 읽는다(기억으로 쓰지 않는다). */
function 세운관계(내지지, 연도) {
  const md = readFileSync(new URL("../data/reference/seun.md", import.meta.url), "utf8").split("\n");
  const hi = md.findIndex((l) => l.startsWith("| 내 지지 |"));
  const head = md[hi].split("|").slice(1, -1).map((s) => s.trim());
  const k = head.findIndex((h) => h.startsWith(String(연도)));
  if (k === -1) return null;
  const row = md.slice(hi + 2).find((l) => l.startsWith(`| **${내지지}**`));
  if (!row) return null;
  const c = row.split("|").slice(1, -1).map((s) => s.trim());
  return { 열: head[k], 관계: c[k] };
}

/** 그 해 12달 중 내 일지가 걸리는 달만 골라낸다. */
function 걸리는달(내지지, 연도) {
  const md = readFileSync(new URL("../data/reference/seun.md", import.meta.url), "utf8").split("\n");
  const i = md.findIndex((l) => l.startsWith(`### ${연도}`));
  if (i === -1) return [];
  const 쌍 = { 자:{충:"오",합:"축",원진:"미"}, 축:{충:"미",합:"자",원진:"오"}, 인:{충:"신",합:"해",원진:"유"},
    묘:{충:"유",합:"술",원진:"신"}, 진:{충:"술",합:"유",원진:"해"}, 사:{충:"해",합:"신",원진:"술"},
    오:{충:"자",합:"미",원진:"축"}, 미:{충:"축",합:"오",원진:"자"}, 신:{충:"인",합:"사",원진:"묘"},
    유:{충:"묘",합:"진",원진:"인"}, 술:{충:"진",합:"묘",원진:"사"}, 해:{충:"사",합:"인",원진:"진"} };
  const p = 쌍[내지지]; if (!p) return [];
  const out = [];
  for (let j = i + 3; j < md.length && md[j].startsWith("|"); j++) {
    const c = md[j].split("|").slice(1, -1).map((s) => s.trim());
    const 월지 = c[1].slice(1, 2);
    const hit = 월지 === p.충 ? "충" : 월지 === p.합 ? "육합" : 월지 === p.원진 ? "원진" : null;
    if (hit) out.push(`${c[1]} (${c[2]}) — 내 일지 ${내지지}${"자축인묘사오미신유해".includes(내지지) ? "와" : "과"} ${hit}`);
  }
  return out;
}

// 자체 검사: node scripts/saju.mjs --test
// 기댓값은 data/corpus/2026-08-24-saju-20.md [실리콘밸리 창업가] 편에 사람이 검증해 둔 6명이다.
if (process.argv.includes("--test")) {
  const 기대 = [["1971-06-28","갑오","갑신"],["1955-02-24","무인","병진"],["1984-05-14","기사","무신"],
                ["1964-01-12","을축","경신"],["1963-02-17","갑인","신묘"],["1985-04-22","경진","신묘"]];
  let bad = 0;
  for (const [d, 월, 일] of 기대) {
    const r = 사주(d);
    const got = [r.월간 + r.월지, r.일간 + r.일지];
    const ok = got[0] === 월 && got[1] === 일;
    if (!ok) { bad++; console.error(`FAIL ${d}: 기대 ${월}/${일} 실제 ${got.join("/")}`); }
  }
  console.log(bad ? `${bad}건 실패` : `${기대.length}건 통과`);
  process.exit(bad ? 1 : 0);
}

const a = process.argv.slice(2);
if (!a.length) { console.log(readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(1, 7).join("\n")); process.exit(0); }
const 날짜 = a[0];
const 시각 = a[1] && /^\d{1,2}:/.test(a[1]) ? a[1] : null;
const 연도 = a.includes("--year") ? Number(a[a.indexOf("--year") + 1]) : new Date().getFullYear();

const s = 사주(날짜, 시각);
const L = [];
L.push(`${날짜}${시각 ? " " + 시각 : ""} — ${s.명리년}년생 기준`);
L.push(`년주 ${s.년간}${s.년지} / 월주 ${s.월간}${s.월지} / 일주 ${s.일간}${s.일지}${s.시간 ? ` / 시주 ${s.시간}${s.시지}` : " / 시주 없음"}`);
L.push(`일간 ${s.일간}(${오행[s.일간]}) · 일지 ${s.일지}(${지지오행[s.일지]})`);
L.push("");
L.push(`[십신] 년간 ${s.년간}=${십신(s.일간, s.년간)} · 월간 ${s.월간}=${십신(s.일간, s.월간)} · 일지 ${s.일지}=${십신(s.일간, s.일지)}${s.시간 ? ` · 시간 ${s.시간}=${십신(s.일간, s.시간)}` : ""}`);
const 세 = 세운관계(s.일지, 연도);
if (세) L.push(`[${연도} 세운] 일지 ${s.일지} × ${세.열} = ${세.관계 === "-" ? "직접 관계 없음" : 세.관계}`);
const 달 = 걸리는달(s.일지, 연도);
if (달.length) { L.push(`[${연도} 걸리는 달]`); 달.forEach((x) => L.push(`  ${x}`)); }
else L.push(`[${연도} 걸리는 달] 일지와 충·합·원진으로 엮이는 달 없음`);
if (Math.abs(s.경계거리) <= 1) L.push(`\n⚠ 절입 경계 ${s.경계거리}일 — 월주가 바뀔 수 있음. 만세력으로 확인할 것`);
if (!시각) L.push(`\n※ 시주 없음. 태어난 시간 알면 더 정확함`);
console.log(L.join("\n"));
