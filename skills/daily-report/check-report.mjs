#!/usr/bin/env node
// 일일보고서 발행 전 검사 (v2.4.1 · v2.5.0 확장) — SKILL.md §15 가 정본.
// 사용: node check-report.mjs <보고서.html>
// 종료코드: 0 통과 · 1 규칙 위반 · 2 입력 오류.
// ⚠️ 각 검사는 **몇 개를 봤는지**를 함께 찍는다 — 0개를 보고 통과한 것과 구분하려고.
import fs from 'node:fs';

const file = process.argv[2];
if (!file || !fs.existsSync(file)) { console.error('사용: node check-report.mjs <보고서.html>'); process.exit(2); }
const html = fs.readFileSync(file, 'utf8');

const text = (s) => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const len = (s) => [...s].length;
const between = (s, a, b) => { const i = s.indexOf(a); if (i < 0) return ''; const j = s.indexOf(b, i + a.length); return j < 0 ? s.slice(i) : s.slice(i, j); };

const fails = [];
const warns = [];
const log = (name, seen, bad) => console.log(`${bad.length ? '✗' : '✓'} ${name} — ${seen}개 검사${bad.length ? `, 위반 ${bad.length}` : ''}`);
const check = (name, seen, bad, level = 'fail') => {
  log(name, seen, bad);
  (level === 'fail' ? fails : warns).push(...bad.map((m) => `${name}: ${m}`));
};

// ── 구성 요소 추출 ────────────────────────────────────────────
const tocHtml = between(html, '<nav class="toc"', '</nav>');
const topHtml = between(html, '<nav class="topnav"', '</nav>');
const toc = [...tocHtml.matchAll(/<a href="#([\w-]+)">[\s\S]*?<span class="no">(.*?)<\/span>[\s\S]*?<span class="txt">(.*?)<\/span>/g)]
  .map((m) => ({ id: m[1], no: text(m[2]), txt: text(m[3]) }));
const tocSecs = [...tocHtml.matchAll(/<li class="toc-sec">(.*?)<\/li>|<a href="#(w\d+)">/g)]
  .reduce((acc, m) => { if (m[1] !== undefined) acc.push({ name: text(m[1]), firstId: null, pending: true }); else if (acc.length && acc[acc.length - 1].pending) { acc[acc.length - 1].firstId = m[2]; acc[acc.length - 1].pending = false; } return acc; }, []);
const top = [...topHtml.matchAll(/<a href="#([\w-]+)"><span class="n">(.*?)<\/span>([\s\S]*?)<\/a>/g)]
  .map((m) => ({ id: m[1], no: text(m[2]), txt: text(m[3]) }));

