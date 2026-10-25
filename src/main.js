import { createIcons, Plus, X, Upload, ArrowUpRight, ArrowLeft, ArrowRight, ChevronDown, ChevronRight, Check, CheckCheck, Box, FileText, SlidersHorizontal, Download, Info, RotateCcw, Move, ScanLine, Expand, Minus, CircleHelp, ShieldCheck, Layers, Eye, Copy, CheckCircle2, Settings2, Image, Aperture, Circle, Hand, MousePointer2, ExternalLink, MoreHorizontal, ArrowDownToLine, Sparkles, FolderPlus, LockKeyhole, View, Rotate3d, Github } from 'lucide';
import { AnatomyViewer } from './viewer.js';
import { CASES } from './cases.js';
import { BONE_INFO } from './anatomy.js';
import './style.css';
import './new-study.css';

const icons={Plus,X,Upload,ArrowUpRight,ArrowLeft,ArrowRight,ChevronDown,ChevronRight,Check,CheckCheck,Box,FileText,SlidersHorizontal,Download,Info,RotateCcw,Move,ScanLine,Expand,Minus,CircleHelp,ShieldCheck,Layers,Eye,Copy,CheckCircle2,Settings2,Image,Aperture,Circle,Hand,MousePointer2,ExternalLink,MoreHorizontal,ArrowDownToLine,Sparkles,FolderPlus,LockKeyhole,View,Rotate3d,Github};
const $=s=>document.querySelector(s);
const icon=(name,cls='')=>`<i data-lucide="${name.replace(/([a-z0-9])([A-Z])/g,'$1-$2').toLowerCase()}" class="${cls}" aria-hidden="true"></i>`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function refreshIcons(){createIcons({icons,attrs:{'stroke-width':1.65}});}
const state={source:'demo',caseId:'metacarpal',views:[],tab:'model',stage:'model',camera:'oblique',highlight:true,labels:true,auto:false,opacity:1,audience:'resident',notes:'',selectedBone:null,anatomy:'metacarpal',left:false};
let viewer,saveTimer,toastTimer,lastFocus,studyEpoch=0,modalKind=null;
let studyDraft=null;
const MAX_IMAGE_BYTES=25*1024*1024;
const MAX_VIEWS=6;
const syntheticCache=new Map();
function exampleViews(id){return ['PA','Oblique'].map(projection=>({id:crypto.randomUUID(),name:`Illustrative ${projection.toLowerCase()} view`,projection,src:`/examples/${id}-${projection.toLowerCase()}.png`,width:360,height:470,synthetic:true}));}
const caseData=()=>CASES.find(c=>c.id===state.caseId)||CASES[0];
const currentKind=()=>state.source==='demo'?caseData().id:state.anatomy;
const currentRegion=()=>state.source==='demo'?caseData().region:`${state.left?'Left':'Right'} ${state.anatomy==='radius'?'wrist':'hand'}`;

