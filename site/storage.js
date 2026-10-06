import { emptyState } from './core.js';
let db;
export async function openStore() {
  db = await new Promise((resolve,reject) => {
    const request = indexedDB.open('knowledge-garden',1);
    request.onupgradeneeded = () => request.result.createObjectStore('state');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('浏览器无法打开本地记录。请使用普通浏览模式并允许网站存储。'));
    request.onblocked = () => reject(new Error('请关闭其他知识花园页面后重试。'));
  });
  db.onversionchange = () => db.close();
  return readState();
}
export function readState() {
  return new Promise((resolve,reject) => {
    const tx = db.transaction('state','readonly');
    const request = tx.objectStore('state').get('main');
    request.onsuccess = () => resolve(request.result || emptyState());
    request.onerror = () => reject(new Error('读取本地记录失败，请重新打开页面。'));
  });
}
// 读取与写入放在同一个事务中，两个标签页同时操作也不会覆盖彼此的记录。
export function mutateState(update) {
  return new Promise((resolve,reject) => {
    const tx = db.transaction('state','readwrite');
    const store = tx.objectStore('state');
    let next, failure;
    const request = store.get('main');
    request.onsuccess = () => {
      try { next = update(request.result || emptyState()); store.put(next,'main'); }
      catch (error) { failure = error; tx.abort(); }
    };
    tx.oncomplete = () => resolve(next);
    tx.onerror = tx.onabort = () => reject(failure || new Error('记录没有保存成功，可能是存储空间不足。请导出备份后重试。'));
  });
}
