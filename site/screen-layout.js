// 按可用屏幕高度分页；移动真实 DOM 节点，翻页不会清空输入或丢失表单关联。
let invalidHandler;
export function mountScreens(app, requestedPage = 0) {
  const source = [...app.children];
  const heading = document.createElement('div');
  heading.className = 'screen-heading';
  while (source[0]?.matches('.breadcrumb,.eyebrow,h1')) heading.append(source.shift());
  const surface = document.createElement('div');
  surface.className = 'screen-body';
  const pager = document.createElement('nav');
  pager.className = 'screen-pager'; pager.setAttribute('aria-label','屏幕分页');
  pager.innerHTML = '<button class="secondary" data-action="screen-prev">← 上一页</button><span aria-live="polite"></span><button class="secondary" data-action="screen-next">下一页 →</button>';
  const forms = document.createElement('div'); forms.hidden = true;
  app.replaceChildren(heading,surface,pager,forms);
  const capacity = Math.floor(surface.getBoundingClientRect().height) - 2;
  const pages = [];
  let page;
  function newPage() {
    page = document.createElement('div'); page.className='screen-page';
    surface.append(page); pages.push(page); return page;
  }
  function fits() { return page.getBoundingClientRect().height <= capacity; }
  function append(node) {
    page.append(node);
    if (fits()) return;
    node.remove();
    if (page.childElementCount) { page.hidden=true;newPage();page.append(node);if(fits())return;node.remove(); }
    split(node);
  }
  function split(node) {
    if (node.matches('p') && node.textContent.length > 40 && !node.querySelector('button,input,a')) {
      const chars=Array.from(node.textContent); let offset=0;
      while(offset<chars.length){
        const chunk=node.cloneNode(false);page.append(chunk);
        let low=1,high=chars.length-offset,best=0;
        while(low<=high){const middle=Math.floor((low+high)/2);chunk.textContent=chars.slice(offset,offset+middle).join('');if(fits()){best=middle;low=middle+1;}else high=middle-1;}
        if(!best){chunk.remove();if(page.childElementCount){page.hidden=true;newPage();continue;}throw new Error('当前屏幕高度太小，请竖屏打开。');}
        chunk.textContent=chars.slice(offset,offset+best).join('');offset+=best;
        if(offset<chars.length){page.hidden=true;newPage();}
      }
      return;
    }
    if(node.matches('.panel,.grid,.map-list,.stats,form,.record,.options,.connections,.feedback-options') && node.children.length){
      let children=[...node.children];
      if(node.matches('form')){
        node.querySelectorAll('input,textarea,select,button').forEach(control=>control.setAttribute('form',node.id));
        const form=document.createElement('form');form.id=node.id;forms.append(form);
      }
      let shell=node.matches('form')?document.createElement('section'):node.cloneNode(false);
      shell.className=node.className; shell.removeAttribute('id');page.append(shell);
      for(const child of children){
        shell.append(child);
        if(fits())continue;
        child.remove();if(!shell.children.length)shell.remove();
        if(page.childElementCount){page.hidden=true;newPage();}
        shell=node.matches('form')?document.createElement('section'):node.cloneNode(false);
        shell.className=node.className;shell.removeAttribute('id');page.append(shell);shell.append(child);
        if(!fits()){child.remove();shell.remove();append(child);shell=node.matches('form')?document.createElement('section'):node.cloneNode(false);shell.className=node.className;shell.removeAttribute('id');page.append(shell);}
      }
      if(!shell.children.length)shell.remove();
      return;
    }
    // 不靠隐藏溢出假装一屏：不可再拆的交互单元保留，并提示改用竖屏。
    page.append(node);page.dataset.needsPortrait='true';
  }
  newPage();
  for(const node of source){
    if(node.hasAttribute('data-screen')&&page.childElementCount){page.hidden=true;newPage();}
    append(node);
  }
  const actual=pages.filter(p=>p.childElementCount);
  for(const empty of pages.filter(p=>!p.childElementCount))empty.remove();
  let current=Math.min(Math.max(0,requestedPage),actual.length-1);
  function show(index){
    current=Math.min(Math.max(0,index),actual.length-1);
    actual.forEach((p,i)=>{p.hidden=i!==current;p.setAttribute('aria-hidden',String(i!==current));});
    pager.querySelector('span').textContent=`${current+1} / ${actual.length}`;
    pager.querySelector('[data-action="screen-prev"]').disabled=current===0;
    pager.querySelector('[data-action="screen-next"]').disabled=current===actual.length-1;
    pager.classList.toggle('single-page',actual.length===1);
    app.dataset.screenCount=String(actual.length);app.dataset.screenPage=String(current);
  }
  show(current);
  if(invalidHandler)app.removeEventListener('invalid',invalidHandler,true);
  invalidHandler=event=>{
    const index=actual.findIndex(p=>p.contains(event.target));if(index>=0)show(index);
  };
  app.addEventListener('invalid',invalidHandler,true);
  return { show, get page(){return current;}, get count(){return actual.length;} };
}