$('#app').innerHTML=`
  <header class="topbar">
    <a class="brand" href="#" data-action="home" aria-label="X3D home"><span class="brand-mark"><span></span><span></span></span><span>X3D<span class="brand-period">.</span></span></a>
    <div class="brand-description">A new perspective on anatomy</div>
    <div class="header-center"><span class="status-dot"></span><span id="save-status">Educational workspace</span></div>
    <nav class="header-actions" aria-label="Workspace"><button class="text-button" data-action="examples">${icon('Layers')}<span>Example studies</span></button><a class="text-button source-nav" href="https://github.com/SuperPanda7852/x3d" target="_blank" rel="noopener noreferrer" aria-label="X3D open-source repository">${icon('Github')}<span>Source</span></a><span class="header-divider"></span><button class="icon-button" data-action="about" aria-label="About X3D">${icon('CircleHelp')}</button><button class="avatar" data-action="settings" aria-label="Workspace settings">${icon('Settings2')}</button></nav>
  </header>
  <div class="workspace">
    <aside class="sidebar" aria-label="Radiograph views">
      <div class="sidebar-heading"><h2>Views <span id="view-count">02</span></h2><button class="icon-button" data-action="upload" aria-label="Add radiograph view">${icon('Plus')}</button></div>
      <button class="upload-zone" id="drop-zone" data-action="upload"><span class="upload-icon">${icon('Upload')}</span><strong>Drop your X-rays here</strong><span>or <u>browse files</u> to upload</span><small>PNG, JPG, WEBP · up to 25 MB each</small></button>
      <input type="file" id="file-input" accept="image/png,image/jpeg,image/webp" multiple hidden />
      <div class="views-list" id="views-list"></div>
      <div class="views-note">${icon('Info')}<span id="views-note">Synthetic projections for this example.</span></div>
      <div id="sidebar-context"></div>
      <div class="sidebar-bottom"><button class="new-study" data-action="new">${icon('FolderPlus')}New study${icon('Plus')}</button><button class="settings-button" data-action="settings">${icon('Settings2')}Workspace settings</button><div class="local-note">${icon('LockKeyhole')}Images stay on this device</div></div>
    </aside>
    <main class="main">
      <div class="study-heading"><div><div class="eyebrow"><span id="study-number">EXAMPLE STUDY 001</span><span class="eyebrow-divider">/</span><span id="study-type">UPPER EXTREMITY</span></div><h1 id="study-title">Right hand<span class="title-dot">.</span></h1><div class="study-subtitle" id="study-subtitle">A closer look. A clearer understanding.</div></div><div class="study-heading-right"><span class="demo-tag" id="demo-tag">${icon('Sparkles')}Educational example</span><button class="text-button new-study-trigger" data-action="new">${icon('Plus')}New study</button></div></div>
      <section class="viewer-shell" aria-label="Anatomy workspace">
        <div class="viewer-toolbar"><div class="tab-group" role="tablist" aria-label="Study view"><button role="tab" aria-selected="true" class="active" id="model-tab" data-action="tab-model">${icon('Box')}3D model</button><button role="tab" aria-selected="false" id="report-tab" data-action="tab-report">${icon('FileText')}Report<span class="tab-dot"></span></button></div><div class="toolbar-right"><span class="illustration-label"><span></span>Illustrative model</span><button class="icon-button" data-action="display" aria-label="Display options" title="Display options">${icon('SlidersHorizontal')}</button><div class="export-wrap"><button class="export-button" data-action="export">${icon('Download')}<span>Export</span>${icon('ChevronDown')}</button><div id="export-menu" class="popover export-menu" hidden><div class="popover-label">EXPORT STUDY</div><button data-action="export-image">${icon('Image')}Model image<span>PNG</span></button><button data-action="export-glb">${icon('Box')}3D illustration<span>GLB</span></button><button data-action="export-report">${icon('FileText')}Educational report<span>TXT</span></button><button data-action="export-study">${icon('Download')}Portable study<span>JSON</span></button></div></div></div></div>
        <div class="viewport" id="viewport"><div class="canvas-container" id="canvas-container"></div><div class="viewport-grain"></div><div class="viewport-corner"><span class="orientation-label" id="side-marker">R</span><span>HAND · OBLIQUE</span></div><div class="model-badge"><span></span><span id="model-badge-text">ANATOMY ATLAS</span></div>
          <div class="loading-state" id="loading-state"><span class="loading-orbit"></span><p>Preparing your perspective</p><small>Building the anatomy atlas</small></div>
          <div class="empty-state" id="empty-state" hidden></div>
          <div class="annotation" id="annotation"><span class="annotation-anchor"></span><span class="annotation-line"></span><button class="annotation-card" data-action="fracture-info"><span class="annotation-kicker"><span></span>AREA OF INTEREST</span><strong id="annotation-title">Fifth metacarpal</strong><span id="annotation-subtitle">Illustrated fracture${icon('ArrowUpRight')}</span></button></div>
          <div class="display-panel" id="display-panel" hidden><div class="display-heading">Display<button class="icon-button" data-action="display" aria-label="Close display options">${icon('X')}</button></div><label class="toggle-row"><span>${icon('Aperture')}Fracture highlight</span><input type="checkbox" id="highlight-toggle" checked role="switch" /><span class="toggle"></span></label><label class="toggle-row"><span>${icon('MousePointer2')}Annotations</span><input type="checkbox" id="labels-toggle" checked role="switch" /><span class="toggle"></span></label><label class="toggle-row"><span>${icon('Rotate3d')}Auto-rotate</span><input type="checkbox" id="rotate-toggle" role="switch" /><span class="toggle"></span></label><div class="opacity-control"><label for="opacity-range">Bone opacity <span id="opacity-value">100%</span></label><input id="opacity-range" type="range" min="25" max="100" value="100" /></div><button class="reset-display" data-action="reset-display">${icon('RotateCcw')}Reset display</button></div>
          <div id="bone-detail" class="bone-detail" hidden></div>
          <div id="report-panel" class="report-panel" hidden></div>
          <div class="viewer-bottom"><div class="gesture-hint">${icon('Move')}<span>Drag to rotate<span class="hint-separator">·</span>Scroll to zoom</span></div><div class="camera-controls" aria-label="Camera controls"><div class="camera-presets"><button data-action="camera" data-view="frontal">Frontal</button><button data-action="camera" data-view="lateral">Lateral</button><button class="active" data-action="camera" data-view="oblique">Oblique</button></div><span></span><button class="icon-button" data-action="reset-camera" aria-label="Reset camera" title="Reset camera">${icon('ScanLine')}</button></div><div class="zoom-controls"><button class="icon-button" data-action="zoom-out" aria-label="Zoom out">${icon('Minus')}</button><button class="icon-button" data-action="zoom-in" aria-label="Zoom in">${icon('Plus')}</button><span></span><button class="icon-button" data-action="fullscreen" aria-label="Enter fullscreen" title="Fullscreen">${icon('Expand')}</button></div></div>
        </div>
        <div class="viewer-status"><div><span class="status-dot"></span><span id="viewer-status-text">Interactive 3D illustration</span><span class="status-separator">/</span><span id="bone-count">27 bones</span></div><div class="legend"><span class="legend-bone"></span>Bone<span class="legend-fracture"></span>Illustrated fracture</div><button data-action="model-info">Model information${icon('Info')}</button></div>
      </section>
      <div class="study-summary"><div class="summary-icon">${icon('ScanLine')}</div><div><div class="eyebrow">THE BIGGER PICTURE</div><h2 id="summary-title">Small bones. A different perspective.</h2><p id="summary-text">Explore how an injury sits within the anatomy. Rotate, zoom, and look a little closer.</p></div><button data-action="patient-view" class="learn-button">Understand this injury${icon('ArrowUpRight')}</button></div>
      <footer class="main-footer"><span>${icon('ShieldCheck')}For learning and illustration. Not for diagnosis or treatment planning.</span><span>X3D<span class="footer-plus">✳</span>Made for a clearer view</span></footer>
    </main>
  </div>`;
refreshIcons();

function toast(message){clearTimeout(toastTimer);$('#toast').innerHTML=`${icon('CheckCircle2')}<span>${esc(message)}</span>`;$('#toast').classList.add('visible');refreshIcons();toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3600);}

