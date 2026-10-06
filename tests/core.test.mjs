import test from 'node:test';
import assert from 'node:assert/strict';
import {content} from '../site/content.js';
import {emptyState,dayKey,isCorrect,appendAttempt,nodeProgress,isEligible,chooseNode,makeLesson,addLesson,validateContent,validateBackup,mergeBackup,makeBackup} from '../site/core.js';
function answerLesson(state,student,day,options={}){
  const lesson=makeLesson(content,state,student,day);state=addLesson(state,lesson);
  for(const q of lesson.node.questions){
    const at=`${day}T01:00:00.000Z`,correct=options.correct??true,hintUsed=options.hintUsed??false;
    const response={answer:correct?q.answer:'不正确',firstAnswer:correct?q.answer:'不正确',correct,firstCorrect:correct,hintUsed,retryCount:0,finalized:true,questionStartedAt:at,lastSubmittedAt:at};
    lesson.responses[q.id]=response;
    state=appendAttempt(state,{id:`${lesson.id}:${q.id}`,student,nodeId:lesson.node.id,questionId:q.id,questionVersion:q.version,contentVersion:content.version,lessonId:lesson.id,answer:response.answer,firstAnswer:response.firstAnswer,correct,firstCorrect:correct,hintUsed,retryCount:0,at,durationSeconds:4});
  }
  lesson.feedback={difficulty:options.difficulty||'正合适',interest:'有趣'};lesson.completedAt=`${day}T01:02:00.000Z`;
  state.lessons=state.lessons.map(l=>l.id===lesson.id?lesson:l);return state;
}
test('首批内容的答案、归属和前置关系完整且无循环',()=>{
  validateContent(content);assert.equal(content.nodes.length,16);
  for(const s of ['cc','tt'])assert.equal(content.nodes.filter(n=>n.student===s).length,8);
  for(const n of content.nodes)for(const q of n.questions)assert.equal(isCorrect(q,q.answer),true);
  const bad=structuredClone(content);bad.nodes[0].prerequisites=[bad.nodes[0].id];assert.throws(()=>validateContent(bad),/循环/);
});
test('日期以北京时间为准，跨 UTC 日期仍固定今日',()=>{
  assert.equal(dayKey(new Date('2026-10-05T16:30:00Z')),'2026-10-06');
});
test('数字答案支持负号和全角数字，拒绝空值、表达式与 NaN',()=>{
  const q={type:'number',answer:'-5'};assert.ok(isCorrect(q,'−５'));assert.ok(isCorrect(q,'-5.0'));
  for(const a of ['','NaN','-2-3','0x10','Infinity'])assert.equal(isCorrect(q,a),false);
  assert.equal(isCorrect({type:'number',answer:'0'},''),false);
});
test('同一条作答幂等；两个孩子的掌握状态独立',()=>{
  let state=answerLesson(emptyState(),'cc','2026-10-06');const length=state.attempts.length;
  state=appendAttempt(state,state.attempts[0]);assert.equal(state.attempts.length,length);
  assert.equal(nodeProgress(state,'tt','cc-number-line').count,0);
  assert.equal(nodeProgress(state,'cc','cc-number-line').status,'learning');
});
test('提示后答对不能直接判定掌握；一次全答对也不判定掌握',()=>{
  const hinted=answerLesson(emptyState(),'cc','2026-10-06',{hintUsed:true});
  const p=nodeProgress(hinted,'cc','cc-number-line');assert.equal(p.independent,0);assert.equal(p.status,'learning');
  assert.equal(nodeProgress(answerLesson(emptyState(),'cc','2026-10-06'),'cc','cc-number-line').status,'learning');
});
test('答题证据开启前置关系；第二天推荐发生合理变化',()=>{
  const state=answerLesson(emptyState(),'cc','2026-10-06');
  assert.ok(isEligible(content.nodes.find(n=>n.id==='cc-distance'),state));
  assert.equal(chooseNode(content,state,'cc','2026-10-07').node.id,'cc-negative');
});
test('有点难的反馈会安排一次回顾，兴趣不会替代难度',()=>{
  const state=answerLesson(emptyState(),'tt','2026-10-06',{difficulty:'有点难'});
  assert.equal(chooseNode(content,state,'tt','2026-10-07').node.id,'tt-groups');
});
test('家长主题受前置约束，使用后不永久强制该主题',()=>{
  let state=emptyState();state.observations.push({id:'o',student:'cc',at:'2026-10-06T00:00:00Z',text:'试试看',targetNode:'cc-distance',consumedBy:null});
  assert.notEqual(chooseNode(content,state,'cc','2026-10-06').node.id,'cc-distance');
  state=answerLesson(state,'cc','2026-10-06');
  const lesson=makeLesson(content,state,'cc','2026-10-07');assert.equal(lesson.node.id,'cc-distance');
  state=addLesson(state,lesson);assert.equal(state.observations[0].consumedBy,lesson.id);
});
test('内容更新保留今日任务快照、版本和作答',()=>{
  const state=answerLesson(emptyState(),'cc','2026-10-06');
  const updated=structuredClone(content);updated.version='new';updated.nodes[0].title='新版标题';
  const existing=makeLesson(updated,state,'cc','2026-10-06');
  assert.equal(existing.contentVersion,content.version);assert.equal(existing.node.title,'数轴上的位置');assert.equal(Object.keys(existing.responses).length,3);
});
test('导出再导入保持数据，重复合并不会重复计数',()=>{
  const original=answerLesson(emptyState(),'tt','2026-10-06'),incoming=validateBackup(makeBackup(original,content.version));
  const merged=mergeBackup(emptyState(),incoming);assert.deepEqual(merged,original);
  assert.deepEqual(mergeBackup(merged,incoming),original);
});
test('非法导入与作答冲突不改变原记录',()=>{
  assert.throws(()=>validateBackup({}),/完整 JSON/);
  const state=answerLesson(emptyState(),'cc','2026-10-06'),bad=makeBackup(state,content.version);
  bad.state.attempts[0].student='tt';assert.throws(()=>validateBackup(bad),/不匹配/);
  const incoming=structuredClone(state);incoming.attempts[0].answer='修改后的答案';
  assert.throws(()=>mergeBackup(state,incoming),/不同内容/);assert.notEqual(state.attempts[0].answer,'修改后的答案');
});
test('导入会保留较新的未完成答题与提示状态',()=>{
  const base=addLesson(emptyState(),makeLesson(content,emptyState(),'tt','2026-10-06'));
  const incoming=structuredClone(base),lesson=incoming.lessons[0],q=lesson.node.questions[0],at='2026-10-06T01:00:00Z';
  lesson.readAt=at;lesson.startedAt=at;lesson.hints={[q.id]:true};
  lesson.responses[q.id]={answer:'5',firstAnswer:'5',correct:false,firstCorrect:false,hintUsed:false,retryCount:0,finalized:false,questionStartedAt:at,lastSubmittedAt:at};
  const merged=mergeBackup(base,validateBackup(makeBackup(incoming,content.version)));
  assert.equal(merged.lessons[0].responses[q.id].answer,'5');assert.equal(merged.lessons[0].hints[q.id],true);
  assert.equal(merged.attempts.length,0);
});
test('两天独立作答提供掌握证据，答错仍然能改变状态',()=>{
  let state=answerLesson(emptyState(),'cc','2026-10-06');
  state.observations.push({id:'review',student:'cc',at:'2026-10-07T00:00:00Z',text:'复习',targetNode:'cc-number-line',consumedBy:null});
  state=answerLesson(state,'cc','2026-10-07');assert.equal(nodeProgress(state,'cc','cc-number-line').status,'mastered');
  state.observations.push({id:'review2',student:'cc',at:'2026-10-08T00:00:00Z',text:'复习',targetNode:'cc-number-line',consumedBy:null});
  state=answerLesson(state,'cc','2026-10-08',{correct:false});assert.equal(nodeProgress(state,'cc','cc-number-line').status,'learning');
});
test('校验拒绝异常配图和与题目不一致的作答结果',()=>{
  const bad=structuredClone(content);bad.nodes[0].art={type:'line',points:[999999999]};assert.throws(()=>validateContent(bad),/配图/);
  const state=answerLesson(emptyState(),'tt','2026-10-06'),backup=makeBackup(state,content.version);backup.state.attempts[0].correct=false;assert.throws(()=>validateBackup(backup),/不一致/);
});
