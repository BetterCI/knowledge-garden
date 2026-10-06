// 可选浏览器验收。使用已有 Playwright，不在项目中安装浏览器。
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { content } from '../site/content.js';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.GARDEN_PLAYWRIGHT_PATH||'playwright');
const url=process.env.GARDEN_PREVIEW_URL||'http://127.0.0.1:4173';
await fs.mkdir('test-results',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1100,height:900},acceptDownloads:true});
const page=await context.newPage();
const errors=[];page.on('pageerror',error=>errors.push(error.message));
async function navigate(hash){await page.goto(`${url}/#/${hash}`);await page.locator('#app h1').waitFor();}
async function getState(){return page.evaluate(async()=>{const {readState}=await import('./storage.js');return readState();});}
async function answer(text){await page.getByRole('button',{name:text,exact:true}).click();await page.getByRole('button',{name:'确认答案',exact:true}).click();}
try{
  await navigate('');
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
  await page.waitForTimeout(300);
  await page.screenshot({path:'test-results/home-desktop.png',fullPage:true});
  await page.getByRole('link',{name:'橙橙的手绘头像 橙橙 从一个为什么，走向下一扇门。 进入花园 →'}).count().then(async count=>{if(count)await page.getByRole('link',{name:'橙橙的手绘头像 橙橙 从一个为什么，走向下一扇门。 进入花园 →'}).click();else await navigate('cc');});
  await page.getByRole('link',{name:'开始今日探索',exact:true}).click();
  await page.getByRole('button',{name:'我看过了，试试三个问题'}).click();
  await page.getByRole('button',{name:'B −5',exact:true}).click();await page.getByRole('button',{name:'确认答案'}).click();
  await page.getByRole('button',{name:'再试一次'}).waitFor();
  await page.reload();await page.getByRole('button',{name:'再试一次'}).waitFor();
  await page.getByRole('button',{name:'再试一次'}).click();await answer('A −3');
  await page.getByRole('heading',{name:'这个问题想明白了'}).waitFor();await page.getByRole('button',{name:'继续',exact:true}).click();
  await page.getByRole('button',{name:'给我一点提示'}).click();await answer('B 1');await page.getByRole('button',{name:'继续',exact:true}).click();
  await answer('B 正数与负数的分界位置');await page.getByRole('button',{name:'继续',exact:true}).click();
  await page.getByRole('button',{name:'有点难',exact:true}).click();await page.getByRole('button',{name:'有趣',exact:true}).click();await page.getByRole('button',{name:'记下今天的发现'}).click();
  await page.getByRole('heading',{name:'今天理解了一点，真好。'}).waitFor();
  let state=await getState();assert.equal(state.attempts.length,3);assert.equal(state.attempts[0].retryCount,1);assert.equal(state.attempts[0].firstCorrect,false);assert.equal(state.attempts[1].hintUsed,true);assert.equal(state.attempts[2].hintUsed,false);
  await page.reload();await page.getByRole('heading',{name:'今天理解了一点，真好。'}).waitFor();assert.equal((await getState()).attempts.length,3);
  await navigate('tt/learn');await page.getByRole('button',{name:'我看过了，试试三个问题'}).click();
  await page.getByRole('button',{name:'6',exact:true}).click();await page.getByRole('button',{name:'确认答案'}).click();await page.getByRole('button',{name:'继续',exact:true}).click();
  await answer('B 3 组');await page.getByRole('button',{name:'继续',exact:true}).click();
  await page.getByRole('textbox',{name:'数字答案'}).fill('8');await page.getByRole('button',{name:'确认答案'}).click();await page.getByRole('button',{name:'继续',exact:true}).click();
  await page.getByRole('button',{name:'正合适',exact:true}).click();await page.getByRole('button',{name:'有趣',exact:true}).click();await page.getByRole('button',{name:'记下今天的发现'}).click();
  await page.getByRole('heading',{name:'今天理解了一点，真好。'}).waitFor();state=await getState();assert.equal(state.attempts.filter(a=>a.student==='tt').length,3);assert.equal(state.attempts.filter(a=>a.student==='cc').length,3);
  await navigate('tt/discoveries');await page.getByLabel('今天想到的问题或发现').fill('<script>alert(1)</script> 为什么圆没有角？');await page.getByRole('button',{name:'保存我的发现'}).click();await page.getByText('<script>alert(1)</script> 为什么圆没有角？',{exact:true}).waitFor();assert.equal(await page.locator('#app script').count(),0);
  await navigate('parent');await page.getByLabel('刚刚观察到什么？').fill('能数出总数，下次看看数量组成。');await page.getByRole('button',{name:'保存观察'}).click();await page.getByText('能数出总数，下次看看数量组成。',{exact:true}).waitFor();
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'导出学习记录 JSON'}).click();const download=await downloadPromise;await download.saveAs('test-results/synthetic-backup.json');
  const second=await browser.newContext({viewport:{width:700,height:1000}}),importPage=await second.newPage();await importPage.goto(`${url}/#/parent`);await importPage.getByRole('heading',{name:'看看理解，留下观察'}).waitFor();await importPage.locator('#backup-input').setInputFiles('test-results/synthetic-backup.json');await importPage.getByText('记录已合并，重复作答不会再次计数。').waitFor();
  await importPage.locator('#backup-input').setInputFiles('test-results/synthetic-backup.json');await importPage.getByText('记录已合并，重复作答不会再次计数。').waitFor();
  const imported=await importPage.evaluate(async()=>{const {readState}=await import('./storage.js');return readState();});assert.equal(imported.attempts.length,6);assert.equal(imported.discoveries.length,1);
  await second.close();
  await page.setViewportSize({width:600,height:800});await navigate('tt');await page.screenshot({path:'test-results/student-eink.png',fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'电纸书尺寸不应横向溢出');
  await page.setViewportSize({width:360,height:800});await navigate('');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'窄屏不应横向溢出');
  await page.setViewportSize({width:800,height:1000});await navigate('cc/map');await page.screenshot({path:'test-results/map-eink.png',fullPage:true});
  await context.setOffline(true);await navigate('tt/card/tt-groups');await page.getByRole('heading',{name:'几组，每组几个',exact:true}).waitFor();await navigate('tt/learn');await page.getByRole('heading',{name:'今天理解了一点，真好。'}).waitFor();assert.equal((await getState()).attempts.length,6);
  // 仅在隔离的测试浏览器中模拟一个尚未学习的孩子，验证离线写入。
  await page.evaluate(async()=>{const {mutateState}=await import('./storage.js');await mutateState(s=>({...s,attempts:s.attempts.filter(a=>a.student!=='tt'),lessons:s.lessons.filter(l=>l.student!=='tt')}));});
  await page.reload();await page.getByRole('button',{name:'我看过了，试试三个问题'}).click();await page.getByRole('button',{name:'6',exact:true}).click();await page.getByRole('button',{name:'确认答案'}).click();await page.getByRole('button',{name:'继续',exact:true}).waitFor();assert.equal((await getState()).attempts.filter(a=>a.student==='tt').length,1);
  await context.setOffline(false);
  await updateAndSubpathCheck();
  assert.deepEqual(errors,[]);
  console.log('浏览器验收通过：两个孩子完整学习、重试和提示、刷新恢复、记录导出/合并导入、文本转义、600/360px 布局、离线读写、仓库子路径、新版切换保留任务与答案。');
}finally{await browser.close();}

