import { content } from './content.js';
import { STUDENTS, DIFFICULTIES, INTERESTS, dayKey, isCorrect, appendAttempt, nodeProgress, isEligible, chooseNode, makeLesson, addLesson, validateContent, validateBackup, mergeBackup, makeBackup } from './core.js';
import { openStore, readState, mutateState } from './storage.js';
import { mountScreens } from './screen-layout.js';

const app = document.querySelector('#app');
let state, busy = false, generation = 0, registration, pendingWorker;
let selection = '', retrying = false, routeKey = '', parentStudent = 'cc', parentPage = 0, discoveryPage = 0;
let difficulty = '', interest = '';
let screens, screenPage=0, hintView=false;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const now = () => new Date().toISOString();
const uid = () => globalThis.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const icon = status => ({mastered:'●',learning:'◉',unseen:'○',locked:'◇'}[status]);
const statusName = status => ({mastered:'已有掌握证据',learning:'正在探索',unseen:'尚未探索',locked:'先看看前置知识'}[status]);
const button = (label, action, style = 'primary', extra = '') => `<button class="${style}" data-action="${action}" ${extra}>${label}</button>`;
const link = (label, hash, style = '') => `<a ${style ? `class="${style}"` : ''} href="#/${hash}">${label}</a>`;
const child = s => content.students[s];
const studentBreadcrumb = (s, title) => `<nav class="breadcrumb" aria-label="当前位置">${link('花园','')}<span>／</span>${link(child(s).name,s)}${title ? `<span>／</span><span>${esc(title)}</span>` : ''}</nav>`;
function notify(message, error = false) {
  const target = document.querySelector('#notice');
  target.innerHTML = `<div class="notice-message"><span>${esc(message)}</span>${button('知道了','dismiss-notice','plain')}</div>`; target.classList.toggle('error',error); target.hidden = false;
}
function currentRoute() { return (location.hash || '#/').replace(/^#\/?/,'').split('/').map(s => { try { return decodeURIComponent(s); } catch { return ''; } }); }
function currentLesson(s) { return state.lessons.find(l => l.student === s && l.day === dayKey()); }
function art(spec) {
  if (!spec) return '';
  if (spec.type === 'groups') {
    const groups = Math.max(1,Math.min(6,Number(spec.groups) || 1)), each = Math.max(1,Math.min(10,Number(spec.each) || 1));
    return `<div class="question-art" role="img" aria-label="${groups}组，每组${each}个"><div class="groups">${Array.from({length:groups},()=>`<div class="group">${'<span class="dot"></span>'.repeat(each)}</div>`).join('')}</div></div>`;
  }
  if (spec.type === 'shapes') return `<div class="question-art"><div class="shape" role="img" aria-label="${esc(spec.items.join('，'))}">${spec.items.map(esc).join(' ')}</div></div>`;
  if (spec.type === 'rectangle') return `<div class="question-art"><svg class="diagram" viewBox="0 0 400 160" role="img" aria-label="长方形，长${esc(spec.widthLabel)}，宽${esc(spec.heightLabel)}"><rect x="85" y="40" width="240" height="90" fill="none" stroke="currentColor" stroke-width="3"/><text x="205" y="28" text-anchor="middle" font-size="22">${esc(spec.widthLabel)}</text><text x="40" y="90" text-anchor="middle" font-size="22">${esc(spec.heightLabel)}</text></svg></div>`;
  if (spec.type === 'line') {
    const points = spec.points.filter(Number.isFinite), min = Math.min(-5,...points), max = Math.max(5,...points);
    const x = n => 35 + (n - min) / (max - min) * 480;
    return `<div class="question-art"><svg class="diagram number-line" viewBox="0 0 560 105" role="img" aria-label="数轴，标出了${points.map(esc).join('、')}"><path d="M20 45H540l-10-7m10 7-10 7" fill="none" stroke="currentColor" stroke-width="2"/>${Array.from({length:max-min+1},(_,i)=>{const n=min+i;return `<path d="M${x(n)} 39v12" stroke="currentColor" stroke-width="2"/>${points.includes(n)||n===0?`<text x="${x(n)}" y="84" text-anchor="middle">${n}</text>`:''}${points.includes(n)?`<circle cx="${x(n)}" cy="45" r="5" fill="currentColor"/>`:''}`;}).join('')}</svg></div>`;
  }
  return '';
}
function portrait(s) {
  const hair = s === 'cc'
    ? '<path d="M66 117V72c0-53 108-53 108 0v75l-20-14-12-62c-18 2-34-3-44-13-4 20-18 31-32 36Z" fill="#202020"/>'
    : '<circle cx="55" cy="72" r="22" fill="#202020"/><circle cx="185" cy="72" r="22" fill="#202020"/><path d="M72 76c-3-64 98-64 96 0-25-1-44-12-48-26-11 17-26 24-48 26Z" fill="#202020"/>';
  return `<svg class="portrait" viewBox="0 0 240 190" role="img" aria-label="${child(s).name}的手绘头像"><path d="M28 171c25-7 150-7 183 0M28 144v-26m0 17c-13 0-18-13-18-13 16 0 18 13 18 13m0-9c0-16 18-20 18-20 0 15-8 21-18 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>${hair}<ellipse cx="120" cy="87" rx="46" ry="48" fill="#f8f8f5" stroke="currentColor" stroke-width="2.5"/><path d="M85 73c12-4 30-15 34-26 9 14 26 23 37 25" fill="none" stroke="currentColor" stroke-width="4"/><path d="M${s==='cc'?'99 86v5m42-5v5':'95 91q7-10 14 0m24 0q7-10 14 0'}M108 109q12 11 24 0" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M75 166c0-42 22-48 45-48s45 6 45 48" fill="#e5e5dd" stroke="currentColor" stroke-width="2.5"/><path d="M103 122l17 20 17-20M120 142v24" fill="none" stroke="currentColor" stroke-width="2"/><path d="M63 165l53-8 13 10 34-8 30 6v13H63Z" fill="#fff" stroke="currentColor" stroke-width="2"/><path d="M130 167v10M75 170l34-7M144 167l34 3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M202 32v18m-9-9h18" stroke="currentColor" stroke-width="2"/></svg>`;
}
function home() {
  return `<section class="hero"><p class="eyebrow">橙橙与甜甜的成长知识图</p><h1>知识图与趣味数学</h1><p>从一个小问题开始，走进自己的知识花园。</p></section><section class="children" aria-label="选择孩子">${STUDENTS.map(s=>`<a class="child-card" href="#/${s}">${portrait(s)}<h2>${child(s).name}</h2><p>${child(s).intro}</p><span class="button">进入花园 <span aria-hidden="true">→</span></span></a>`).join('')}</section>`;
}
function studentHome(s) {
  const lesson = currentLesson(s), candidate = lesson ? {node:lesson.node,reason:lesson.reason} : chooseNode(content,state,s);
  const count = state.attempts.filter(a=>a.student===s).length;
  return `${studentBreadcrumb(s)}<div class="student-header"><div><p class="eyebrow">${child(s).stage}</p><h1>${child(s).name}的知识花园</h1><p class="muted">${count?'今天继续，发现一个新的联系。':'先试学一小组，慢慢了解你的学习起点。'}</p></div><div class="student-mark" aria-hidden="true">${s==='cc'?'橙':'甜'}</div></div><section class="panel today-panel"><div class="row spread"><p class="panel-kicker">今日探索 · ${dayKey()} · 约 5–15 分钟</p><span class="status-label">${lesson?.completedAt?'今日已完成':'一个概念 · 三个问题'}</span></div><h2>${esc(candidate.node.title)}</h2><p>${esc(candidate.node.summary)}</p><p class="small">${esc(candidate.reason)}</p>${link(lesson?.completedAt?'看看今天的发现':lesson?.startedAt?'继续探索':'开始今日探索',`${s}/learn`,'button')}</section><nav class="grid" aria-label="学习入口"><a class="nav-card" href="#/${s}/map"><h2><span class="symbol" aria-hidden="true">◎</span>知识地图</h2><p>看看已经走过的路，和下一扇门。</p></a><a class="nav-card" href="#/${s}/challenge"><h2><span class="symbol" aria-hidden="true">◇</span>趣味挑战</h2><p>把今天的小概念，用在一个问题里。</p></a><a class="nav-card" href="#/${s}/discoveries"><h2><span class="symbol" aria-hidden="true">?</span>我的发现</h2><p>记下一个“我想知道”。</p></a><a class="nav-card" href="#/${s}/history"><h2><span class="symbol" aria-hidden="true">↗</span>探索足迹</h2><p>回顾理解过的概念和自己的反馈。</p></a></nav><p class="page-note subsection">当前是试学内容，学习起点还需要结合你的实际表现确认。</p>`;
}
function mapPage(s) {
  return `${studentBreadcrumb(s,'知识地图')}<h1>一张慢慢长大的地图</h1><p class="muted">先看到身边的联系，再走向下一扇门。</p><div class="map-legend"><span>● 已有掌握证据</span><span>◉ 正在探索</span><span>○ 尚未探索</span><span>◇ 前置知识待练习</span></div><div class="map-list">${content.nodes.filter(n=>n.student===s).map(n=>{const p=nodeProgress(state,s,n.id),status=p.status==='unseen'&&!isEligible(n,state)?'locked':p.status;return `<a class="node-card" href="#/${s}/card/${n.id}"><div class="row spread"><h3><span class="symbol" aria-hidden="true">${icon(status)}</span>${esc(n.title)}</h3><span class="status-label">${statusName(status)}</span></div><p>${esc(n.summary)}</p>${n.prerequisites.length?`<p>前置联系：${n.prerequisites.map(id=>esc(content.nodes.find(x=>x.id===id).title)).join('、')}</p>`:''}${p.count?`<p>已记录 ${p.count} 次作答 · ${p.independent} 道题有独立答对证据</p>`:''}</a>`;}).join('')}</div><p class="page-note subsection">看过卡片不等于掌握。这里根据作答、提示和不同日期的练习证据标记状态。</p>`;
}
function cardBody(node,s) {
  return `<p class="eyebrow">${esc(node.domain)}</p><h1>${esc(node.title)}</h1><section class="panel" data-screen><h2>一句话理解</h2><p>${esc(node.summary)}</p>${art(node.art)}</section><section class="panel" data-screen><h2>看一个例子</h2><p>${esc(node.example)}</p></section><section class="panel" data-screen><h2>你有没有想过？</h2><p>${esc(node.curiosity)}</p><p class="small">可以先想一想，也可以说给爸爸听。不需要马上答出来。</p></section>${node.related.length?`<section class="panel" data-screen><h2>下一扇门</h2><div class="connections">${node.related.map(id=>{const related=content.nodes.find(n=>n.id===id&&n.student===s);return related?link(esc(related.title),`${s}/card/${id}`):'';}).join('')}</div></section>`:''}`;
}
function cardPage(s,id) {
  const node=content.nodes.find(n=>n.id===id&&n.student===s);
  if (!node) return notFound();
  return `${studentBreadcrumb(s,'知识卡')}${cardBody(node,s)}${link('回到知识地图',`${s}/map`,'button secondary')}`;
}
function challengePage(s) {
  const done=currentLesson(s)?.completedAt;
  return `${studentBreadcrumb(s,'趣味挑战')}<h1>把想法用起来</h1><section class="panel"><h2>${done?'今天的小挑战已完成':'今天只有一小组挑战'}</h2><p>挑战就是今日探索里的三个问题。想一想、试一试，再说说你的感受。</p><p class="small">${done?'可以回顾解释，也可以自由看看知识卡。':'看过知识卡再开始，不需要赶时间。'}</p>${link(done?'回顾今天的挑战':'进入今日探索',`${s}/learn`,'button')}</section>`;
}
async function lessonPage(s) {
  let lesson=currentLesson(s);
  if (!lesson) { state=await mutateState(current=>addLesson(current,makeLesson(content,current,s))); lesson=currentLesson(s); }
  if (lesson.completedAt) return completionPage(s,lesson);
  if (!lesson.readAt) return `${studentBreadcrumb(s,'今日探索')}${cardBody(lesson.node,s)}${button('我看过了，试试三个问题','begin-questions')}`;
  const index=lesson.node.questions.findIndex(q=>!lesson.responses[q.id]?.finalized);
  if (index<0) return feedbackPage(s,lesson);
  const q=lesson.node.questions[index], response=lesson.responses[q.id];
  const waitingRetry=response&&!response.finalized&&!retrying;
  const hintUsed=Boolean(lesson.hints?.[q.id]||response?.hintUsed);
  if(hintView)return `${studentBreadcrumb(s,'一点提示')}<p class="eyebrow">${esc(lesson.node.title)}</p><h1>换个角度想一想</h1><section class="panel"><p>${esc(q.prompt)}</p><div class="explanation"><p>${esc(q.hint)}</p></div>${button('回到问题','close-hint')}</section>`;
  const selected=selection;
  return `${studentBreadcrumb(s,'今日探索')}<p class="eyebrow">${esc(lesson.node.title)} · 问题 ${index+1} / ${lesson.node.questions.length}</p><div class="progress-track" aria-label="${index}题完成，共${lesson.node.questions.length}题">${lesson.node.questions.map((_,i)=>`<span class="progress-step ${i<index?'done':''}"></span>`).join('')}</div><section class="panel question-panel"><h1 class="question-title">${esc(q.prompt)}</h1>${art(q.art)}${waitingRetry?`<div class="explanation"><h3>再想一想</h3><p>你选了：${esc(response.answer)}</p><p>${esc(q.hint)}</p></div><div class="row">${button('再试一次','retry')}${button('看解释，继续','skip','secondary')}</div>`:q.type==='choice'?`<div class="options" role="group" aria-label="选择答案">${q.options.map((option,i)=>`<button class="option ${selected===option?'selected':''}" data-action="select-answer" data-value="${esc(option)}" aria-pressed="${selected===option}"><span class="option-letter">${String.fromCharCode(65+i)}</span><span>${esc(option)}</span></button>`).join('')}</div>`:`<div class="numeric-answer"><label for="answer">我的答案</label><input id="answer" type="text" inputmode="none" autocomplete="off" maxlength="12" value="${esc(selected)}" aria-label="数字答案"></div><div class="keypad" aria-label="数字键盘">${['1','2','3','4','5','6','7','8','9','−','0','⌫'].map(key=>`<button data-action="key" data-value="${key}" aria-label="${key==='⌫'?'删除一位':key==='−'?'负号':key}">${key}</button>`).join('')}</div>`}${!waitingRetry?`<div class="row">${button('确认答案','submit-answer','primary',selected.trim()?'':'disabled')}${button(hintUsed?'再看提示':'给我一点提示','hint','secondary')}</div>`:''}</section>`;
}
function answerReview(s,lesson,q,response) {
  return `${studentBreadcrumb(s,'今日探索')}<p class="eyebrow">${esc(lesson.node.title)}</p><section class="panel"><h1 class="question-title">${response.correct?'这个问题想明白了':'一起看一看这个想法'}</h1><p>${esc(q.prompt)}</p><p>你的答案：${esc(response.answer)}</p><div class="explanation"><h3>为什么？</h3><p>${esc(q.solution)}</p></div>${button('继续','next-question')}</section>`;
}
let review = null;
function feedbackPage(s,lesson) {
  return `${studentBreadcrumb(s,'学习感受')}<h1>这次探索感觉怎么样？</h1><p class="muted">答对多少之外，你的感受也很重要。</p><section class="panel"><h2>理解起来……</h2><div class="feedback-options" role="group" aria-label="难度反馈">${DIFFICULTIES.map(value=>`<button class="feedback-choice ${difficulty===value?'selected':''}" data-action="difficulty" data-value="${value}" aria-pressed="${difficulty===value}">${value}</button>`).join('')}</div><h2>这个话题……</h2><div class="feedback-options" role="group" aria-label="兴趣反馈">${INTERESTS.map(value=>`<button class="feedback-choice ${interest===value?'selected':''}" data-action="interest" data-value="${value}" aria-pressed="${interest===value}">${value}</button>`).join('')}</div>${button('记下今天的发现','finish','primary',difficulty&&interest?'':'disabled')}</section>`;
}
function completionPage(s,lesson) {
  const responses=Object.values(lesson.responses), independent=responses.filter(r=>r.firstCorrect&&!r.hintUsed).length;
  return `${studentBreadcrumb(s,'今日完成')}<p class="eyebrow">今天已经探索完成</p><h1>今天理解了一点，真好。</h1><section class="panel"><h2>${esc(lesson.node.title)}</h2><p>${esc(lesson.node.summary)}</p><p class="feedback-summary">${responses.length} 个问题，${independent} 个在没有提示时首次答对。<br>你的感受：${esc(lesson.feedback.difficulty)} · ${esc(lesson.feedback.interest)}</p><p class="small">记录已保存在本设备。明天会结合这些记录安排内容。</p></section><section class="panel"><h2>回顾三个想法</h2>${lesson.node.questions.map(q=>`<div class="record"><p><strong>${esc(q.prompt)}</strong></p><p>${esc(q.solution)}</p></div>`).join('')}</section><div class="row">${link('回到我的花园',s,'button')}${link('记下一个问题',`${s}/discoveries`,'button secondary')}</div><p class="page-note subsection">可以自由看看知识卡，不需要继续刷题。</p>`;
}
function historyPage(s) {
  const lessons=state.lessons.filter(l=>l.student===s&&l.completedAt).sort((a,b)=>b.day.localeCompare(a.day));
  const page=parentPage, subset=lessons.slice(page*6,page*6+6);
  return `${studentBreadcrumb(s,'探索足迹')}<h1>走过的每一小步</h1><div class="panel">${subset.length?subset.map(l=>`<div class="record"><p class="small">${esc(l.day)}</p><h3>${esc(l.node.title)}</h3><p>${esc(l.feedback.difficulty)} · ${esc(l.feedback.interest)}</p><p class="small">${esc(l.node.summary)}</p></div>`).join(''):'<p class="empty">完成第一次探索后，这里就会留下足迹。</p>'}</div>${pagination(page,lessons.length,'history-page')}`;
}
function pagination(page,total,action) {
  if(total<=6)return '';
  return `<div class="pagination">${button('上一页',action,'plain',`data-value="${page-1}" ${page===0?'disabled':''}`)}<span class="small">${page+1} / ${Math.ceil(total/6)}</span>${button('下一页',action,'plain',`data-value="${page+1}" ${(page+1)*6>=total?'disabled':''}`)}</div>`;
}
function discoveriesPage(s) {
  const list=state.discoveries.filter(d=>d.student===s).sort((a,b)=>b.at.localeCompare(a.at));
  return `${studentBreadcrumb(s,'我的发现')}<h1>我想知道……</h1><p class="muted">好问题值得留下来。也可以请爸爸帮忙输入。</p><form id="discovery-form" class="panel"><label class="field" for="discovery-text"><span>今天想到的问题或发现</span><textarea id="discovery-text" maxlength="2000" required placeholder="比如：为什么零不能做除数？"></textarea></label><button class="primary" type="submit">保存我的发现</button></form><section class="panel"><h2>留下来的好奇心</h2>${list.length?list.slice(discoveryPage*6,discoveryPage*6+6).map(d=>`<div class="record"><p>${esc(d.text)}</p><p class="small">${dayKey(new Date(d.at))} · 留给下一次探索</p></div>`).join(''):'<p class="empty">还没有记录。一个小小的“为什么”就可以开始。</p>'}</section>${pagination(discoveryPage,list.length,'discovery-page')}`;
}
function parentPageHtml() {
  const s=parentStudent, attempts=state.attempts.filter(a=>a.student===s), lessons=state.lessons.filter(l=>l.student===s&&l.completedAt).sort((a,b)=>b.day.localeCompare(a.day));
  const observations=state.observations.filter(o=>o.student===s).sort((a,b)=>b.at.localeCompare(a.at));
  const pending=currentLesson(s), firstCorrect=attempts.filter(a=>a.firstCorrect&&!a.hintUsed).length;
  return `<nav class="breadcrumb">${link('花园','')}<span>／</span><span>家长入口</span></nav><p class="eyebrow">一起照看这座花园</p><h1>看看理解，留下观察</h1><p class="page-note">这里显示本设备、本浏览器的记录。Windows 与 Bigme 之间通过 JSON 导出和导入传递记录。</p><div class="feedback-options" role="group" aria-label="选择孩子">${STUDENTS.map(id=>`<button class="feedback-choice ${s===id?'selected':''}" data-action="parent-student" data-value="${id}" aria-pressed="${s===id}">${child(id).name}</button>`).join('')}</div><section class="stats"><div class="stat"><strong>${lessons.length}</strong><span>完成的探索</span></div><div class="stat"><strong>${attempts.length}</strong><span>已记录作答</span></div><div class="stat"><strong>${firstCorrect}</strong><span>无提示首次答对</span></div></section><section class="panel"><h2>学习记录与 Codex 更新</h2><p>导出完整记录，交给 Codex 分析并更新题目。文件包含两个孩子的答题、反馈、观察和发现，也可用于恢复记录。</p><div class="row">${button('导出学习记录 JSON','export')}${button('导入记录 / 备份','import','secondary')}${button('申请保留本地存储','persist','plain')}</div><input id="backup-input" type="file" accept=".json,application/json" hidden><p class="small subsection">导入会合并记录，同一条作答不会重复计数。请定期导出：清除浏览器数据会删除本机记录。导出的家庭记录请放在 learning-records/ 中，不提交到公开仓库。</p></section><form id="observation-form" class="panel"><h2>给${child(s).name}留一条观察</h2><label class="field" for="observation-text"><span>刚刚观察到什么？</span><textarea id="observation-text" required maxlength="2000" placeholder="写具体表现，比如：能数出总数，但分不清几组和每组几个。"></textarea></label><label class="field" for="observation-topic"><span>下次指定主题（可不选）</span><select id="observation-topic"><option value="">只记录观察，不指定主题</option>${content.nodes.filter(n=>n.student===s).map(n=>`<option value="${n.id}">${esc(n.title)}${!isEligible(n,state)?'（前置知识待练习）':''}</option>`).join('')}</select></label><p class="small">主题会用于下一次生成任务，前置知识仍需满足。${pending?'今天的任务已经固定，会保留当前内容。':'若今天还未开始，指定主题可用于今天。'}文字观察留给 Codex 分析，网站不会自动猜测其含义。</p><button type="submit" class="primary">保存观察</button></form><section class="panel"><h2>最近的观察</h2>${observations.length?observations.slice(0,6).map(o=>`<div class="record"><p>${esc(o.text)}</p><p class="small">${dayKey(new Date(o.at))}${o.targetNode?` · 指定：${esc(content.nodes.find(n=>n.id===o.targetNode)?.title||o.targetNode)} · ${o.consumedBy?'已用于安排':'等待安排'}`:''}</p></div>`).join(''):'<p class="empty">记录一条真实表现，比简单写“会了”更有帮助。</p>'}</section><section class="panel"><h2>最近的学习</h2>${lessons.length?lessons.slice(parentPage*6,parentPage*6+6).map(l=>{const a=attempts.filter(x=>x.lessonId===l.id);return `<div class="record"><p class="small">${esc(l.day)} · 内容 ${esc(l.contentVersion)}</p><h3>${esc(l.node.title)}</h3><p>${esc(l.feedback.difficulty)} · ${esc(l.feedback.interest)}</p><p class="small">提示 ${a.filter(x=>x.hintUsed).length} 题 · 重试 ${a.filter(x=>x.retryCount).length} 题 · 首次答错 ${a.filter(x=>!x.firstCorrect).length} 题</p><p class="small">安排原因：${esc(l.reason)}</p></div>`;}).join(''):'<p class="empty">还没有完成的学习记录。</p>'}${pagination(parentPage,lessons.length,'history-page')}</section><section class="panel"><h2>内容版本</h2><p>当前版本：${esc(content.version)}</p><p class="small">更新知识卡和题目会保留本机学习记录；已生成的当天任务继续使用原内容。下载完成后才会提示切换新版。</p>${button('检查网站更新','check-update','secondary')}</section>`;
}
function notFound() { return `<h1>这条小路还没开放</h1><p>回到花园，再选择一个入口吧。</p>${link('回到花园','','button')}`; }
async function render(focus = false) {
  const token=++generation, parts=currentRoute(), key=parts.join('/');
  if (key!==routeKey) {
    selection='';retrying=false;review=null;difficulty='';interest='';parentPage=0;discoveryPage=0;routeKey=key;screenPage=0;hintView=false;
    if (!pendingWorker) document.querySelector('#notice').hidden = true;
  }
  state=await readState();
  let html;
  if (!parts[0]) html=home();
  else if (parts[0]==='parent') html=parentPageHtml();
  else if (STUDENTS.includes(parts[0])) {
    const [s,page,id]=parts;
    if (!page) html=studentHome(s);
    else if(page==='map')html=mapPage(s);
    else if(page==='card')html=cardPage(s,id);
    else if(page==='learn')html=review?answerReview(s,currentLesson(s),review.q,review.response):await lessonPage(s);
    else if(page==='challenge')html=challengePage(s);
    else if(page==='discoveries')html=discoveriesPage(s);
    else if(page==='history')html=historyPage(s);
    else html=notFound();
  } else html=notFound();
  if(token!==generation)return;
  app.innerHTML=html;
  const progress=app.querySelector('.progress-track'),questionPanel=app.querySelector('.question-panel');
  if(progress&&questionPanel)questionPanel.prepend(progress);
  app.dataset.view=!parts[0]?'home':parts[0]==='parent'?'parent':parts[1]||'student';
  screens=mountScreens(app,screenPage);screenPage=screens.page;
  document.title=STUDENTS.includes(parts[0])?`${child(parts[0]).name} · 知识花园`:'橙橙与甜甜 · 知识花园';
  if(focus){app.focus({preventScroll:true});window.scrollTo(0,0);}
}
async function updateLesson(student,fn) {
  state=await mutateState(current=>{
    const lesson=current.lessons.find(l=>l.student===student&&l.day===dayKey());
    if(!lesson)throw new Error('任务日期已变化，请重新进入今日探索。');
    const next=fn(structuredClone(lesson),current);
    return {...current,lessons:current.lessons.map(l=>l.id===lesson.id?next:l)};
  });
}
function activeQuestion(s) {
  const lesson=currentLesson(s), q=lesson?.node.questions.find(q=>!lesson.responses[q.id]?.finalized);
  if(!q)throw new Error('当前问题已经完成，请重新打开今日探索。');
  return {lesson,q};
}
async function finalize(s,q,response) {
  state=await mutateState(current=>{
    const lesson=current.lessons.find(l=>l.student===s&&l.day===dayKey());
    if(!lesson||lesson.responses[q.id]?.finalized)throw new Error('这道题已经保存，请继续下一题。');
    const done={...response,finalized:true};
    const attempt={id:`${lesson.id}:${q.id}`,student:s,nodeId:lesson.node.id,questionId:q.id,questionVersion:q.version,contentVersion:lesson.contentVersion,lessonId:lesson.id,answer:done.answer,firstAnswer:done.firstAnswer,correct:done.correct,firstCorrect:done.firstCorrect,hintUsed:done.hintUsed,retryCount:done.retryCount,at:now(),durationSeconds:Math.max(0,Math.round((Date.now()-Date.parse(done.questionStartedAt))/1000))};
    const next=appendAttempt(current,attempt);
    return {...next,lessons:next.lessons.map(l=>l.id===lesson.id?{...l,responses:{...l.responses,[q.id]:done}}:l)};
  });
  review={q,response}; selection='';retrying=false;screenPage=0;
}
async function perform(action,target) {
  const [s]=currentRoute();
  switch(action) {
    case 'screen-prev':screens.show(screens.page-1);screenPage=screens.page;return;
    case 'screen-next':screens.show(screens.page+1);screenPage=screens.page;return;
    case 'close-hint':hintView=false;screenPage=0;break;
    case 'select-answer': selection=target.dataset.value;break;
    case 'key': {
      const input=document.querySelector('#answer'); if(input)selection=input.value;
      const key=target.dataset.value;
      selection=key==='⌫'?selection.slice(0,-1):key==='−'?(selection.startsWith('-')?selection.slice(1):'-'+selection):(selection+key).slice(0,12);
      break;
    }
    case 'begin-questions': {
      screenPage=0;
      await updateLesson(s,l=>{const at=now();return {...l,startedAt:l.startedAt||at,readAt:at,questionTimes:{...l.questionTimes,[l.node.questions[0].id]:at}};}); break;
    }
    case 'hint': { const {q}=activeQuestion(s); await updateLesson(s,l=>({...l,hints:{...l.hints,[q.id]:true}}));hintView=true;screenPage=0;break; }
    case 'retry': selection='';retrying=true;break;
    case 'submit-answer': {
      screenPage=0;
      const {lesson,q}=activeQuestion(s), answer=q.type==='number'?document.querySelector('#answer').value.trim():selection;
      if(!answer.trim())throw new Error('先选一个答案或填一个数字吧。');
      if(q.type==='number'&&!/^[+\-−]?\d+(\.\d+)?$/.test(answer))throw new Error('这里填一个数字就好。');
      const previous=lesson.responses[q.id], correct=isCorrect(q,answer);
      const response={answer,correct,firstAnswer:previous?.firstAnswer??answer,firstCorrect:previous?.firstCorrect??correct,hintUsed:Boolean(lesson.hints?.[q.id]||previous?.hintUsed||previous),retryCount:previous?1:0,finalized:false,questionStartedAt:previous?.questionStartedAt||lesson.questionTimes?.[q.id]||now(),lastSubmittedAt:now()};
      if(correct||previous)await finalize(s,q,response);
      else await updateLesson(s,l=>({...l,responses:{...l.responses,[q.id]:response},hints:{...l.hints,[q.id]:true}}));
      selection='';retrying=false;break;
    }
    case 'skip': { const {lesson,q}=activeQuestion(s);await finalize(s,q,{...lesson.responses[q.id],hintUsed:true});break; }
    case 'next-question': {
      screenPage=0;
      review=null;
      const {lesson}= {lesson:currentLesson(s)}, q=lesson.node.questions.find(q=>!lesson.responses[q.id]?.finalized);
      if(q)await updateLesson(s,l=>({...l,questionTimes:{...l.questionTimes,[q.id]:l.questionTimes?.[q.id]||now()}}));
      break;
    }
    case 'difficulty':difficulty=target.dataset.value;break;
    case 'interest':interest=target.dataset.value;break;
    case 'finish':
      screenPage=0;
      if(!DIFFICULTIES.includes(difficulty)||!INTERESTS.includes(interest))throw new Error('请分别选择难度和兴趣感受。');
      await updateLesson(s,l=>{if(!l.node.questions.every(q=>l.responses[q.id]?.finalized))throw new Error('先完成今天的三个问题。');return {...l,feedback:{difficulty,interest},completedAt:l.completedAt||now()};});break;
    case 'parent-student':parentStudent=target.dataset.value;parentPage=0;break;
    case 'history-page':parentPage=Math.max(0,Number(target.dataset.value));break;
    case 'discovery-page':discoveryPage=Math.max(0,Number(target.dataset.value));break;
    case 'export': {
      state=await readState();const blob=new Blob([JSON.stringify(makeBackup(state,content.version),null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob), a=document.createElement('a');a.href=url;a.download=`knowledge-garden-${dayKey()}-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('导出文件已交给浏览器下载。请确认文件已保存，再传给 Codex。');return;
    }
    case 'import':document.querySelector('#backup-input').click();return;
    case 'persist': {
      const granted=await navigator.storage?.persist?.();notify(granted?'浏览器已允许持久保存，仍建议定期导出备份。':'浏览器未授予持久保存。可以继续使用，请定期导出备份。');return;
    }
    case 'check-update':
      if(!registration){notify('离线缓存尚未启用。请通过 HTTPS 或本机预览网址打开，并检查浏览器支持情况。');return;}
      await registration.update();if(registration.waiting)showUpdate(registration.waiting);else notify('已发起更新检查；发现新版后会提示切换。');return;
    case 'activate-update':
      if(pendingWorker){pendingWorker.postMessage({type:'ACTIVATE'});notify('正在切换到已下载的新版本，学习记录会保留。');}return;
    default:return;
  }
  await render();
}
app.addEventListener('click',async event=>{
  const target=event.target.closest('button[data-action]');if(!target||busy)return;
  busy=true;app.setAttribute('aria-busy','true');
  try{await perform(target.dataset.action,target);}catch(error){notify(error.message,true);}finally{busy=false;app.removeAttribute('aria-busy');}
});
app.addEventListener('input',event=>{
  if(event.target.id==='answer'){selection=event.target.value;const submit=app.querySelector('[data-action="submit-answer"]');if(submit)submit.disabled=!selection.trim();}
});
app.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;busy=true;
  try {
    const [s]=currentRoute();
    if(event.target.id==='discovery-form'){
      const text=document.querySelector('#discovery-text').value.trim();if(!text)throw new Error('先写下一个问题或发现吧。');
      state=await mutateState(current=>({...current,discoveries:[...current.discoveries,{id:uid(),student:s,text,at:now()}]}));discoveryPage=0;
    }else if(event.target.id==='observation-form'){
      const text=document.querySelector('#observation-text').value.trim(),targetNode=document.querySelector('#observation-topic').value||null;
      if(!text)throw new Error('先写一条具体观察。');
      state=await mutateState(current=>({...current,observations:[...current.observations,{id:uid(),student:parentStudent,text,targetNode,at:now(),consumedBy:null}]}));
    }
    await render();notify('已经保存在本设备。');
  }catch(error){notify(error.message,true);}finally{busy=false;}
});
app.addEventListener('change',async event=>{
  if(event.target.id!=='backup-input'||!event.target.files[0]||busy)return;
  busy=true;
  try{
    const file=event.target.files[0];if(file.size>10*1024*1024)throw new Error('文件超过 10 MB，请选择知识花园导出的记录。');
    const incoming=validateBackup(JSON.parse(await file.text()));state=await mutateState(current=>mergeBackup(current,incoming));await render();notify('记录已合并，重复作答不会再次计数。');
  }catch(error){notify(error instanceof SyntaxError?'这个文件不是有效的 JSON 记录。':error.message,true);}finally{busy=false;}
});
window.addEventListener('hashchange',()=>render(true).catch(error=>notify(error.message,true)));
let resizeTimer;
window.addEventListener('resize',()=>{
  clearTimeout(resizeTimer);resizeTimer=setTimeout(async()=>{
    if(!state||busy)return;
    const values=[...app.querySelectorAll('input[id],textarea[id],select[id]')].filter(el=>el.type!=='file').map(el=>[el.id,el.value]);
    try{await render();for(const [id,value]of values){const el=document.getElementById(id);if(el)el.value=value;}}catch(error){notify(error.message,true);}
  },100);
});
window.addEventListener('online',updateConnection);window.addEventListener('offline',updateConnection);
function updateConnection(){const el=document.querySelector('#connection');el.textContent=navigator.onLine?'记录保存在本机':'离线 · 本机记录';el.classList.toggle('connection-offline',!navigator.onLine);}
function showUpdate(worker){pendingWorker=worker;const el=document.querySelector('#notice');el.classList.remove('error');el.hidden=false;el.innerHTML=`<div class="update-banner"><span>新版内容已下载。切换版本会保留学习记录与当天任务。</span>${button('切换新版','activate-update','secondary')}</div>`;}
document.querySelector('#notice').addEventListener('click',event=>{if(event.target.closest('[data-action="dismiss-notice"]'))document.querySelector('#notice').hidden=true;else if(event.target.closest('[data-action="activate-update"]'))perform('activate-update',event.target).catch(error=>notify(error.message,true));});
async function setupOffline(){
  if(!('serviceWorker' in navigator)||!window.isSecureContext){notify('当前浏览器没有启用离线缓存。在线学习仍可使用，本机记录照常保存。');return;}
  const hadController=Boolean(navigator.serviceWorker.controller);
  let switching=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!switching&&(hadController||pendingWorker)){switching=true;location.reload();}});
  registration=await navigator.serviceWorker.register('./sw.js',{scope:'./'});
  if(registration.waiting)showUpdate(registration.waiting);
  registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'){if(navigator.serviceWorker.controller)showUpdate(worker);else notify('离线内容已下载。在这个浏览器中可离线打开知识花园。');}});});
}
try{
  validateContent(content);state=await openStore();updateConnection();document.querySelector('#version').textContent=`内容 ${content.version}`;
  await render();setupOffline().catch(()=>notify('离线内容下载暂未完成，请保持联网后再试。'));
}catch(error){app.innerHTML=`<section class="panel"><h1>花园还没有打开</h1><p>${esc(error.message)}</p><p>请重试，或换用支持本地存储的浏览器。</p></section>`;}