const cardsHtml = between(html, '<div class="cards">', '<section class="panel" id="impact"');
const cards = [];
let section = null;
const sectionOrder = [];
for (const m of cardsHtml.matchAll(/<div class="section-break"><span>(.*?)<\/span><\/div>|<article class="work" id="(w\d+)">([\s\S]*?)<\/article>/g)) {
  if (m[1] !== undefined) { const name = text(m[1]); if (name !== '검토 · 검증') { section = name; sectionOrder.push(name); } continue; }
  const body = m[3];
  const row = (cls) => (body.match(new RegExp(`<div class="row ${cls}">[\\s\\S]*?<ul>([\\s\\S]*?)</ul>`)) || [, ''])[1];
  const lis = (ul) => [...ul.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((x) => x[1]);
  cards.push({
    id: m[2],
    num: text((body.match(/<span class="wnum">(.*?)<\/span>/) || [, ''])[1]),
    title: text((body.match(/<h3>([\s\S]*?)<\/h3>/) || [, ''])[1]),
    section,
    cause: lis(row('cause')),
    result: lis(row('result')),
    pkgs: [...(between(body, '<div class="work-pkgs">', '</div>')).matchAll(/<code class="pkg">(.*?)<\/code>/g)].map((x) => text(x[1])),
    text: text(body),
  });
}

const summaryHtml = between(html, '<section class="summary"', '</section>');
const groups = [...summaryHtml.matchAll(/<div class="sg">[\s\S]*?<span class="sg-cat">(.*?)<\/span>[\s\S]*?<div class="sg-text">([\s\S]*?)<\/div>/g)]
  .map((m) => ({ cat: text(m[1]), refs: [...m[2].matchAll(/href="#(w\d+)"/g)].map((x) => x[1]), text: text(m[2].replace(/<span class="sg-refs">[\s\S]*?<\/span>/, '')) }));

const impactHtml = between(html, '<section class="panel" id="impact"', '</section>');
const verifyHtml = between(html, '<section class="panel" id="verify"', '</section>');
const h1 = text((html.match(/<h1>([\s\S]*?)<\/h1>/) || [, ''])[1]);

if (!cards.length) { console.error('작업 카드를 하나도 못 찾았다 — 프레임 구조가 바뀌었는지 확인'); process.exit(2); }

// ── C0 카드 태그 짝 — 여는 article 이 닫히기 전에 다음 article 이 열리면 카드가 중첩된다 ──
//    (실적 2026-09-28: 카드를 끼워 넣다 앞 카드의 </article> 을 지워 07 이 06 안에 들어갔다.
//     이 검사 없이는 C1 이 "목차 7 ≠ 카드 6" 이라는 증상만 보여 원인을 찾아야 했다.)
{
  const bad = []; let open = null; let seen = 0;
  for (const m of cardsHtml.matchAll(/<article class="work" id="(w\d+)">|<\/article>/g)) {
    if (m[1]) { seen++; if (open) bad.push(`${open} 이 닫히기 전에 ${m[1]} 가 열림 — ${open} 끝에 </article> 누락`); open = m[1]; }
    else { if (!open) bad.push('짝 없는 </article>'); open = null; }
  }
  if (open) bad.push(`${open} 이 닫히지 않음`);
  check('C0 카드 태그 짝', seen, bad);
}

// ── C1 제목 단일 출처: 카드 h3 = 목차 = 점프바 ─────────────────
{
  const bad = [];
  for (const c of cards) {
    const t = toc.find((x) => x.id === c.id); const j = top.find((x) => x.id === c.id);
    if (!t) bad.push(`${c.num} 목차 항목 없음`); else if (t.txt !== c.title) bad.push(`${c.num} 목차 "${t.txt}" ≠ 카드 "${c.title}"`);
    if (!j) bad.push(`${c.num} 점프바 항목 없음`); else if (j.txt !== c.title) bad.push(`${c.num} 점프바 "${j.txt}" ≠ 카드 "${c.title}"`);
  }
  const tocW = toc.filter((x) => /^w\d+$/.test(x.id)).length;
  if (tocW !== cards.length) bad.push(`목차 작업 항목 ${tocW} ≠ 카드 ${cards.length}`);
  check('C1 목차·점프바·카드 제목 동일', cards.length, bad);
}

// ── C2 번호: 01..N 연속 두 자리, 목차 번호 일치, 영향 N+1 · 검증 N+2 ──
{
  const bad = [];
  cards.forEach((c, i) => { const want = String(i + 1).padStart(2, '0'); if (c.num !== want) bad.push(`${c.id} 번호 ${c.num} (기대 ${want})`); if (c.id !== `w${i + 1}`) bad.push(`${c.num} id ${c.id} (기대 w${i + 1})`); });
  const n1 = String(cards.length + 1).padStart(2, '0'); const n2 = String(cards.length + 2).padStart(2, '0');
  const pnum = (h) => text((h.match(/<span class="pnum">(.*?)<\/span>/) || [, ''])[1]);
  if (pnum(impactHtml) !== n1) bad.push(`영향 번호 ${pnum(impactHtml)} (기대 ${n1})`);
  if (pnum(verifyHtml) !== n2) bad.push(`검증 번호 ${pnum(verifyHtml)} (기대 ${n2})`);
  for (const nav of [toc, top]) for (const x of nav) {
    if (x.id === 'impact' && x.no !== n1) bad.push(`목차 영향 번호 ${x.no}`);
    if (x.id === 'verify' && x.no !== n2) bad.push(`목차 검증 번호 ${x.no}`);
    const c = cards.find((k) => k.id === x.id); if (c && c.num !== x.no) bad.push(`목차 ${x.id} 번호 ${x.no} ≠ ${c.num}`);
  }
  check('C2 번호 연속·1:1', cards.length + 2, bad);
}

// ── C3 카드 수 — 10장 이하, 8~10장은 경고 ─────────────────────────
//    (v2.5.0: 종전 7장 한도는 아무도 안 지켜 카드가 30장까지 쪼개졌다 — 한도를 현실에 맞추고 「개념 합치기」와 함께 건다.)
check('C3 카드 10장 이하', 1, cards.length > 10 ? [`${cards.length}장 — 비슷한 개념끼리 합친다`] : []);
if (cards.length >= 8 && cards.length <= 10) warns.push(`C3: 카드 ${cards.length}장 — 비슷한 개념을 더 합칠 수 있는지 한 번 본다`);
if (cards.length < 3) warns.push(`C3: 카드 ${cards.length}장 — 작업이 정말 그만큼이면 괜찮다`);

// ── C4 카드 제목 길이 (목차 레일에 말줄임 없이) ─────────────────
{
  const hard = cards.filter((c) => len(c.title) > 18).map((c) => `${c.num} "${c.title}" ${len(c.title)}자 (≤18)`);
  check('C4 카드 제목 18자 이내', cards.length, hard);
  cards.filter((c) => len(c.title) > 16 && len(c.title) <= 18).forEach((c) => warns.push(`C4: ${c.num} 제목 ${len(c.title)}자 — 16자 이내 권장`));
  cards.filter((c) => !/다$/.test(c.title)).forEach((c) => fails.push(`C4: ${c.num} "${c.title}" — 평서문 '~다' 로 끝낸다`));
}

// ── C5 불릿: 원인 ≤4 · 개선 ≤4 · 60자 · <b> 수치 1개 ────────────
{
  const bad = []; let seen = 0;
  for (const c of cards) {
    if (c.cause.length > 4) bad.push(`${c.num} 원인 불릿 ${c.cause.length}개 (≤4)`);
    if (c.result.length > 4) bad.push(`${c.num} 개선 불릿 ${c.result.length}개 (≤4)`);
    for (const li of [...c.cause, ...c.result]) {
      seen++;
      const t = text(li);
      if (len(t) > 60) bad.push(`${c.num} ${len(t)}자 "${t.slice(0, 24)}…"`);
      const bs = [...li.matchAll(/<b>([\s\S]*?)<\/b>/g)].map((x) => text(x[1]));
      if (bs.length > 1) bad.push(`${c.num} 강조 ${bs.length}개 "${t.slice(0, 20)}…"`);
      bs.filter((b) => !/\d/.test(b)).forEach((b) => bad.push(`${c.num} 수치 아닌 강조 "${b}"`));
    }
  }
  check('C5 불릿 한도(4·4·60자·강조)', seen, bad);
}

// ── C6 분류 하나: 핵심 정리 분류 = 카드 섹션, 같은 순서·같은 카드 ──
{
  const bad = [];
  if (groups.length < 2 || groups.length > 5) bad.push(`핵심 정리 ${groups.length}줄 (2~5)`);
  const cats = groups.map((g) => g.cat);
  if (cats.join('|') !== sectionOrder.join('|')) bad.push(`분류 [${cats.join(', ')}] ≠ 섹션 [${sectionOrder.join(', ')}]`);
  if (new Set(sectionOrder).size !== sectionOrder.length) bad.push(`같은 섹션 이름이 두 번 나온다 — 카드를 한데 모은다`);
  for (const g of groups) {
    const want = cards.filter((c) => c.section === g.cat).map((c) => c.id);
    if (g.refs.join(',') !== want.join(',')) bad.push(`"${g.cat}" 참조 [${g.refs.join(',')}] ≠ 그 섹션 카드 [${want.join(',')}]`);
  }
  cards.filter((c) => !c.section).forEach((c) => bad.push(`${c.num} 섹션 밖 카드`));
  check('C6 핵심 정리 분류 = 카드 구역', groups.length + sectionOrder.length, bad);
}

// ── C7 내부어·경위 서술 금지 (h1·핵심 정리·카드) ───────────────
{
  const BANNED = [
    [/게이트/, '검사'], [/회귀/, '되돌아간 결함'], [/단정/, '검사 항목'], [/하네스/, '검사 도구'], [/본선/, 'main'],
    [/PR\s*#?\d+|#\d{3,}/, '(번호 없이)'], [/커밋/, '(쓰지 않는다)'], [/초판|오진|발견·수정|재실측/, '(경위는 쓰지 않는다)'],
  ];
  const scopes = [['제목', h1], ...groups.map((g) => [`핵심 정리 ${g.cat}`, g.text]), ...cards.map((c) => [`카드 ${c.num}`, c.text])];
  const bad = [];
  for (const [where, t] of scopes) for (const [re, alt] of BANNED) { const m = t.match(re); if (m) bad.push(`${where} "${m[0]}" → ${alt}`); }
  check('C7 내부어·경위 서술', scopes.length, bad);
}

// ── C8 제목(h1) 한 문장 ────────────────────────────────────────
{
  const commas = (h1.match(/,/g) || []).length; const dots = (h1.match(/·/g) || []).length;
  check('C8 제목 한 문장', 1, commas + dots > 2 ? [`쉼표·가운뎃점 ${commas + dots}개 — 나열이 아니라 요지 한 문장`] : []);
}

// ── C9 패키지 합집합: 카드 = 영향 패널 ─────────────────────────
{
  const cardSet = new Set(cards.flatMap((c) => c.pkgs));
  const impSet = new Set([...impactHtml.matchAll(/<div class="item(?! muted)[^"]*">[\s\S]*?<code class="pkg">(.*?)<\/code>/g)].map((x) => text(x[1])));
  const bad = [...cardSet].filter((p) => !impSet.has(p)).map((p) => `영향 패널에 없음 ${p}`)
    .concat([...impSet].filter((p) => !cardSet.has(p)).map((p) => `어느 카드에도 없음 ${p}`));
  check('C9 패키지 카드 = 영향 패널', cardSet.size + impSet.size, bad);
}

// ── C10 영향 패널: 후속 확인이 먼저, 근거 ✓ 3줄 이내 ───────────
{
  const labels = [...impactHtml.matchAll(/<div class="label">(.*?)<\/div>/g)].map((x) => text(x[1]));
  const okN = (between(impactHtml, '부작용 없음 근거', '<div class="block">').match(/class="fb ok"/g) || []).length;
  const bad = [];
  if (labels[0] !== '후속 확인') bad.push(`첫 블록이 "${labels[0]}" — "후속 확인" 을 먼저`);
  if (okN > 3) bad.push(`근거 ✓ ${okN}줄 (≤3)`);
  if (!/<div class="verdict">/.test(impactHtml)) bad.push('종합 판정 없음');
  check('C10 영향 패널 순서·분량', labels.length, bad);
}

// ── C11 검증: 대표 6개 이내 · 같은 검사 한 번 ───────────────────
{
  const chips = [...verifyHtml.matchAll(/<div class="gates">([\s\S]*?)<\/div>/g)].flatMap((g) => [...g[1].matchAll(/<span>([\s\S]*?)<\/span>/g)].map((x) => text(x[1])));
  const names = chips.map((c) => c.replace(/[\d/.,%:+-]+.*$/, '').trim());
  const dup = names.filter((n, i) => n && names.indexOf(n) !== i);
  const bad = [];
  if (chips.length > 6) bad.push(`${chips.length}개 (≤6) — 대표만 남긴다`);
  dup.forEach((n) => bad.push(`"${n}" 가 두 번 — 최종값 하나만`));
  check('C11 검증 대표 6개', chips.length, bad);
}

// ── C12 남은 플레이스홀더 ──────────────────────────────────────
{
  const left = [...html.replace(/<!--[\s\S]*?-->/g, '').matchAll(/\{\{[^}]*\}\}/g)].map((m) => m[0]);
  check('C12 플레이스홀더 없음', 1, left.slice(0, 5));
}

// ── C13 목차 구분선 = 카드 구역(이름·순서·첫 카드 앞) — v2.5.0 ────
{
  const bad = [];
  const want = sectionOrder.map((name) => ({ name, first: (cards.find((c) => c.section === name) || {}).id }));
  if (tocSecs.length !== want.length) bad.push(`목차 구분선 ${tocSecs.length}개 ≠ 카드 구역 ${want.length}개`);
  want.forEach((w, i) => {
    const t = tocSecs[i];
    if (!t) return;
    if (t.name !== w.name) bad.push(`${i + 1}번째 구분선 "${t.name}" ≠ 구역 "${w.name}"`);
    else if (t.firstId !== w.first) bad.push(`구분선 "${t.name}" 다음 항목 ${t.firstId} ≠ 그 구역 첫 카드 ${w.first}`);
  });
  check('C13 목차 구분선 = 카드 구역', want.length, bad);
}

// ── C14 브랜치 표기 — 3개 이하 + 외 N개, 메타 = 푸터 ───────────────
{
  const meta = text((html.match(/<span class="k">브랜치<\/span><b>([\s\S]*?)<\/b>/) || [, ''])[1]);
  const foot = text((html.match(/<footer>([\s\S]*?)<\/footer>/) || [, ''])[1]);
  const bad = [];
  const m = meta.match(/^(.*?)(?: 외 (\d+)개)?$/);
  const shown = m[1].split(' · ').filter(Boolean);
  if (!meta) bad.push('브랜치 메타 없음');
  if (shown.length > 3) bad.push(`브랜치 ${shown.length}개를 다 적었다 — 대표 3개 + 외 N개`);
  if (m[2] && shown.length !== 3) bad.push(`"외 N개" 인데 앞에 ${shown.length}개만 있다(3개여야 한다)`);
  if (meta && !foot.includes(meta)) bad.push('푸터의 브랜치 표기가 메타와 다르다');
  check('C14 브랜치 3개 + 외 N개', 1, bad);
}

console.log('');
warns.forEach((w) => console.log(`  ! ${w}`));
if (fails.length) { console.log(`\n위반 ${fails.length}건 — 고친 뒤 다시 돌린다:`); fails.forEach((f) => console.log(`  ✗ ${f}`)); process.exit(1); }
console.log(`\n통과 — 카드 ${cards.length} · 분류 ${groups.length} · 경고 ${warns.length}`);