async function updateAndSubpathCheck(){
  let updated=false;
  const nextVersion='test-next-version';
  const root=path.resolve('site');
  const server=http.createServer(async(req,res)=>{
    try{
      const pathname=new URL(req.url,'http://localhost').pathname;
      if(!pathname.startsWith('/knowledge-garden/')){res.writeHead(404).end();return;}
      const relative=pathname.slice('/knowledge-garden/'.length)||'index.html';
      const target=path.resolve(root,relative);
      if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
      let buffer=await fs.readFile(target);
      if(updated&&relative==='content.js')buffer=Buffer.from(buffer.toString().replace(`version: '${content.version}'`,`version: '${nextVersion}'`));
      if(updated&&relative==='sw.js')buffer=Buffer.from(buffer.toString().replace(/const CACHE_VERSION = '[^']+'/,"const CACHE_VERSION = 'garden-test-next-version'"));
      const type=relative.endsWith('.js')?'text/javascript':relative.endsWith('.css')?'text/css':relative.endsWith('.svg')?'image/svg+xml':relative.endsWith('.png')?'image/png':relative.endsWith('.webmanifest')?'application/manifest+json':'text/html';
      res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(buffer);
    }catch{res.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}/knowledge-garden/`;
  const updateContext=await browser.newContext(),updatePage=await updateContext.newPage();
  updatePage.on('pageerror',error=>errors.push(error.message));
  try{
    await updatePage.goto(`${base}#/cc/learn`);await updatePage.evaluate(()=>navigator.serviceWorker.ready);await updatePage.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));await updatePage.waitForTimeout(300);
    await updatePage.getByRole('button',{name:'我看过了，试试三个问题'}).click();await updatePage.getByRole('button',{name:'A −3',exact:true}).click();await updatePage.getByRole('button',{name:'确认答案'}).click();await updatePage.getByRole('button',{name:'继续',exact:true}).waitFor();
    updated=true;await updatePage.evaluate(async()=>{const registration=await navigator.serviceWorker.getRegistration();await registration.update();});
    await updatePage.getByRole('button',{name:'切换新版'}).waitFor();await updatePage.getByRole('button',{name:'切换新版'}).click();await updatePage.getByText(`内容 ${nextVersion}`,{exact:true}).waitFor();
    const state=await updatePage.evaluate(async()=>{const {readState}=await import('./storage.js');return readState();});
    assert.equal(state.lessons[0].contentVersion,content.version);assert.equal(state.attempts.length,1);assert.equal(state.attempts[0].questionVersion,content.version);
    await updateContext.setOffline(true);await updatePage.reload();await updatePage.getByRole('heading',{name:'一个点从 −2 向右走 3 格，到哪里？',exact:true}).waitFor();await updatePage.getByRole('button',{name:'B 1',exact:true}).click();await updatePage.getByRole('button',{name:'确认答案'}).click();await updatePage.getByRole('button',{name:'继续',exact:true}).waitFor();
  }finally{await updateContext.close();await new Promise(resolve=>server.close(resolve));}
}
