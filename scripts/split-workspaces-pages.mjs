import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dir=path.join(root,'tutorials');
// Each tuple is a deliverable procedure. Appendices remain with their owning procedure.
const specs=[
 ['managed-ad','Managed Microsoft ADの構築','managed-ad',['managedAdBuild']],
 ['managed-ad-users','Managed Microsoft ADのユーザー・グループ管理','managed-ad',['managedAdUsers']],
 ['management-ec2','管理用EC2の起動・接続・AD管理','management-ec2',['managementEc2']],
 ['ad-connector-account','AD Connector用サービスアカウント・権限委任','ad-connector',['connectorDelegation']],
 ['ad-connector','AD ConnectorのVPCピアリング・SG設定・作成','ad-connector',['connectorBuild']],
 ['provisioning-gpo','WorkSpaces Personalの構築・接続','provisioning-gpo',['workspacesBuild']],
 ['target-ou','WorkSpaces用ターゲットOUの作成・権限委任','provisioning-gpo',['workspacesOu']],
 ['gpo','WorkSpaces用GPOの作成・適用・運用','provisioning-gpo',['workspacesGpo']],
 ['image-bundle','WorkSpacesカスタムイメージ作成・共有','image-bundle',['workspacesImage']],
 ['systems-manager','Systems Manager環境構築','patch-manager',['systemsManagerBuild']],
 ['patch-manager','Patch Managerの設定','patch-manager',['patchSettings']],
 ['patch-operations','Patch Managerの実行・結果確認・運用','patch-manager',['patchOperations']],
 ['cost-optimizer','Cost Optimizerの構築・設定','cost-optimizer',['costOptimizerDeploy','costOptimizerVersionDiff','costOptimizerResources']],
 ['cost-optimizer-dry-run','Cost OptimizerのDry Run解除','cost-optimizer',['costOptimizerSettings']],
 ['cost-optimizer-schedule','Cost Optimizerの実行スケジュール設定・変更','cost-optimizer',['costOptimizerSchedule']],
 ['cost-optimizer-reports','Cost Optimizerのレポート・監視','cost-optimizer',['costOptimizerReports','costOptimizerSample']],
 ['cloudwatch-monitoring','CloudWatchのEC2・Windows OS監視とSNS通知','cloudwatch-monitoring',['cloudWatchEc2']],
 ['cloudwatch-workspaces','CloudWatchのWorkSpaces監視','cloudwatch-monitoring',['cloudWatchWorkSpaces']],
];
const file=slug=>`workspaces-${slug}.html`;
const sources=new Map([...new Set(['skill-transfer',...specs.map(s=>s[2])])].map(slug=>[slug,fs.readFileSync(path.join(dir,file(slug)),'utf8')]));
const sections=new Map(),routes={};
for(const [slug,html] of sources){
 routes[file(slug)]={};
 for(const m of html.matchAll(/<section id="([^"]+)" class="procedure-document">([\s\S]*?)<\/section>/g))sections.set(m[1],{html:m[0],source:slug});
}
for(const [slug,,old,keys] of specs)for(const key of keys){
 const section=sections.get(key);if(!section)throw Error(`Missing ${key}; run build-workspaces-skill-transfer.mjs to regenerate grouped sources first`);
 for(const m of section.html.matchAll(/\bid="([^"]+)"/g)) routes[file(old)][m[1]]=file(slug);
}
const xml=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
let sidebar=fs.readFileSync(path.join(root,'scripts/workspaces-sidebar.html'),'utf8');
const fixLinks=(html,old)=>html.replace(/href="([^"]+)"/g,(all,ref)=>{
 if(/^(?:https?:|mailto:)/.test(ref))return all;
 const [p,h]=ref.split('#');if(!h)return all;
 const from=p||file(old);const to=routes[from]?.[decodeURIComponent(h)];
 return to?`href="${to}#${h}"`:all;
});
const tables=html=>html.replace(/<table\b[^>]*>[\s\S]*?<\/table>/g,table=>{
 const headings=[...table.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)].map(m=>m[1].replace(/<[^>]*>/g,''));
 let widths=headings.length===2?[30,70]:headings.length===3?[24,38,38]:headings.length===4?[20,28,26,26]:null;
 if(headings.join('|')==='分類|パラメータ|設定値')widths=[18,48,34];
 if(headings.length===4 && /^No\.?$/i.test(headings[0].trim()))widths=[7,31,27,35];
 if(headings.length===3 && headings[1].trim()==='件数')widths=[24,10,66];
 const cols=widths?'<colgroup>'+widths.map(w=>`<col style="width:${w}%">`).join('')+'</colgroup>':'';
 return `<div class="guide-table-scroll">${table.replace(/<table\b[^>]*>/,`<table class="guide-table">${cols}`)}</div>`;
});
const outputs=[];
for(const [slug,title,old,keys] of [['skill-transfer','全体構築・運用順序','skill-transfer',null],...specs]){
 let html=sources.get(old);
 let body=keys?keys.map((key,i)=>{
  let s=sections.get(key).html;
  if(i===0)s=s.replace(/<h2\b([^>]*)>[\s\S]*?<\/h2>/,(_,attrs)=>`<span${attrs} class="legacy-heading-anchor" aria-hidden="true"></span>`);
  if(i===0)s=s.replace(/<(\/?)([h])([3-6])(\b[^>]*)>/g,(_,slash,h,n,attrs)=>`<${slash}h${Number(n)-1}${attrs}>`);
  return s;
 }).join('\n<hr>\n'):html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1].replace(/^[\s\S]*?<\/h1>/,'');
 body=body.replace(/<p>\s*<a\b[^>]*href="[^"]+\.pptx"[^>]*>[\s\S]*?<\/a>\s*<\/p>/g,'');
 body=body.replace(/<h2 id="参考資料(?:-\d+)?">参考資料<\/h2>[\s\S]*?(?=<\/section>)/g,'');
 body=fixLinks(body,old);body=tables(body);
 html=html.replace(/<main\b[^>]*>[\s\S]*?<\/main>/,`<main class="content workspaces-skill-transfer-guide"><nav class="breadcrumb" aria-label="Breadcrumb"><a href="../">Home</a><span>トピック</span></nav><h1>${xml(title)}</h1>${body}</main>`);
 html=html.replace(/<title>[\s\S]*?<\/title>/,`<title>${xml(title)} | Documentation</title>`).replace(/<meta name="description"[^>]*>/,`<meta name="description" content="${xml(title)}の操作手順と設定例">`);
 html=html.replace(/<aside\b[^>]*id="site-sidebar"[\s\S]*?<\/aside>/,sidebar.replace(`href="${file(slug)}"`,`href="${file(slug)}" class="active" aria-current="page"`));
 html=html.replace('</head>','<link rel="stylesheet" href="../assets/workspaces-guides.css?v=20260912-split">\n<script src="../assets/workspaces-legacy-routes.js?v=20260912-split"></script>\n</head>');
 outputs.push([slug,html]);
}
for(const [slug,html] of outputs)fs.writeFileSync(path.join(dir,file(slug)),html.replace(/\r?\n/g,'\r\n'));
fs.writeFileSync(path.join(root,'assets/workspaces-legacy-routes.js'),`// Preserve deep links from the former combined pages.\n(() => { const routes=${JSON.stringify(routes)}; const redirect=()=>{let hash;try{hash=decodeURIComponent(location.hash.slice(1));}catch{return;}const current=location.pathname.split('/').pop().replace(/\\.html$/, '')+'.html';const target=routes[current]?.[hash];if(target && target!==current)location.replace(target+location.hash);};addEventListener('hashchange',redirect);redirect();})();\n`);
fs.writeFileSync(path.join(root,'scripts/workspaces-page-manifest.json'),JSON.stringify(specs.map(([slug,title,old,keys])=>({file:file(slug),title,source:file(old),keys})),null,2)+'\n');
console.log('Created 18 procedure pages and one overview; existing image URLs preserved.');
