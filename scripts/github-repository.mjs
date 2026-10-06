// 使用 Git Credential Manager 的已有凭据；凭据只留在进程内存，不写文件或日志。
import {spawnSync} from 'node:child_process';
const action=process.argv[2]||'status';
const owner=process.argv[3],name=process.argv[4];
if(!['status','create','pages','runs','make-public','deploy','upload-initial'].includes(action)||!owner||!name||!/^[a-zA-Z0-9_.-]+$/.test(owner)||!/^[a-zA-Z0-9_.-]+$/.test(name)){
  console.error('用法：node scripts/github-repository.mjs <status|create|pages|runs|make-public|deploy|upload-initial> <owner> <name>');process.exit(1);
}
const credential=spawnSync('git',['credential','fill'],{input:`protocol=https\nhost=github.com\nusername=${owner}\n\n`,encoding:'utf8',env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'never'}});
if(credential.status!==0){console.error('无法取得现有 GitHub 登录凭据，请先登录 Git Credential Manager。');process.exit(1);}
const token=credential.stdout.split(/\r?\n/).find(line=>line.startsWith('password='))?.slice(9);
if(!token){console.error('现有 Git 凭据没有提供访问令牌。');process.exit(1);}
async function request(endpoint,method='GET',body){
  const response=await fetch(`https://api.github.com${endpoint}`,{method,headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});
  const text=await response.text();let data;try{data=JSON.parse(text);}catch{data={message:'GitHub 返回了非 JSON 响应'};}
  return {status:response.status,data};
}
try{
  const user=await request('/user');
  if(user.status!==200||user.data.login.toLowerCase()!==owner.toLowerCase())throw new Error('Git 凭据的账号与目标仓库拥有者不一致');
  let repo=await request(`/repos/${owner}/${name}`);
  if(action==='create'&&repo.status===404){
    repo=await request('/user/repos','POST',{name,private:true,description:'A quiet, offline-capable family knowledge garden for e-ink devices.',auto_init:false});
  }
  if(![200,201].includes(repo.status))throw new Error(`仓库操作失败（${repo.status}）：${repo.data.message}`);
  if(action==='make-public'){
    const result=await request(`/repos/${owner}/${name}`,'PATCH',{private:false});
    if(result.status!==200||result.data.private!==false)throw new Error(`公开仓库失败（${result.status}）：${result.data.message}`);
    console.log(JSON.stringify({repository:result.data.html_url,private:result.data.private}));
  }else if(action==='deploy'){
    const result=await request(`/repos/${owner}/${name}/actions/workflows/pages.yml/dispatches`,'POST',{ref:'main'});
    if(result.status!==204)throw new Error(`触发发布失败（${result.status}）：${result.data.message}`);
    console.log(JSON.stringify({repository:repo.data.html_url,dispatchStatus:result.status}));
  }else if(action==='upload-initial'){
    const git=(args,binary=false,input)=>{const result=spawnSync('git',args,{input,encoding:binary?undefined:'utf8',maxBuffer:10*1024*1024});if(result.status!==0)throw new Error('读取或写入本地 Git 提交失败');return result.stdout;};
    const head=git(['rev-parse','HEAD']).trim();
    let ref=await request(`/repos/${owner}/${name}/git/ref/heads/main`);
    if(ref.status===200&&ref.data.object.sha===head){
      console.log(JSON.stringify({repository:repo.data.html_url,commit:head,alreadyUploaded:true}));
    }else{
      const raw=git(['cat-file','commit',head]),expected=head;
      let replaceBootstrap=false;
      if(ref.status===404||ref.status===409){
        // GitHub 的 Git 数据接口要求仓库非空，先用内容接口创建一个空占位文件。
        const date=new Date().toISOString().replace(/\.\d{3}Z$/,'Z');
        const identity={name:owner,email:`${user.data.id}+${owner}@users.noreply.github.com`,date};
        const seed=await request(`/repos/${owner}/${name}/contents/.gitkeep`,'PUT',{message:'Initialize knowledge garden repository',content:'',branch:'main',author:identity,committer:identity});
        if(seed.status!==201)throw new Error(`初始化仓库失败（${seed.status}）：${seed.data.message}`);
        ref=await request(`/repos/${owner}/${name}/git/ref/heads/main`);
      }
      if(ref.status!==200)throw new Error('无法确认远程分支状态，已停止上传');
      const parent=ref.data.object.sha;
      if(!/^parent /m.test(raw)){
        const remote=await request(`/repos/${owner}/${name}/git/commits/${parent}`);
        if(remote.status!==200||remote.data.message.trim()!=='Initialize knowledge garden repository'||remote.data.parents.length!==0)throw new Error('远程 main 已有不同提交，已停止上传以避免覆盖');
        const seedTree=await request(`/repos/${owner}/${name}/git/trees/${remote.data.tree.sha}`);
        if(seedTree.status!==200||seedTree.data.tree.length!==1||seedTree.data.tree[0].path!=='.gitkeep')throw new Error('远程初始文件与预期不一致，已停止上传');
        const blob=git(['hash-object','-w','--stdin'],false,'').trim();
        const treeSha=git(['mktree'],false,`100644 blob ${blob}\t.gitkeep\n`).trim();
        if(treeSha!==remote.data.tree.sha)throw new Error('初始文件树不一致');
        // 仅替换本脚本创建的空初始化提交；已有用户文件或历史一律拒绝覆盖。
        replaceBootstrap=true;
      }else if(git(['rev-parse','HEAD^']).trim()!==parent||git(['rev-list','--parents','-n','1','HEAD']).trim().split(' ').length!==2)throw new Error('API 上传要求本地仅领先远程一个普通提交，已停止以避免覆盖');
      const entries=git(['ls-tree','-r','-z','HEAD']).split('\0').filter(Boolean).map(line=>{const match=line.match(/^(\d+) blob ([a-f0-9]+)\t([\s\S]+)$/);if(!match)throw new Error('提交包含不支持的 Git 对象');return {mode:match[1],sha:match[2],path:match[3],type:'blob'};});
      if(entries.some(e=>/^(learning-records|test-results|node_modules)\//.test(e.path)))throw new Error('提交包含不应上传的本地数据');
      // 并行上传独立 blob；tree、commit 和 main 引用依次创建。
      for(let i=0;i<entries.length;i+=4)await Promise.all(entries.slice(i,i+4).map(async entry=>{
        const buffer=git(['cat-file','blob',entry.sha],true);
        const response=await request(`/repos/${owner}/${name}/git/blobs`,'POST',{content:buffer.toString('base64'),encoding:'base64'});
        if(response.status!==201||response.data.sha!==entry.sha)throw new Error(`文件上传失败：${entry.path}（${response.status}）`);
      }));
      const tree=await request(`/repos/${owner}/${name}/git/trees`,'POST',{tree:entries});
      if(tree.status!==201||tree.data.sha!==git(['rev-parse','HEAD^{tree}']).trim())throw new Error('远程文件树与本地提交不一致');
      const parseIdentity=kind=>{
        const match=raw.match(new RegExp(`^${kind} (.+) <([^>]+)> (\\d+) ([+-]\\d{4})$`,'m'));
        if(!match)throw new Error('无法读取提交作者');
        const sign=match[4][0]==='+'?1:-1,offset=sign*(Number(match[4].slice(1,3))*60+Number(match[4].slice(3,5)));
        const date=new Date(Number(match[3])*1000+offset*60000).toISOString().slice(0,-1)+match[4].slice(0,3)+':'+match[4].slice(3);
        return {name:match[1],email:match[2],date};
      };
      const commit=await request(`/repos/${owner}/${name}/git/commits`,'POST',{message:raw.slice(raw.indexOf('\n\n')+2),tree:tree.data.sha,parents:replaceBootstrap?[]:[parent],author:parseIdentity('author'),committer:parseIdentity('committer')});
      if(commit.status!==201)throw new Error(`创建远程提交失败（${commit.status}）：${commit.data.message}`);
      if(commit.data.sha!==expected)throw new Error(`远程提交哈希与本地不同，未更新 main 引用：${commit.data.sha}`);
      const latest=await request(`/repos/${owner}/${name}/git/ref/heads/main`);
      if(latest.status!==200||latest.data.object.sha!==parent)throw new Error('上传期间远程分支发生变化，已停止更新');
      const created=await request(`/repos/${owner}/${name}/git/refs/heads/main`,'PATCH',{sha:expected,force:replaceBootstrap});
      if(created.status!==200)throw new Error(`更新 main 分支失败（${created.status}）：${created.data.message}`);
      git(['update-ref','refs/remotes/origin/main',expected]);
      git(['config','branch.main.remote','origin']);git(['config','branch.main.merge','refs/heads/main']);
      console.log(JSON.stringify({repository:repo.data.html_url,commit:expected,uploadedFiles:entries.length}));
    }
  }else if(action==='pages'){
    let pages=await request(`/repos/${owner}/${name}/pages`);
    if(pages.status===404)pages=await request(`/repos/${owner}/${name}/pages`,'POST',{build_type:'workflow'});
    console.log(JSON.stringify({repository:repo.data.html_url,private:repo.data.private,plan:user.data.plan?.name||null,pagesStatus:pages.status,pagesUrl:pages.data.html_url||null,message:pages.data.message||null}));
  }else if(action==='runs'){
    const runs=await request(`/repos/${owner}/${name}/actions/runs?per_page=3`);
    console.log(JSON.stringify({status:runs.status,runs:runs.data.workflow_runs?.map(run=>({id:run.id,status:run.status,conclusion:run.conclusion,url:run.html_url,headSha:run.head_sha}))||[]}));
  }else console.log(JSON.stringify({repository:repo.data.html_url,private:repo.data.private,defaultBranch:repo.data.default_branch,plan:user.data.plan?.name||null,created:repo.status===201}));
}catch(error){console.error(error.message);process.exit(1);}
