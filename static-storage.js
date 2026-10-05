// Static GitHub Pages adapter: browser-local, transactional persistence.
window.STATIC_MODE=true;
(() => {
 const databaseName='med-practice-v1:'+new URL('.',location.href).pathname;
 let connection;
 function open(){if(!connection)connection=new Promise((resolve,reject)=>{const r=indexedDB.open(databaseName,1);r.onupgradeneeded=()=>r.result.createObjectStore('attempts',{keyPath:'id'});r.onsuccess=()=>{r.result.onversionchange=()=>r.result.close();resolve(r.result)};r.onerror=()=>reject(Error('Хранилище браузера недоступно. Разрешите сохранение данных для этого сайта.'))});return connection}
 window.staticApi=async(path,method,body)=>{
  const db=await open();
  return new Promise((resolve,reject)=>{
   const tx=db.transaction('attempts',method==='GET'?'readonly':'readwrite'),store=tx.objectStore('attempts');let result,failure;
   tx.oncomplete=()=>resolve(result);
   tx.onabort=()=>reject(failure||Error('Не удалось сохранить данные в браузере. Проверьте доступное место и настройки хранения.'));
   tx.onerror=()=>{};
   function fail(message){failure=Error(message);tx.abort()}
   if(method==='GET'&&path==='/api/attempts'){const r=store.getAll();r.onsuccess=()=>{result=r.result.sort((a,b)=>b.started-a.started)};return}
   if(method==='POST'&&path==='/api/attempts'){
    const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);const id=[...bytes].map(v=>v.toString(16).padStart(2,'0')).join('');
    result={...structuredClone(body),id,revision:1};store.add(result);return
   }
   if(method==='PUT'&&path.startsWith('/api/attempts/')){
    const id=path.split('/').pop(),r=store.get(id);
    r.onsuccess=()=>{const old=r.result;if(!old)return fail('Попытка не найдена');if(old.revision!==body.revision)return fail('Попытка изменена в другой вкладке. Откройте её заново из истории.');if(old.finished||JSON.stringify(old.ids)!==JSON.stringify(body.ids)||old.started!==body.started)return fail('Завершённую попытку нельзя изменить');result={...structuredClone(body),id,revision:old.revision+1};store.put(result)};return
   }
   fail('Неизвестная операция');
  });
 };
})();
