export const STUDENTS = ['cc', 'tt'];
export const DIFFICULTIES = ['太简单', '正合适', '有点难', '没看懂'];
export const INTERESTS = ['有趣', '一般'];
export const SCHEMA_VERSION = 1;
export function dayKey(date = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone:'Asia/Shanghai', year:'numeric', month:'2-digit', day:'2-digit' }).format(date);
}
export function emptyState() { return { schemaVersion:SCHEMA_VERSION, attempts:[], lessons:[], observations:[], discoveries:[] }; }
export function normalizeAnswer(value) { return String(value).trim().replace(/−|﹣|－/g, '-').replace(/＋/g, '+').replace(/[０-９]/g, c => String(c.charCodeAt(0) - 65296)); }
export function isCorrect(question, value) {
  const input = normalizeAnswer(value);
  if (question.type === 'number') return /^[+-]?\d+(\.\d+)?$/.test(input) && Number(input) === Number(question.answer);
  return input === normalizeAnswer(question.answer);
}
export function appendAttempt(state, attempt) {
  if (state.attempts.some(a => a.id === attempt.id)) return state;
  return { ...state, attempts:[...state.attempts, attempt] };
}
export function nodeProgress(state, student, nodeId) {
  const attempts = state.attempts.filter(a => a.student === student && a.nodeId === nodeId);
  if (!attempts.length) return { status:'unseen', mastery:0, count:0, unique:0, independent:0, sessions:0 };
  const recent = attempts.slice().sort((a,b) => a.at.localeCompare(b.at)).slice(-6);
  const score = a => a.correct ? (a.hintUsed ? .6 : a.retryCount ? .75 : 1) : 0;
  const mastery = recent.reduce((sum,a) => sum + score(a), 0) / recent.length;
  const unique = new Set(attempts.map(a => a.questionId)).size;
  const independent = new Set(attempts.filter(a => a.correct && !a.hintUsed && !a.retryCount).map(a => a.questionId)).size;
  const sessions = new Set(attempts.map(a => a.lessonId)).size;
  const mastered = mastery >= .8 && independent >= 3 && sessions >= 2;
  return { status:mastered ? 'mastered' : 'learning', mastery, count:attempts.length, unique, independent, sessions };
}
export function isEligible(node, state) {
  return node.prerequisites.every(id => { const p = nodeProgress(state,node.student,id); return p.unique >= 2 && p.mastery >= .6; });
}
export function chooseNode(content, state, student, date = dayKey()) {
  const nodes = content.nodes.filter(n => n.student === student);
  const observations = state.observations.filter(o => o.student === student && o.targetNode && !o.consumedBy).sort((a,b) => b.at.localeCompare(a.at));
  for (const observation of observations) {
    const target = nodes.find(n => n.id === observation.targetNode);
    if (target && isEligible(target,state)) return { node:target, reason:'根据家长指定的主题安排。', observationId:observation.id };
  }
  const eligible = nodes.filter(n => isEligible(n,state));
  const previous = state.lessons.filter(l => l.student === student && l.completedAt && l.day < date).sort((a,b) => b.day.localeCompare(a.day))[0];
  if (previous && ['有点难','没看懂'].includes(previous.feedback?.difficulty)) {
    const node = eligible.find(n => n.id === previous.node.id);
    if (node && previous.reason !== '上次反馈需要帮助，今天再理解一次。') return { node, reason:'上次反馈需要帮助，今天再理解一次。' };
  }
  const weak = eligible.filter(n => { const p = nodeProgress(state,student,n.id); return p.count && p.mastery < .6; });
  const weakOther = weak.find(n => n.id !== previous?.node.id);
  if (weakOther) return { node:weakOther, reason:'这个概念还需要一点练习，今天再看看。' };
  const start = eligible.find(n => n.id === content.students[student].startNode);
  if (start && !nodeProgress(state,student,start.id).count) return { node:start, reason:'先用一组试学题，了解当前的理解情况。' };
  const unseen = eligible.find(n => !nodeProgress(state,student,n.id).count);
  if (unseen) return { node:unseen, reason:'今天探索一个新概念，看看它与已有知识的联系。' };
  const sorted = eligible.slice().sort((a,b) => {
    const pa = nodeProgress(state,student,a.id), pb = nodeProgress(state,student,b.id);
    return pa.mastery - pb.mastery || pa.sessions - pb.sessions;
  });
  const next = sorted.find(n => n.id !== previous?.node.id) || sorted[0] || nodes[0];
  return { node:next, reason:'回顾已有知识，看看换一天还能不能解释清楚。' };
}
export function makeLesson(content, state, student, date = dayKey()) {
  if (!STUDENTS.includes(student)) throw new Error('未知的孩子入口');
  const existing = state.lessons.find(l => l.student === student && l.day === date);
  if (existing) return existing;
  const chosen = chooseNode(content,state,student,date);
  return {
    id:`${student}:${date}`, student, day:date, contentVersion:content.version,
    node:structuredClone(chosen.node), reason:chosen.reason, observationId:chosen.observationId || null,
    startedAt:null, readAt:null, responses:{}, feedback:null, completedAt:null
  };
}
export function addLesson(state, lesson) {
  if (state.lessons.some(l => l.id === lesson.id)) return state;
  return { ...state, lessons:[...state.lessons,lesson], observations:state.observations.map(o => o.id === lesson.observationId ? { ...o, consumedBy:lesson.id } : o) };
}
const textField = (value, max = 5000) => typeof value === 'string' && value.length <= max;
const timestamp = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
function validateArt(spec) {
  if (spec == null) return;
  if (typeof spec !== 'object' || Array.isArray(spec)) throw new Error('配图格式不正确');
  if (spec.type === 'groups' && Number.isInteger(spec.groups) && spec.groups >= 1 && spec.groups <= 6 && Number.isInteger(spec.each) && spec.each >= 1 && spec.each <= 10) return;
  if (spec.type === 'shapes' && Array.isArray(spec.items) && spec.items.length <= 12 && spec.items.every(v => textField(v,20))) return;
  if (spec.type === 'rectangle' && textField(spec.widthLabel,40) && textField(spec.heightLabel,40)) return;
  if (spec.type === 'line' && Array.isArray(spec.points) && spec.points.length <= 20 && spec.points.every(v => Number.isInteger(v) && Math.abs(v) <= 20)) return;
  throw new Error('配图参数不正确');
}
export function validateContent(content) {
  if (!textField(content?.version,80) || !Array.isArray(content.nodes) || !content.nodes.length || content.nodes.length > 1000) throw new Error('内容包格式不正确');
  const ids = new Set();
  for (const node of content.nodes) {
    if (!textField(node.id,100) || ids.has(node.id) || !STUDENTS.includes(node.student)) throw new Error('知识节点编号或孩子归属不正确');
    ids.add(node.id);
    validateArt(node.art);
    if (![node.title,node.summary,node.example,node.curiosity].every(v => textField(v)) || !Array.isArray(node.prerequisites) || !Array.isArray(node.related)) throw new Error('知识卡缺少必要字段');
    if (!Array.isArray(node.questions) || node.questions.length < 2 || node.questions.length > 4) throw new Error('每张知识卡需要 2–4 道题');
    const questionIds = new Set();
    for (const q of node.questions) {
      if (!textField(q.id,150) || questionIds.has(q.id) || !['choice','number'].includes(q.type) || ![q.prompt,q.hint,q.solution,q.answer,q.version].every(v => textField(v))) throw new Error('题目字段不正确');
      questionIds.add(q.id);
      validateArt(q.art);
      if (q.type === 'choice' && (!Array.isArray(q.options) || q.options.length < 2 || !q.options.every(v => textField(v,500)) || new Set(q.options).size !== q.options.length || !q.options.includes(q.answer))) throw new Error('选项或答案不正确');
      if (q.type === 'number' && !/^-?\d+(\.\d+)?$/.test(q.answer)) throw new Error('数字题答案不正确');
    }
  }
  for (const node of content.nodes) {
    for (const id of [...node.prerequisites,...node.related]) if (!content.nodes.some(n => n.id === id && n.student === node.student)) throw new Error(`节点 ${node.id} 引用了不存在或其他孩子的节点`);
  }
  const visiting = new Set(), visited = new Set();
  function visit(id) { if (visiting.has(id)) throw new Error('前置知识存在循环'); if (visited.has(id)) return; visiting.add(id); content.nodes.find(n => n.id === id).prerequisites.forEach(visit); visiting.delete(id); visited.add(id); }
  content.nodes.forEach(n => visit(n.id));
  for (const student of STUDENTS) if (!content.nodes.some(n => n.student === student && n.id === content.students?.[student]?.startNode && !n.prerequisites.length)) throw new Error('试学起点缺失或需要前置知识');
  return content;
}
export function validateBackup(input) {
  if (input?.format !== 'knowledge-garden-backup' || input.schemaVersion !== SCHEMA_VERSION || !input.state) throw new Error('请选择知识花园导出的完整 JSON 记录');
  const state = input.state;
  if (state.schemaVersion !== SCHEMA_VERSION) throw new Error('记录版本不受支持');
  for (const kind of ['attempts','lessons','observations','discoveries']) {
    if (!Array.isArray(state[kind]) || state[kind].length > 10000) throw new Error('记录数量或格式不正确');
    const ids = new Set();
    for (const item of state[kind]) {
      if (!item || !textField(item.id,200) || !item.id || ids.has(item.id) || !STUDENTS.includes(item.student)) throw new Error('记录编号重复或孩子归属不正确');
      ids.add(item.id);
      if (kind === 'attempts' && (!timestamp(item.at) || !textField(item.nodeId,100) || !textField(item.questionId,150) || !textField(item.questionVersion,80) || !textField(item.contentVersion,80) || !textField(item.answer,500) || !textField(item.firstAnswer,500) || typeof item.correct !== 'boolean' || typeof item.firstCorrect !== 'boolean' || typeof item.hintUsed !== 'boolean' || !Number.isInteger(item.retryCount) || item.retryCount < 0 || item.retryCount > 1 || !textField(item.lessonId,200) || !Number.isFinite(item.durationSeconds) || item.durationSeconds < 0)) throw new Error('作答记录格式不正确');
      if (kind === 'lessons') {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(item.day) || item.id !== `${item.student}:${item.day}` || item.node?.student !== item.student || !textField(item.reason,500) || !textField(item.contentVersion,80) || !item.responses || typeof item.responses !== 'object' || Array.isArray(item.responses)) throw new Error('每日学习记录格式不正确');
        for (const key of ['startedAt','readAt']) if (item[key] != null && !timestamp(item[key])) throw new Error('学习开始时间不正确');
        validateContent({version:item.contentVersion, students:{cc:{startNode:'backup-cc'},tt:{startNode:'backup-tt'}},nodes:[...STUDENTS.map(s => ({id:`backup-${s}`,student:s,title:'backup',summary:'',example:'',curiosity:'',prerequisites:[],related:[],questions:[{id:'a',type:'number',prompt:'',answer:'0',hint:'',solution:'',version:'1'},{id:'b',type:'number',prompt:'',answer:'0',hint:'',solution:'',version:'1'}]})),{...item.node,prerequisites:[],related:[]}]});
        if (item.feedback && (!DIFFICULTIES.includes(item.feedback.difficulty) || !INTERESTS.includes(item.feedback.interest))) throw new Error('学习反馈格式不正确');
        for (const key of ['hints','questionTimes']) if (item[key] != null) {
          if (typeof item[key] !== 'object' || Array.isArray(item[key])) throw new Error('提示或作答时间格式不正确');
          for (const [id,value] of Object.entries(item[key])) if (!item.node.questions.some(q => q.id === id) || (key === 'hints' ? typeof value !== 'boolean' : !timestamp(value))) throw new Error('提示或作答时间格式不正确');
        }
        if (item.completedAt && (!timestamp(item.completedAt) || !item.feedback)) throw new Error('完成状态不正确');
        for (const [id,response] of Object.entries(item.responses)) if (!item.node.questions.some(q => q.id === id) || !response || !textField(response.answer,500) || !textField(response.firstAnswer,500) || typeof response.correct !== 'boolean' || typeof response.firstCorrect !== 'boolean' || typeof response.hintUsed !== 'boolean' || ![0,1].includes(response.retryCount) || typeof response.finalized !== 'boolean' || !timestamp(response.questionStartedAt) || !timestamp(response.lastSubmittedAt)) throw new Error('题目进度格式不正确');
        if (item.completedAt && !item.node.questions.every(q => item.responses[q.id]?.finalized)) throw new Error('已完成学习缺少作答记录');
      }
      if (['observations','discoveries'].includes(kind) && (!timestamp(item.at) || !textField(item.text,2000) || !item.text.trim())) throw new Error('观察或发现格式不正确');
      if (kind === 'observations' && item.targetNode != null && !textField(item.targetNode,100)) throw new Error('观察主题格式不正确');
    }
  }
  for (const a of state.attempts) {
    const lesson = state.lessons.find(l => l.id === a.lessonId && l.student === a.student && l.node.id === a.nodeId);
    if (!lesson || !lesson.node.questions.some(q => q.id === a.questionId) || a.id !== `${a.lessonId}:${a.questionId}`) throw new Error('作答记录与每日任务不匹配');
    const question = lesson.node.questions.find(q => q.id === a.questionId), response = lesson.responses[a.questionId];
    if (!response?.finalized || a.contentVersion !== lesson.contentVersion || a.questionVersion !== question.version || ['answer','firstAnswer','correct','firstCorrect','hintUsed','retryCount'].some(key => a[key] !== response[key]) || a.correct !== isCorrect(question,a.answer) || a.firstCorrect !== isCorrect(question,a.firstAnswer)) throw new Error('作答结果与题目快照不一致');
  }
  for (const l of state.lessons) for (const q of l.node.questions) if (l.responses[q.id]?.finalized && !state.attempts.some(a => a.id === `${l.id}:${q.id}`)) throw new Error('题目进度缺少对应作答记录');
  return structuredClone(state);
}
export function mergeBackup(current, incoming) {
  const result = { ...current };
  for (const kind of ['attempts','lessons','observations','discoveries']) {
    const map = new Map(current[kind].map(item => [item.id,item]));
    for (const item of incoming[kind]) {
      const old = map.get(item.id);
      if (!old) { map.set(item.id,item); continue; }
      if (kind === 'attempts' && JSON.stringify(old) !== JSON.stringify(item)) throw new Error('同一作答编号出现不同内容，已取消导入以保留原记录');
      if (kind === 'lessons') {
        if (JSON.stringify(old.node) !== JSON.stringify(item.node) || old.contentVersion !== item.contentVersion) throw new Error('同一天存在不同的学习任务，已取消导入');
        const responses = { ...old.responses };
        for (const [id,response] of Object.entries(item.responses)) {
          const current = responses[id];
          if (!current || (response.finalized && !current.finalized) || (!current.finalized && response.lastSubmittedAt > current.lastSubmittedAt)) responses[id] = response;
        }
        const base = item.completedAt && !old.completedAt ? item : old;
        map.set(item.id,{ ...base, startedAt:old.startedAt || item.startedAt, readAt:old.readAt || item.readAt, responses, ...(old.hints||item.hints?{hints:{...old.hints,...item.hints}}:{}), ...(old.questionTimes||item.questionTimes?{questionTimes:{...item.questionTimes,...old.questionTimes}}:{}) });
      }
      if (kind === 'observations' && !old.consumedBy && item.consumedBy) map.set(item.id,{...old,consumedBy:item.consumedBy});
    }
    result[kind] = [...map.values()];
  }
  validateBackup({format:'knowledge-garden-backup',schemaVersion:SCHEMA_VERSION,state:result});
  return result;
}
export function makeBackup(state, contentVersion) {
  return { format:'knowledge-garden-backup', schemaVersion:SCHEMA_VERSION, exportedAt:new Date().toISOString(), contentVersion, timezone:'Asia/Shanghai', state:structuredClone(state) };
}
