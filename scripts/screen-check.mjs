import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.GARDEN_PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
await fs.mkdir('test-results',{recursive:true});
const errors=[];let checked=0;
try{
  for(const [width,height] of [[600,800],[800,600],[360,640],[1100,900],[1024,768]]){
    const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage();
    await page.goto('http://127.0.0.1:4173/');await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));await page.waitForTimeout(200);
    for(const route of ['', 'cc', 'tt', 'cc/map','tt/map','cc/card/cc-number-line','tt/card/tt-groups','cc/challenge','tt/discoveries','cc/history','parent','tt/learn']){
      await page.goto(`http://127.0.0.1:4173/#/${route}`);await page.waitForFunction(()=>Boolean(document.querySelector('#app')?.dataset.screenCount));
      for(let n=0;n<30;n++){
        const measurement=await page.evaluate(()=>{
          const surface=document.querySelector('.screen-body').getBoundingClientRect(),visible=[...document.querySelectorAll('.screen-page')].find(p=>!p.hidden),rect=visible.getBoundingClientRect();
          return {height:rect.height,capacity:surface.height,overflow:document.documentElement.scrollHeight>innerHeight||document.documentElement.scrollWidth>innerWidth,atomic:Boolean(visible.dataset.needsPortrait),text:visible.innerText.slice(0,100)};
        });checked++;
        if(measurement.overflow||measurement.height>measurement.capacity+2||measurement.atomic)errors.push({width,height,route,page:n+1,...measurement});
        const next=page.getByRole('button',{name:'下一页 →',exact:true});if(!await next.isVisible()||await next.isDisabled())break;await next.click();
      }
      if(width===600&&['','tt','tt/learn'].includes(route)){
        await page.reload();await page.waitForFunction(()=>Boolean(document.querySelector('#app')?.dataset.screenCount));await page.screenshot({path:`test-results/fullscreen-${route.replaceAll('/','-')||'home'}.png`});
      }
    }
    const nodes=await page.evaluate(async()=>{const {content}=await import('./content.js');return content.nodes.map(n=>({id:n.id,student:n.student}));});
    for(const node of nodes){
      await page.evaluate(async({id,student})=>{
        const {content}=await import('./content.js'),{emptyState,makeLesson,addLesson}=await import('./core.js'),{mutateState}=await import('./storage.js');
        const state=emptyState(),lesson=makeLesson(content,state,student);lesson.node=structuredClone(content.nodes.find(n=>n.id===id));lesson.startedAt=lesson.readAt=new Date().toISOString();await mutateState(()=>addLesson(state,lesson));
      },node);
      await page.goto(`http://127.0.0.1:4173/#/${node.student}/learn`);await page.reload();await page.waitForFunction(()=>Boolean(document.querySelector('.question-panel')));
      for(let n=0;n<20;n++){
        const measurement=await page.evaluate(()=>{const surface=document.querySelector('.screen-body').getBoundingClientRect(),visible=[...document.querySelectorAll('.screen-page')].find(p=>!p.hidden);return {height:visible.getBoundingClientRect().height,capacity:surface.height,atomic:Boolean(visible.dataset.needsPortrait),overflow:document.documentElement.scrollHeight>innerHeight||document.documentElement.scrollWidth>innerWidth};});checked++;
        if(measurement.overflow||measurement.atomic||measurement.height>measurement.capacity+2)errors.push({width,height,node:node.id,page:n+1,...measurement});
        const next=page.getByRole('button',{name:'下一页 →',exact:true});if(!await next.isVisible()||await next.isDisabled())break;await next.click();
      }
      if(width===600&&node.id==='tt-groups'){await page.reload();await page.waitForFunction(()=>Boolean(document.querySelector('.question-panel')));await page.screenshot({path:'test-results/fullscreen-question.png'});}
    }
    // 窗口变化重新分页，保留尚未提交的表单输入。
    await page.goto('http://127.0.0.1:4173/#/tt/discoveries');await page.getByLabel('今天想到的问题或发现').fill('转屏后也要保留这个问题');await page.setViewportSize({width:height,height:width});await page.waitForTimeout(200);assert.equal(await page.getByLabel('今天想到的问题或发现').inputValue(),'转屏后也要保留这个问题');
    await context.close();
  }
  console.log(JSON.stringify({checked,errors},null,2));assert.equal(errors.length,0,'所有可见页面必须完整放入屏幕');
}finally{await browser.close();}