async function database(){return new Promise((resolve,reject)=>{const r=indexedDB.open('x3d-workspace',1);r.onupgradeneeded=()=>r.result.createObjectStore('study');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
let persistenceQueue=Promise.resolve();
function persistStudy(){
  const snapshot=structuredClone({...state,tab:'model',auto:false,selectedBone:null});
  persistenceQueue=persistenceQueue.catch(()=>{}).then(async()=>{
    const db=await database();
    try{await new Promise((resolve,reject)=>{const tx=db.transaction('study','readwrite');tx.objectStore('study').put(snapshot,'current');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Save aborted'));});}
    finally{db.close();}
  });
  return persistenceQueue;
}
function save(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{persistStudy().then(()=>{$('#save-status').textContent='Saved on this device';}).catch(()=>{$('#save-status').textContent='Session only · storage unavailable';});},300);}

async function restore(){try{const db=await database();const s=await new Promise((resolve,reject)=>{const r=db.transaction('study').objectStore('study').get('current');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});db.close();if(s&&['demo','upload'].includes(s.source)&&Array.isArray(s.views)){Object.assign(state,s,{auto:false,tab:'model',selectedBone:null});return true;}}catch{}return false;}

function renderViews(){
  $('#view-count').textContent=String(state.views.length).padStart(2,'0');
  $('#views-list').innerHTML=state.views.map((v,i)=>`<article class="view-card"><div class="view-number">${String(i+1).padStart(2,'0')}</div><button class="view-preview" data-action="preview" data-id="${v.id}" aria-label="Preview ${esc(v.name)}"><img src="${v.src}" alt="${v.synthetic?'Synthetic anatomy projection':'Uploaded reference view'} ${i+1}" />${icon('Expand')}</button><div class="view-card-info"><div class="view-name">View ${i+1}<button class="remove-view" data-action="remove-view" data-id="${v.id}" aria-label="Remove view ${i+1}">${icon('X')}</button></div><label class="sr-only" for="projection-${v.id}">Projection for view ${i+1}</label><div class="select-wrap"><select id="projection-${v.id}" data-projection="${v.id}">${['Unspecified','AP','PA','Lateral','Oblique','Other'].map(p=>`<option ${p===v.projection?'selected':''}>${p}</option>`).join('')}</select>${icon('ChevronDown')}</div><div class="view-dimensions">${v.width} × ${v.height}<span>${v.synthetic?'DEMO':'LOCAL'}</span></div></div></article>`).join('')||`<div class="no-views"><span>01</span><p>Your first perspective<br>starts here.</p></div>`;
  $('#views-note').textContent=state.source==='demo'?'Synthetic projections for this example.':'Reference images only. No automated analysis.';
  $('#sidebar-context').innerHTML=state.source==='demo'?`<div class="context-card"><span class="context-eyebrow">${icon('Sparkles')}THE EXAMPLE</span><h3>${caseData().title}</h3><p>${caseData().subtitle}</p><button data-action="examples">Explore example studies${icon('ArrowRight')}</button></div>`:`<div class="context-card upload-context"><span class="context-eyebrow">${icon('Layers')}YOUR STUDY</span><h3>${state.views.length} reference ${state.views.length===1?'view':'views'}</h3><p>Choose an anatomy atlas to explore alongside your images.</p><button data-action="setup">${state.stage==='model'?'Change anatomy':'Choose anatomy'}${icon('ArrowRight')}</button></div>`;
  refreshIcons();
}

function updateWorkspace(){
  const isDemo=state.source==='demo',c=caseData(),hasModel=state.stage==='model';
  $('#study-number').textContent=isDemo?`EXAMPLE STUDY 00${c.number*1}`:'PERSONAL WORKSPACE';
  $('#study-type').textContent=state.views.length?`${state.views.length} REFERENCE VIEWS`:'NEW STUDY';
  $('#study-title').innerHTML=`${hasModel?esc(currentRegion()):'A new perspective'}<span class="title-dot">.</span>`;
  $('#study-subtitle').textContent=isDemo?'A closer look. A clearer understanding.':hasModel?'Your reference views, alongside an illustrative anatomy atlas.':'Every view adds to the picture. Start with your X-rays.';
  $('#demo-tag').innerHTML=icon(isDemo?'Sparkles':'LockKeyhole')+(isDemo?'Educational example':'Local study');
  $('#side-marker').textContent=state.left?'L':'R';
  $('#model-badge-text').textContent=isDemo?'ANATOMY ATLAS':'REFERENCE ATLAS · NOT RECONSTRUCTED';
  $('#bone-count').textContent=`${currentKind()==='radius'?29:27} bones`;
  $('#viewer-status-text').textContent=hasModel?(viewer?'Interactive 3D illustration':'3D unavailable · references available'):'Waiting for reference views';
  $('#summary-title').textContent=isDemo?(c.id==='normal'?'27 bones. One remarkable hand.':'Small bones. A different perspective.'):'Your images. A place to understand them.';
  $('#summary-text').textContent=isDemo?'Explore how an injury sits within the anatomy. Rotate, zoom, and look a little closer.':'Explore an anatomy atlas alongside your reference images. Automated image analysis is not connected.';
  $('.learn-button').innerHTML=(isDemo?'Understand this '+(c.id==='normal'?'anatomy':'injury'):'About this illustration')+icon('ArrowUpRight');
  $('#canvas-container').style.visibility=hasModel?'visible':'hidden';
  $('.viewer-bottom').hidden=!hasModel||!viewer;$('.viewport-corner').hidden=!hasModel;$('.model-badge').hidden=!hasModel;
  $('.illustration-label').hidden=!hasModel;
  $('#empty-state').hidden=hasModel;
  $('#annotation-title').textContent=BONE_INFO[currentKind()]?.title||'Hand anatomy';
  $('#annotation-subtitle').innerHTML='Illustrated fracture'+icon('ArrowUpRight');
  renderViews();updateAnnotation();updateCamera();renderEmpty();renderReport();refreshIcons();save();
}
function updateAnnotation(){$('#annotation').hidden=!(viewer&&state.labels&&state.highlight&&state.stage==='model'&&currentKind()!=='normal'&&state.source==='demo'&&state.tab!=='report'&&!state.auto);}
function updateCamera(){document.querySelectorAll('[data-action="camera"]').forEach(el=>el.classList.toggle('active',el.dataset.view===state.camera));$('.viewport-corner > span:last-child').textContent=`${currentKind()==='radius'?'WRIST':'HAND'} · ${state.camera.toUpperCase()}`;}
function renderEmpty(){
  if(state.stage==='model')return;
  const ready=state.views.length>=2;
  $('#empty-state').innerHTML=`<div class="empty-illustration">${icon('Layers')}<span>${icon('Plus')}</span></div><div class="eyebrow">A LITTLE MORE PERSPECTIVE</div><h2>${state.views.length?'Your views are the beginning.':'See the bigger picture.'}</h2><p>${state.views.length?'Add at least two reference images, then choose an anatomy atlas to explore alongside them.':'Bring two or more X-ray views into one workspace, or explore an illustrated example to get started.'}</p><div class="empty-actions"><button class="primary-button" data-action="${ready?'setup':'upload'}">${icon(ready?'Box':'Upload')}${ready?'Choose anatomy atlas':'Add reference views'}</button><button class="secondary-button" data-action="examples">Explore examples${icon('ArrowUpRight')}</button></div><div class="empty-footnote">${icon('Info')}This prototype does not detect injuries or reconstruct uploaded images.</div>`;refreshIcons();
}

async function loadCase(id){
  const epoch=++studyEpoch;state.source='demo';state.caseId=id;state.stage='model';state.notes='';state.left=false;state.selectedBone=null;state.camera='oblique';state.tab='model';
  $('#loading-state').hidden=false;
  await new Promise(r=>setTimeout(r,50));if(epoch!==studyEpoch)return;
  try{if(!syntheticCache.has(id))syntheticCache.set(id,exampleViews(id));state.views=structuredClone(syntheticCache.get(id));viewer?.load(id);state.highlight=true;state.opacity=1;syncDisplay();}catch(e){console.error(e);showViewerFailure();}
  $('#loading-state').hidden=true;setTab('model');$('#bone-detail').hidden=true;updateWorkspace();
}

function setTab(tab){state.tab=tab;$('#model-tab').classList.toggle('active',tab==='model');$('#report-tab').classList.toggle('active',tab==='report');$('#model-tab').setAttribute('aria-selected',tab==='model');$('#report-tab').setAttribute('aria-selected',tab==='report');$('#report-panel').hidden=tab!=='report';$('.viewport').classList.toggle('report-open',tab==='report');if(tab==='report'){$('#bone-detail').hidden=true;renderReport();}updateAnnotation();refreshIcons();}
function renderReport(){
  if(state.tab!=='report')return;
  const c=caseData(),isDemo=state.source==='demo';
  $('#report-panel').innerHTML=`<div class="report-top"><div>${icon('FileText')}Study report</div><button class="icon-button" data-action="tab-model" aria-label="Close report">${icon('X')}</button></div><div class="report-body"><div class="report-flag"><span></span>${isDemo?'MOCK REPORT · SYNTHETIC CASE':'REFERENCE NOTES · NO ANALYSIS'}</div><h2>${isDemo?esc(c.title):esc(currentRegion())+' reference study'}</h2><div class="report-audience"><button data-action="audience-resident" class="${state.audience==='resident'?'active':''}">For residents</button><button data-action="audience-patient" class="${state.audience==='patient'?'active':''}">Plain language</button></div><dl class="report-meta"><div><dt>Examination</dt><dd>${esc(currentRegion())} · ${state.views.length} reference views</dd></div><div><dt>Source</dt><dd>${isDemo?'Synthetic educational example':'User-supplied reference images'}</dd></div><div><dt>Analysis</dt><dd>${isDemo?'Prewritten example':'Not performed'}</dd></div></dl>${isDemo?state.audience==='resident'?`<section><h3>Findings</h3><p>${esc(c.findings)}</p></section><section class="impression"><h3>Impression</h3><p>${esc(c.impression)}</p></section><section class="report-tip">${icon('Sparkles')}<div><h3>Reporting tip</h3><p>${esc(c.tip)}</p></div></section>`:`<section><h3>Understanding the model</h3><p>${esc(c.patient)}</p></section><section class="report-tip">${icon('MousePointer2')}<div><h3>Take a closer look</h3><p>Drag to rotate the model, or use the Frontal, Lateral, and Oblique buttons to see it from another angle.</p></div></section>`:`<section><h3>No diagnostic findings generated</h3><p>Your images are available as references. The 3D model is a manually selected atlas; it is not fitted to your images and cannot establish a diagnosis.</p></section><section><h3>Study notes</h3><label class="sr-only" for="report-notes">Your study notes</label><textarea id="report-notes" placeholder="Add your own educational observations…">${esc(state.notes)}</textarea><small class="notes-hint">Saved on this device. Notes are user-authored.</small></section>`}<div class="report-disclaimer">${icon('Info')}Educational content only. Geometry, displacement, and proportions are illustrative. This report is not a clinical interpretation.</div><button class="report-copy" data-action="copy-report">${icon('Copy')}Copy ${isDemo?'mock report':'study notes'}</button></div>`;
  refreshIcons();
}
function reportText(){const c=caseData();return `X3D — EDUCATIONAL ${state.source==='demo'?'MOCK REPORT':'REFERENCE STUDY'}\n${currentRegion()}\n${state.views.length} reference views\n\n${state.source==='demo'?`SYNTHETIC CASE: ${c.title}\n\nFINDINGS\n${c.findings}\n\nIMPRESSION\n${c.impression}\n\nPLAIN LANGUAGE\n${c.patient}`:`Analysis: Not performed.\nThe atlas is manually selected and is not reconstructed from the supplied images.\n\nUSER-AUTHORED NOTES\n${state.notes||'No notes supplied.'}`}\n\nEducational illustration only. Not for diagnosis or treatment planning.\nAtlas units are arbitrary; no calibrated measurements are available.\n`;}

function closeModal(){studyDraft=null;const root=$('#modal-root');root.innerHTML='';modalKind=null;document.body.classList.remove('modal-open');lastFocus?.focus();}
function modal(title,body,kind='generic',wide=false){
  if(kind!=='new-study')studyDraft=null;
  lastFocus=document.activeElement;modalKind=kind;
  const heading=kind==='new-study'?'':`<div class="modal-heading"><div class="eyebrow">X3D WORKSPACE</div><button class="icon-button" data-action="close-modal" aria-label="Close dialog">${icon('X')}</button></div>`;
  $('#modal-root').innerHTML=`<div class="modal-overlay"><section class="modal ${wide?'modal-wide':''}" role="dialog" aria-modal="true" aria-label="${esc(title)}" tabindex="-1">${heading}${body}</section></div>`;
  document.body.classList.add('modal-open');refreshIcons();$('.modal').focus();
}

function openNewStudy(){
  studyDraft={views:[],pending:0,message:'',queue:Promise.resolve()};
  modal('New study',`<header class="study-dialog-header"><span class="study-dialog-icon">${icon('Upload')}</span><div><h2>New study</h2><p>Two or more views. One body area.</p></div><button class="icon-button" data-action="close-modal" aria-label="Close new study">${icon('X')}</button></header><div class="study-dialog-body"><div class="study-drop-zone" id="study-drop-zone">${icon('Upload')}<h3>Drop your X-rays here</h3><p>or paste from your clipboard</p><button class="study-choose-button" data-action="choose-study-images">Choose images</button><input type="file" id="study-file-input" accept="image/png,image/jpeg,image/webp" multiple hidden /></div><div class="study-file-limits">PNG, JPEG or WebP · up to 6 images · 25 MB each</div><div id="study-draft-views" class="study-draft-views" aria-label="Selected images"></div><div id="study-draft-message" class="study-draft-message" role="status" aria-live="polite"></div></div><footer class="study-dialog-footer"><span>${icon('LockKeyhole')}Images stay on this device</span><button class="study-open-button" data-action="open-study" disabled>Open study${icon('ArrowRight')}</button></footer>`,'new-study');
  $('.modal').classList.add('study-dialog');$('.modal-overlay').classList.add('new-study-overlay');
  renderStudyDraft();
}
function renderStudyDraft(){
  if(modalKind!=='new-study'||!studyDraft)return;
  const draft=studyDraft;
  $('.study-dialog').classList.toggle('has-images',draft.views.length>0);
  $('#study-draft-views').innerHTML=draft.views.map((v,i)=>`<article class="study-draft-card"><img src="${v.src}" alt="Selected reference view ${i+1}" /><div><strong>${esc(v.name)}</strong><span>View ${i+1} · ${v.width} × ${v.height}</span></div><button class="icon-button" data-action="remove-draft-view" data-id="${v.id}" aria-label="Remove selected view ${i+1}">${icon('X')}</button></article>`).join('');
  const status=$('#study-draft-message');
  status.textContent=draft.pending?'Preparing your images…':draft.message||(draft.views.length===1?'Add one more view to open your study.':draft.views.length>=2?`${draft.views.length} reference views ready.`:'');
  status.classList.toggle('has-error',!!draft.message&&!draft.pending);
  $('[data-action="open-study"]').disabled=draft.views.length<2||draft.pending>0;
  refreshIcons();
}
function addDraftFiles(files){
  const draft=studyDraft;if(!draft)return Promise.resolve();
  const selected=[...files];draft.pending++;draft.message='';renderStudyDraft();
  draft.queue=draft.queue.then(async()=>{
    let rejected=0;
    for(const file of selected){
      if(studyDraft!==draft)return;
      if(draft.views.length>=MAX_VIEWS){rejected++;continue;}
      const view=await readReferenceImage(file);
      if(studyDraft!==draft)return;
      if(view)draft.views.push(view);else rejected++;
    }
    if(rejected)draft.message=`${rejected} ${rejected===1?'file was':'files were'} skipped. Use PNG, JPEG or WebP up to 25 MB each, with a maximum of 6 images.`;
  }).catch(()=>{draft.message='An image could not be opened. Try a PNG, JPEG or WebP file.';}).finally(()=>{draft.pending--;if(studyDraft===draft)renderStudyDraft();});
  return draft.queue;
}
function openDraftStudy(){
  if(!studyDraft||studyDraft.pending||studyDraft.views.length<2)return;
  const views=studyDraft.views;
  ++studyEpoch;Object.assign(state,{source:'upload',views,stage:'setup',tab:'model',notes:'',selectedBone:null,anatomy:'normal',left:false});
  closeModal();setTab('model');$('#bone-detail').hidden=true;updateWorkspace();
  toast(`Study opened with ${views.length} reference views.`);
}
function openExamples(){
  modal('Example studies',`<div class="modal-title"><h2>A different perspective.</h2><p>Explore a synthetic case. Get to know the anatomy.</p></div><div class="example-grid">${CASES.map((c,i)=>`<button class="example-card" data-action="load-case" data-case="${c.id}"><div class="example-image"><img src="${syntheticCache.get(c.id)?.[0]?.src||state.views.find(v=>v.synthetic)?.src||''}" alt="Synthetic ${c.region.toLowerCase()} anatomy illustration" /><span class="example-index">0${i+1}</span><span class="example-tag">${c.tag}</span></div><div class="example-description"><h3>${c.title}${icon('ArrowUpRight')}</h3><p>${c.subtitle}</p><span>2 synthetic views<span>·</span>Interactive atlas</span></div></button>`).join('')}</div><div class="modal-footnote">${icon('Info')}These examples use generated atlas projections and prewritten reports. No patient images or AI diagnoses.</div>`,'examples',true);
  setTimeout(()=>{if(modalKind!=='examples')return;for(const c of CASES){try{if(!syntheticCache.has(c.id))syntheticCache.set(c.id,exampleViews(c.id));const el=$(`[data-case="${c.id}"] img`);if(el)el.src=syntheticCache.get(c.id)[0].src;}catch{}}},80);
}
function openAbout(){modal('About X3D',`<div class="about-symbol">${icon('Box')}</div><div class="modal-title"><div class="eyebrow">A NEW PERSPECTIVE ON ANATOMY</div><h2>See more. Understand more.</h2><p>X3D brings reference images and interactive anatomy into one calm workspace.</p></div><div class="about-details"><div>${icon('Hand')}<div><h3>Explore the anatomy</h3><p>Rotate an approximate hand or wrist atlas. Select bones, change your perspective, and explore illustrative injuries.</p></div></div><div>${icon('FileText')}<div><h3>Learn the language</h3><p>Example studies pair synthetic projections with prewritten reports and plain-language explanations.</p></div></div><div>${icon('ShieldCheck')}<div><h3>Know what the model knows</h3><p>This prototype does not analyze radiographs, detect fractures, measure anatomy, or reconstruct patient-specific geometry. An atlas cannot resolve clinical uncertainty.</p></div></div></div><a class="source-link" href="https://www.nibib.nih.gov/science-education/science-topics/computed-tomography-ct" target="_blank" rel="noopener noreferrer">Learn how 3D CT imaging works · NIH${icon('ExternalLink')}</a><div class="modal-footnote">Inspired by the X3D concept. Independently recreated; not affiliated with the original project.</div>`,'about');}
function openModelInfo(){modal('Model information',`<div class="modal-title"><div class="eyebrow">TRANSPARENCY, BY DESIGN</div><h2>A model with clear limits.</h2><p>What you see is an illustrative anatomy atlas.</p></div><div class="evidence-table"><div><span>Geometry source</span><strong>Procedural anatomy atlas</strong></div><div><span>Patient-specific reconstruction</span><strong class="muted">Not performed</strong></div><div><span>Fit to supplied projections</span><strong class="muted">Not performed</strong></div><div><span>Automated fracture detection</span><strong class="muted">Not connected</strong></div><div><span>Measurements & confidence</span><strong class="muted">Not calibrated</strong></div><div><span>Report source</span><strong>${state.source==='demo'?'Prewritten synthetic case':'User-authored notes'}</strong></div></div><div class="research-note">${icon('View')}<div><h3>What about the next X-ray angle?</h3><p>Additional-view planning requires a validated model of uncertainty and image acquisition geometry. This prototype does not recommend clinical imaging views.</p></div></div><div class="modal-footnote">Two views constrain anatomy, but do not uniquely determine a 3D volume. Hidden surfaces and fracture detail in this atlas are illustrative.</div>`,'model-info');}
function openSettings(){modal('Workspace settings',`<div class="modal-title"><h2>Your workspace.</h2><p>A small, private place to explore anatomy.</p></div><div class="settings-section"><h3>IMAGE ANALYSIS</h3><div class="provider-state"><span class="status-dot"></span><div><strong>Illustration mode</strong><p>No AI provider connected. No images leave your device.</p></div></div><p class="settings-explanation">The app uses an approximate atlas and prewritten example reports. Automated anatomy identification, fracture detection, and reconstruction require a separate validated service.</p></div><div class="settings-section"><h3>LOCAL STORAGE</h3><p>Your current study, images, and notes are saved in this browser using IndexedDB. Clearing browser data removes them.</p><button class="secondary-button danger" data-action="clear-storage">${icon('RotateCcw')}Clear saved workspace</button></div><div class="modal-footnote">Display controls are available from the sliders button above the 3D viewer.</div>`,'settings');}
function openSetup(){modal('Choose anatomy atlas',`<div class="modal-title"><div class="eyebrow">REFERENCE ATLAS</div><h2>Put your views in context.</h2><p>Choose the anatomy yourself. This model will sit alongside your images; it will not be fitted to them.</p></div><form id="atlas-form"><label class="field-label" for="anatomy-select">Anatomy</label><select id="anatomy-select" class="form-select"><option value="normal" ${state.anatomy==='normal'?'selected':''}>Hand · anatomy atlas</option><option value="radius" ${state.anatomy==='radius'?'selected':''}>Wrist & forearm · illustrative radius fracture</option><option value="metacarpal" ${state.anatomy==='metacarpal'?'selected':''}>Hand · illustrative metacarpal fracture</option></select><label class="field-label" for="side-select">Side</label><select id="side-select" class="form-select"><option value="right" ${!state.left?'selected':''}>Right</option><option value="left" ${state.left?'selected':''}>Left</option></select><div class="setup-info">${icon('Info')}Any fracture shown belongs to the selected atlas, and is not a finding in your images.</div><button type="submit" class="primary-button full-width">${icon('Box')}Open anatomy atlas${icon('ArrowRight')}</button></form>`,'setup');}
function showBone(data){state.selectedBone=data;$('#bone-detail').innerHTML=`<button class="icon-button" data-action="close-bone" aria-label="Close bone detail">${icon('X')}</button><div class="eyebrow">${data.fracture?'ILLUSTRATED FRAGMENT':'ANATOMY ATLAS'}</div><h3>${esc(data.name)}</h3><p>${data.fracture?BONE_INFO[currentKind()]?.text||'An illustrative bone fragment.':'Select and rotate the model to explore this bone in relation to the rest of the hand. Geometry is approximate.'}</p>`;$('#bone-detail').hidden=false;refreshIcons();}
function openPreview(id){const v=state.views.find(x=>x.id===id);if(!v)return;modal('Reference image preview',`<div class="image-modal-title"><div><h2>${esc(v.name)}</h2><p>${esc(v.projection)} projection · ${v.width} × ${v.height} · ${v.synthetic?'Synthetic example':'Local reference image'}</p></div></div><div class="image-preview-stage"><img src="${v.src}" alt="${esc(v.name)}" /></div><div class="modal-footnote">${v.synthetic?'Generated from the illustrative 3D atlas. This is not an acquired radiograph.':'Uploaded reference only. No automated interpretation has been performed.'}</div>`,'preview',true);}
function download(blob,name){if(!blob){toast('This export is not available yet.');return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}

async function readReferenceImage(file){
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>MAX_IMAGE_BYTES)return null;
  try{
    const bitmap=await createImageBitmap(file);
    if(bitmap.width>20000||bitmap.height>20000||bitmap.width*bitmap.height>80_000_000){bitmap.close();return null;}
    const scale=Math.min(1,2400/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
    canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
    const view={id:crypto.randomUUID(),name:file.name,projection:'Unspecified',src:canvas.toDataURL('image/jpeg',.92),width:bitmap.width,height:bitmap.height,synthetic:false};
    bitmap.close();return view;
  }catch{return null;}
}
async function handleFiles(files){
  const selected=[...files];
  if(modalKind==='new-study'){await addDraftFiles(selected);return;}
  if(modalKind)return;
  if(state.source==='demo'){openNewStudy();await addDraftFiles(selected);return;}
  const epoch=studyEpoch;const added=[];let rejected=0;
  for(const file of selected){
    if(added.length+state.views.length>=MAX_VIEWS){rejected++;continue;}
    const view=await readReferenceImage(file);
    if(epoch!==studyEpoch)return;
    if(view)added.push(view);else rejected++;
  }
  if(added.length){state.views.push(...added);if(state.stage==='empty')state.stage='setup';$('#bone-detail').hidden=true;updateWorkspace();toast(`${added.length} reference ${added.length===1?'image':'images'} added${rejected?' · some files were skipped':''}.`);}
  else if(rejected)toast('Use PNG, JPG, or WEBP under 25 MB. Maximum 6 views.');
  $('#file-input').value='';
}

function syncDisplay(){$('#highlight-toggle').checked=state.highlight;$('#labels-toggle').checked=state.labels;$('#rotate-toggle').checked=state.auto;$('#opacity-range').value=state.opacity*100;$('#opacity-value').textContent=`${Math.round(state.opacity*100)}%`;viewer?.setHighlight(state.highlight);viewer?.setOpacity(state.opacity);if(viewer)viewer.controls.autoRotate=state.auto;updateAnnotation();}
function showViewerFailure(){$('#loading-state').hidden=true;$('#canvas-container').innerHTML=`<div class="webgl-error"><h3>3D rendering is unavailable</h3><p>Enable hardware acceleration in your browser to explore the anatomy. Reference images and reports are still available.</p></div>`;}

const actions={
  home:async()=>{closeModal();await loadCase('metacarpal');},examples:openExamples,about:openAbout,settings:openSettings,'model-info':openModelInfo,setup:openSetup,
  upload:()=>{if(state.source==='demo')openNewStudy();else $('#file-input').click();},'close-modal':closeModal,
  'choose-study-images':()=>$('#study-file-input').click(),
  'open-study':openDraftStudy,
  'remove-draft-view':el=>{if(studyDraft){studyDraft.views=studyDraft.views.filter(v=>v.id!==el.dataset.id);studyDraft.message='';renderStudyDraft();}},
  new:openNewStudy,
  'load-case':async el=>{closeModal();await loadCase(el.dataset.case);toast('Example study opened.');},
  preview:el=>openPreview(el.dataset.id),
  'remove-view':el=>{state.views=state.views.filter(v=>v.id!==el.dataset.id);if(state.source==='upload'&&!state.views.length)state.stage='empty';updateWorkspace();},
  'tab-model':()=>setTab('model'),'tab-report':()=>setTab('report'),
  'audience-resident':()=>{state.audience='resident';renderReport();save();},'audience-patient':()=>{state.audience='patient';renderReport();save();},
  display:()=>{$('#display-panel').hidden=!$('#display-panel').hidden;$('#export-menu').hidden=true;},
  export:()=>{$('#export-menu').hidden=!$('#export-menu').hidden;$('#display-panel').hidden=true;},
  camera:el=>{state.camera=el.dataset.view;state.auto=false;viewer?.setView(state.camera);syncDisplay();updateCamera();},
  'reset-camera':()=>{state.camera='oblique';state.auto=false;viewer?.setView('oblique');syncDisplay();updateCamera();toast('View reset.');},
  'zoom-in':()=>viewer?.zoom(.88),'zoom-out':()=>viewer?.zoom(1.12),
  fullscreen:async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('.viewer-shell').requestFullscreen();}catch{toast('Fullscreen is not available in this browser.');}},
  'reset-display':()=>{Object.assign(state,{highlight:true,labels:true,auto:false,opacity:1});syncDisplay();save();},
  'fracture-info':()=>showBone({name:BONE_INFO[currentKind()]?.title||'Atlas anatomy',fracture:true}),
  'close-bone':()=>{$('#bone-detail').hidden=true;},
  'patient-view':()=>{state.audience='patient';setTab('report');},
  'copy-report':async()=>{try{await navigator.clipboard.writeText(reportText());toast('Educational report copied.');}catch{download(new Blob([reportText()],{type:'text/plain'}),'x3d-educational-report.txt');toast('Report downloaded.');}},
  'export-image':async()=>{if(state.stage!=='model'||!viewer)return toast('Open an anatomy atlas first.');download(await viewer.snapshot(),'x3d-educational-illustration.png');toast('Illustration exported.');},
  'export-glb':async()=>{if(state.stage!=='model'||!viewer)return toast('Open an anatomy atlas first.');download(await viewer.glb(),'x3d-illustrative-atlas.glb');toast('3D atlas exported.');},
  'export-report':()=>{download(new Blob([reportText()],{type:'text/plain'}),'x3d-educational-report.txt');toast('Educational report exported.');},
  'export-study':()=>{download(new Blob([JSON.stringify({format:'x3d-educational-study',version:1,disclaimer:'Illustrative atlas only. No automated interpretation or patient-specific reconstruction.',...state},null,2)],{type:'application/json'}),'x3d-reference-study.json');toast('Study with reference images exported.');},
  'clear-storage':async()=>{
    clearTimeout(saveTimer);
    try{
      ++studyEpoch;Object.assign(state,{source:'upload',views:[],stage:'empty',notes:'',selectedBone:null});
      await persistStudy();
      closeModal();setTab('model');$('#bone-detail').hidden=true;updateWorkspace();
      $('#save-status').textContent='Saved workspace cleared';toast('Saved images and notes cleared.');
    }catch{toast('Browser storage could not be cleared.');}
  },
};

document.addEventListener('click',async e=>{
  const button=e.target.closest('[data-action]');
  if(button){e.preventDefault();const action=button.dataset.action;try{await actions[action]?.(button);}catch(error){console.error(error);toast('That action could not be completed. Please try again.');}if(action!=='export'&&action.startsWith('export-'))$('#export-menu').hidden=true;}
  else if(!e.target.closest('.export-wrap'))$('#export-menu').hidden=true;
  if(e.target.classList.contains('modal-overlay'))closeModal();
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){if(modalKind)closeModal();$('#display-panel').hidden=true;$('#export-menu').hidden=true;$('#bone-detail').hidden=true;}
  if(e.key==='Tab'&&modalKind){const modalEl=$('.modal'),focusables=[...modalEl.querySelectorAll('button,a[href],select,input,textarea,[tabindex="0"]')].filter(e=>!e.disabled&&e.getClientRects().length>0);if(!focusables.length)return;const first=focusables[0],last=focusables.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===modalEl)){e.preventDefault();last.focus();}else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===modalEl)){e.preventDefault();first.focus();}}
});
document.addEventListener('change',e=>{
  if(['file-input','study-file-input'].includes(e.target.id)){const input=e.target;handleFiles(input.files).finally(()=>{input.value='';});}
  if(e.target.dataset.projection){const v=state.views.find(v=>v.id===e.target.dataset.projection);if(v)v.projection=e.target.value;save();}
  if(e.target.id==='highlight-toggle'){state.highlight=e.target.checked;syncDisplay();save();}
  if(e.target.id==='labels-toggle'){state.labels=e.target.checked;syncDisplay();save();}
  if(e.target.id==='rotate-toggle'){state.auto=e.target.checked;syncDisplay();save();}
});
document.addEventListener('input',e=>{if(e.target.id==='opacity-range'){state.opacity=+e.target.value/100;syncDisplay();save();}if(e.target.id==='report-notes'){state.notes=e.target.value;save();}});
document.addEventListener('submit',e=>{if(e.target.id!=='atlas-form')return;e.preventDefault();state.anatomy=$('#anatomy-select').value;state.left=$('#side-select').value==='left';state.stage='model';state.camera='oblique';state.opacity=1;state.highlight=true;viewer?.load(state.anatomy,state.left);syncDisplay();closeModal();updateWorkspace();toast('Reference atlas opened. It is not fitted to your images.');});
document.addEventListener('paste',e=>{if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;const files=[...e.clipboardData.items].filter(x=>x.kind==='file').map(x=>x.getAsFile()).filter(Boolean);if(files.length){e.preventDefault();handleFiles(files);}});
let dragDepth=0;
document.addEventListener('dragenter',e=>{if(e.dataTransfer.types.includes('Files')){e.preventDefault();dragDepth++;$('#drop-zone').classList.add('dragging');$('#study-drop-zone')?.classList.add('dragging');}});
document.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('Files'))e.preventDefault();});
document.addEventListener('dragleave',()=>{dragDepth--;if(dragDepth<=0){dragDepth=0;$('#drop-zone').classList.remove('dragging');$('#study-drop-zone')?.classList.remove('dragging');}});
document.addEventListener('drop',e=>{if(e.dataTransfer.files.length){e.preventDefault();dragDepth=0;$('#drop-zone').classList.remove('dragging');$('#study-drop-zone')?.classList.remove('dragging');handleFiles(e.dataTransfer.files);}});

async function init(){
  try{viewer=new AnatomyViewer($('#canvas-container'),showBone,()=>{if(state.auto){state.auto=false;syncDisplay();}state.camera='custom';updateCamera();});}catch(error){console.error('3D initialization failed',error);showViewerFailure();}
  const restored=await restore();
  if(restored){if(state.stage==='model')viewer?.load(currentKind(),state.left);syncDisplay();$('#loading-state').hidden=true;updateWorkspace();}
  else await loadCase('metacarpal');
  window.__x3dReady=true;
}
init();
