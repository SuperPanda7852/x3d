import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';

const origin=process.env.X3D_BASE_URL||'http://127.0.0.1:5173';
const chrome=process.env.X3D_BROWSER_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser=await chromium.launch({headless:true,...existsSync(chrome)?{executablePath:chrome}:{},args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,acceptDownloads:true});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await mkdir('test-results',{recursive:true});
const click=async(action)=>page.locator(`[data-action="${action}"]`).first().click();
try{
  await page.goto(origin);await page.waitForFunction(()=>window.__x3dReady===true);
  assert.equal(await page.locator('.view-card').count(),2);
  assert.match(await page.locator('#study-title').innerText(),/Right hand/);
  assert.equal(await page.locator('i[data-lucide]').count(),0,'All icons should render');
  assert.equal(await page.evaluate(()=>!!document.querySelector('canvas').getContext('webgl2')),true);
  await page.waitForTimeout(400);await page.screenshot({path:'test-results/desktop.png',fullPage:true});
  console.log('PASS: initial workspace, synthetic references, icons, WebGL');

  await page.locator('[data-action="camera"][data-view="lateral"]').click();
  assert.ok((await page.locator('[data-view="lateral"]').getAttribute('class')).includes('active'));
  await click('reset-camera');await click('display');await page.locator('#highlight-toggle').uncheck();assert.equal(await page.locator('#annotation').isVisible(),false);await page.locator('#highlight-toggle').check();await page.locator('#opacity-range').fill('65');assert.equal(await page.locator('#opacity-value').innerText(),'65%');await click('reset-display');await click('display');
  await click('fracture-info');assert.match(await page.locator('#bone-detail').innerText(),/Fifth metacarpal/);await click('close-bone');
  await click('tab-report');assert.match(await page.locator('#report-panel').innerText(),/MOCK REPORT/);await page.screenshot({path:'test-results/report.png',fullPage:true});await click('audience-patient');assert.match(await page.locator('#report-panel').innerText(),/Understanding the model/);await click('tab-model');
  console.log('PASS: camera, display settings, bone selection, report audiences');

  for(const [action,name] of [['export-image','illustration.png'],['export-glb','atlas.glb'],['export-report','report.txt'],['export-study','study.json']]){
    await click('export');const promise=page.waitForEvent('download');await click(action);const download=await promise;await download.saveAs(`test-results/${name}`);const bytes=await readFile(`test-results/${name}`);assert.ok(bytes.length>100);if(name.endsWith('.glb'))assert.equal(bytes.subarray(0,4).toString(),'glTF');if(name.endsWith('.png'))assert.equal(bytes.subarray(1,4).toString(),'PNG');if(name.endsWith('.json'))assert.equal(JSON.parse(bytes.toString()).format,'x3d-educational-study');
  }
  console.log('PASS: PNG, GLB, TXT, and JSON exports');

  await click('examples');await page.locator('[data-case="radius"]').click();await page.waitForFunction(()=>document.querySelector('#study-title').textContent.includes('wrist'));await click('tab-report');assert.match(await page.locator('#report-panel').innerText(),/distal radius/i);await click('tab-model');
  await click('examples');await page.locator('[data-case="normal"]').click();await page.waitForFunction(()=>document.querySelector('#sidebar-context').textContent.includes('Hand anatomy'));assert.equal(await page.locator('#annotation').isVisible(),false);
  console.log('PASS: switching all three example studies');

  await click('new');assert.equal(await page.getByRole('dialog',{name:'New study',exact:true}).isVisible(),true);
  assert.equal(await page.locator('.view-card').count(),2,'Opening New study preserves the example behind it');
  assert.equal(await page.locator('[data-action="open-study"]').isDisabled(),true);
  await page.waitForTimeout(250);await page.screenshot({path:'test-results/new-study.png',fullPage:false,animations:'disabled'});
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No upload dialog overflow on mobile');
  await page.waitForTimeout(250);await page.screenshot({path:'test-results/new-study-mobile.png',fullPage:false,animations:'disabled'});
  await page.setViewportSize({width:1440,height:1000});
  const fixture=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=280;c.height=420;const x=c.getContext('2d');x.fillStyle='#0d1712';x.fillRect(0,0,280,420);x.fillStyle='#b0c5b3';x.fillRect(110,45,45,325);return c.toDataURL('image/png').split(',')[1];});
  await writeFile('test-results/reference.png',Buffer.from(fixture,'base64'));
  const chooserPromise=page.waitForEvent('filechooser');await click('choose-study-images');const chooser=await chooserPromise;await chooser.setFiles('test-results/reference.png');
  await page.waitForFunction(()=>document.querySelectorAll('.study-draft-card').length===1);
  assert.equal(await page.locator('[data-action="open-study"]').isDisabled(),true);
  await click('remove-draft-view');assert.equal(await page.locator('.study-draft-card').count(),0);
  await page.evaluate(base64=>{const dt=new DataTransfer();dt.items.add(new File([Uint8Array.from(atob(base64),c=>c.charCodeAt(0))],'pasted-reference.png',{type:'image/png'}));document.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true}));},fixture);
  await page.waitForFunction(()=>document.querySelectorAll('.study-draft-card').length===1);
  await page.evaluate(base64=>{const dt=new DataTransfer();dt.items.add(new File([Uint8Array.from(atob(base64),c=>c.charCodeAt(0))],'dropped-reference.png',{type:'image/png'}));document.querySelector('#study-drop-zone').dispatchEvent(new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true}));},fixture);
  await page.waitForFunction(()=>document.querySelectorAll('.study-draft-card').length===2&&!document.querySelector('[data-action="open-study"]').disabled);
  await page.screenshot({path:'test-results/new-study-ready.png',fullPage:false,animations:'disabled'});
  await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
  assert.equal(await page.locator('.view-card').count(),2);assert.match(await page.locator('#sidebar-context').innerText(),/Hand anatomy/);
  await click('new');await page.locator('#study-file-input').setInputFiles(Array(7).fill('test-results/reference.png'));
  await page.waitForFunction(()=>document.querySelectorAll('.study-draft-card').length===6&&document.querySelector('#study-draft-message').textContent.includes('skipped'));
  await click('close-modal');
  await click('new');await page.locator('#study-file-input').setInputFiles(['test-results/reference.png','test-results/reference.png']);
  await page.waitForFunction(()=>!document.querySelector('[data-action="open-study"]').disabled);await click('open-study');
  assert.equal(await page.getByRole('dialog').count(),0);assert.equal(await page.locator('.view-card').count(),2);
  assert.equal(await page.locator('#empty-state').isVisible(),true);
  console.log('PASS: New study dialog, browse/paste/drop, previews, minimum/maximum counts, cancellation, and opening a case');
  assert.match(await page.locator('#views-note').innerText(),/No automated analysis/);
  await page.locator('[data-projection]').first().selectOption('PA');await click('setup');await page.locator('#anatomy-select').selectOption('normal');await page.locator('#side-select').selectOption('left');await page.locator('#atlas-form button[type="submit"]').click();assert.match(await page.locator('#study-title').innerText(),/Left hand/);assert.match(await page.locator('#model-badge-text').innerText(),/NOT RECONSTRUCTED/);
  await click('tab-report');await page.locator('#report-notes').fill('Educational note: reference view added.');await page.waitForTimeout(800);await page.reload();await page.waitForFunction(()=>window.__x3dReady);await click('tab-report');assert.equal(await page.locator('#report-notes').inputValue(),'Educational note: reference view added.');assert.equal(await page.locator('.view-card').count(),2);assert.equal(await page.locator('[data-projection]').first().inputValue(),'PA');assert.match(await page.locator('#report-panel').innerText(),/Not performed/);
  console.log('PASS: upload → label → choose atlas → notes → IndexedDB persistence');

  await click('new');await page.locator('#study-file-input').setInputFiles('test-results/reference.png');
  await page.waitForFunction(()=>document.querySelectorAll('.study-draft-card').length===1);await click('close-modal');
  assert.equal(await page.locator('#report-notes').inputValue(),'Educational note: reference view added.');
  assert.equal(await page.locator('[data-projection]').first().inputValue(),'PA');
  console.log('PASS: cancelling a new draft preserves uploaded views and saved notes');

  await page.locator('#file-input').setInputFiles({name:'unsupported.dcm',mimeType:'application/dicom',buffer:Buffer.from('DICOM')});await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('Use PNG'));assert.equal(await page.locator('.view-card').count(),2);
  await click('settings');await click('clear-storage');await page.waitForFunction(()=>document.querySelectorAll('.view-card').length===0);assert.equal(await page.locator('.view-card').count(),0);await page.waitForTimeout(500);await page.reload();await page.waitForFunction(()=>window.__x3dReady);assert.equal(await page.locator('.view-card').count(),0);
  console.log('PASS: unsupported file handling and clearing stored references');

  await click('home');await page.waitForFunction(()=>document.querySelectorAll('.view-card').length===2);assert.match(await page.locator('#sidebar-context').innerText(),/Fifth metacarpal/);await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No mobile horizontal overflow');await page.screenshot({path:'test-results/mobile.png',fullPage:true});await click('tab-report');await page.screenshot({path:'test-results/mobile-report.png',fullPage:true});await click('model-info');assert.equal(await page.getByRole('dialog').isVisible(),true);await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
  assert.equal(errors.length,0,`Browser errors: ${errors.join('; ')}`);
  console.log('PASS: mobile layout, reports, accessible dialogs, no runtime errors');

  const fallbackContext=await browser.newContext();
  const fallback=await fallbackContext.newPage();
  await fallback.addInitScript(()=>{
    const getContext=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,...args){
      return type==='webgl'||type==='webgl2'?null:getContext.call(this,type,...args);
    };
  });
  await fallback.goto(origin);await fallback.waitForFunction(()=>window.__x3dReady);
  assert.equal(await fallback.locator('.view-card').count(),2);
  assert.match(await fallback.locator('.webgl-error').innerText(),/3D rendering is unavailable/);
  await fallback.waitForFunction(()=>[...document.querySelectorAll('.view-preview img')].every(img=>img.complete&&img.naturalWidth>0));
  await fallback.locator('[data-action="tab-report"]').click();
  assert.match(await fallback.locator('#report-panel').innerText(),/MOCK REPORT/);
  await fallbackContext.close();
  console.log('PASS: reference images and reports remain usable without WebGL');
  console.log('All X3D end-to-end checks passed.');
}finally{await browser.close();}
