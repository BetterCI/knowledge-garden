import fs from 'node:fs/promises';
import { validateBackup, nodeProgress, STUDENTS, dayKey } from '../site/core.js';
import { content } from '../site/content.js';
const input=process.argv[2];
if(!input){console.error('用法：node scripts/analyze-records.mjs "learning-records/导出的文件.json"');process.exit(1);}
try {
  const stat=await fs.stat(input);if(stat.size>10*1024*1024)throw new Error('文件超过 10 MB');
  const backup=JSON.parse(await fs.readFile(input,'utf8')),state=validateBackup(backup);
  for(const s of STUDENTS){
    const attempts=state.attempts.filter(a=>a.student===s),lessons=state.lessons.filter(l=>l.student===s&&l.completedAt);
    console.log(`\n${content.students[s].name}：${lessons.length} 次探索，${attempts.length} 次作答`);
    console.log(`无提示首次答对 ${attempts.filter(a=>a.firstCorrect&&!a.hintUsed).length} 题；使用提示 ${attempts.filter(a=>a.hintUsed).length} 题；重试 ${attempts.filter(a=>a.retryCount).length} 题。`);
    for(const id of new Set(attempts.map(a=>a.nodeId))){
      const p=nodeProgress(state,s,id),node=content.nodes.find(n=>n.id===id),a=attempts.filter(a=>a.nodeId===id);
      console.log(`  ${node?.title||id}：${p.count} 次作答，${p.independent} 道题有独立答对证据，${p.sessions} 个日期；${p.status==='mastered'?'已有掌握证据':'正在探索'}`);
      for(const attempt of a.filter(x=>!x.firstCorrect)){
        const lesson=state.lessons.find(l=>l.id===attempt.lessonId),q=lesson.node.questions.find(q=>q.id===attempt.questionId);
        console.log(`    ${dayKey(new Date(attempt.at))} ${q.prompt} | 首次答案：${attempt.firstAnswer} | 正确答案：${q.answer} | 最终${attempt.correct?'答对':'未答对'}${attempt.hintUsed?'（有提示）':''}`);
      }
    }
    for(const l of lessons.slice().sort((a,b)=>a.day.localeCompare(b.day)).slice(-7))console.log(`  反馈 ${l.day} ${l.node.title}：${l.feedback.difficulty} / ${l.feedback.interest}`);
    for(const o of state.observations.filter(o=>o.student===s))console.log(`  家长观察 ${dayKey(new Date(o.at))}：${o.text}`);
    for(const d of state.discoveries.filter(d=>d.student===s))console.log(`  孩子的发现 ${dayKey(new Date(d.at))}：${d.text}`);
  }
}catch(error){console.error(`记录分析失败：${error.message}`);process.exit(1);}
