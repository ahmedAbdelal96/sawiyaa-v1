const fs = require('fs');
const path = require('path');

function walk(dir, pred){
  let out=[];
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,e.name);
    if(e.isDirectory()) out=out.concat(walk(p,pred));
    else if(e.isFile() && pred(p)) out.push(p);
  }
  return out;
}

function normalize(p){return p.replace(/\\/g,'/');}

const repoRoot=process.cwd();
const backendRoot=path.join(repoRoot,'fayed-backend-v1');
const frontendRoot=path.join(repoRoot,'fayed-frontend-v1');
const mobileRoot=path.join(repoRoot,'fayed-mobile');
const artDir=path.join(repoRoot,'artifacts');
fs.mkdirSync(artDir,{recursive:true});

const endpointRows = JSON.parse(fs.readFileSync(path.join(backendRoot,'artifacts','backend-endpoint-matrix.json'),'utf8'));
const fileCache = new Map();
function fileTextBackend(rel){
  const abs=path.join(backendRoot, rel);
  if(!fileCache.has(abs)) fileCache.set(abs, fs.readFileSync(abs,'utf8'));
  return fileCache.get(abs);
}

function inferAuth(row){
  const txt=fileTextBackend(row.file);
  const hasAccess = txt.includes('JwtAccessAuthGuard');
  const hasRefresh = txt.includes('JwtRefreshAuthGuard');
  if(row.public) return 'Public';
  if(hasRefresh && /auth\/(patient|practitioner|admin)\/(refresh|logout)/.test(row.path)) return 'JWT Refresh';
  if(hasAccess) return 'JWT Access';
  return 'Public/No JWT Guard';
}
function inferRoles(row){
  const txt=fileTextBackend(row.file);
  const roles = [];
  const m = txt.match(/@Roles\(([^\)]*)\)/g);
  if(m){
    for(const item of m){
      const inside = item.replace('@Roles(','').replace(')','');
      inside.split(',').map(s=>s.trim()).forEach(r=>{if(r.startsWith('AppRole.')) roles.push(r.replace('AppRole.',''));});
    }
  }
  return Array.from(new Set(roles));
}
function inferOwnership(row){
  const handler = row.handler.toLowerCase();
  const p = row.path;
  if(p.includes('patients/me') || p.includes('practitioners/me')) return 'Self-scope by route + userId';
  if(handler.includes('details')||handler.includes('get')||handler.includes('list')||handler.includes('me')) return 'Use-case specific';
  return 'Use-case specific';
}
function risk(row){
  const p=row.path;
  if(/admin\/(finance|settlements|payout|payments|audit|support|care-chat|practitioner-applications)/.test(p)) return 'High';
  if(/auth\//.test(p)) return 'High';
  if(/webhooks/.test(p)) return 'High';
  if(/patients\/me|practitioners\/me/.test(p)) return 'Medium';
  return 'Low';
}

const backendMatrix = endpointRows.map(r=>({
  method:r.method,
  path:'/api/v1/'+r.path,
  controller:r.file,
  currentProtection: inferAuth(r),
  requiredRoleOrPermission: inferRoles(r).join('|') || 'None/Implicit',
  ownershipRule: inferOwnership(r),
  riskLevel: risk(r),
  requiredFix: ''
}));
fs.writeFileSync(path.join(artDir,'backend_api_permission_matrix.json'), JSON.stringify(backendMatrix,null,2));

const fePages = walk(path.join(frontendRoot,'src','app'), p=>/\/(page|layout)\.tsx?$/.test(normalize(p)));
function routeFromAppFile(fp){
  const rel = normalize(path.relative(path.join(frontendRoot,'src','app'), fp));
  const noExt = rel.replace(/\/(page|layout)\.tsx?$/, '');
  const clean = noExt.split('/').filter(Boolean).filter(seg=>!seg.startsWith('('));
  return '/'+clean.join('/');
}
function areaFromRoute(route){
  if(route.includes('/admin/')) return 'admin';
  if(route.includes('/patient/')) return 'patient';
  if(route.includes('/practitioner/')) return 'practitioner';
  if(route.includes('/signin')||route.includes('/signup')) return 'auth';
  return 'public';
}
const feRows=[];
for(const fp of fePages){
  const route=routeFromAppFile(fp);
  if(route==='/'||route==='') continue;
  const area=areaFromRoute(route);
  let roles='PUBLIC';
  if(area==='patient') roles='PATIENT';
  else if(area==='practitioner') roles='PRACTITIONER';
  else if(area==='admin') roles='ADMIN|SUPER_ADMIN|SUPPORT_AGENT|CONTENT_REVIEWER';
  else if(area==='auth') roles='Guest';
  const guard = area==='public' ? 'next-intl/proxy only' : 'src/proxy.ts + requireAuthenticatedArea in layout';
  feRows.push({ path:route, area, currentGuard:guard, requiredRoleOrPermission:roles, riskLevel: area==='admin'?'High':(area==='public'?'Low':'Medium'), requiredFix:'' });
}
fs.writeFileSync(path.join(artDir,'frontend_route_permission_matrix.json'), JSON.stringify(feRows,null,2));

const mobScreens = walk(path.join(mobileRoot,'app'), p=>/\.tsx?$/.test(p));
const mobRows=[];
for(const fp of mobScreens){
  const rel = normalize(path.relative(path.join(mobileRoot,'app'), fp));
  if(rel==='_layout.tsx'||rel==='+not-found.tsx'||rel==='index.tsx') continue;
  const area = rel.startsWith('(patient)/') ? 'patient' : rel.startsWith('(practitioner)/') ? 'practitioner' : rel.startsWith('(auth)/') ? 'auth' : 'other';
  const allowed = area==='patient'?'PATIENT':area==='practitioner'?'PRACTITIONER':area==='auth'?'Guest':'Unknown';
  mobRows.push({
    screen:'/'+rel.replace('.tsx',''),
    allowedRole:allowed,
    apiDependencies:'feature hooks/API per screen',
    requiredGuard:'AuthProvider segment guard + backend authorization',
    riskLevel: area==='auth'?'Low':'Medium',
    requiredFix:''
  });
}
fs.writeFileSync(path.join(artDir,'mobile_screen_permission_matrix.json'), JSON.stringify(mobRows,null,2));

console.log('Generated matrices:', backendMatrix.length, feRows.length, mobRows.length);
