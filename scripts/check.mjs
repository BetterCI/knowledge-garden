import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { content } from '../site/content.js';
import { validateContent } from '../site/core.js';
validateContent(content);
for (const file of ['site/app.js','site/screen-layout.js','site/content.js','site/core.js','site/storage.js','site/sw.js','scripts/serve.mjs','scripts/analyze-records.mjs','scripts/github-repository.mjs','scripts/browser-check.mjs','scripts/screen-check.mjs']) {
  const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if(result.status!==0)throw new Error(result.stderr);
}
const sw=await fs.readFile('site/sw.js','utf8');
const expected=`garden-${content.version.replaceAll('.','-')}`;
if(!sw.includes(`'${expected}'`))throw new Error(`Service Worker 缓存版本必须是 ${expected}`);
for (const file of ['site/index.html','site/styles.css','site/manifest.webmanifest','site/assets/garden.svg','site/assets/icon-192.png','site/assets/icon-512.png']) await fs.access(file);
JSON.parse(await fs.readFile('site/manifest.webmanifest','utf8'));
console.log(`内容检查通过：${content.nodes.length} 张知识卡，${content.nodes.reduce((sum,n)=>sum+n.questions.length,0)} 道题，版本 ${content.version}`);
