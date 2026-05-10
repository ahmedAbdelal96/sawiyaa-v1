const fs = require("fs");
const path = require("path");
const root = path.join(process.cwd(), "src");
function walk(dir){
  let out=[];
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,e.name);
    if(e.isDirectory()) out=out.concat(walk(p));
    else if(e.isFile() && e.name.endsWith("controller.ts")) out.push(p);
  }
  return out;
}
const httpDecs=["Get","Post","Put","Patch","Delete","Options","Head","All"];
function parseArgs(arg){
  if(!arg) return "";
  const m = arg.match(/['\"]([^'\"]*)['\"]/);
  return m?m[1]:"";
}
function findDecorators(lines, startIdx){
  const decs=[];
  for(let i=startIdx;i>=0;i--){
    const t=lines[i].trim();
    if(t.startsWith("@")) decs.unshift(t);
    else if(t===""||t.startsWith("/**")||t.startsWith("*")||t.startsWith("//")||t.startsWith("*/")) continue;
    else break;
  }
  return decs;
}
const rows=[];
for(const file of walk(root)){
  const rel=path.relative(process.cwd(),file).replace(/\\/g,"/");
  const src=fs.readFileSync(file,"utf8");
  const lines=src.split(/\r?\n/);
  let classBase="";
  let classGuards=[];
  let classRoles=[];
  let classPublic=false;
  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    if(/export class/.test(line)){
      const decs=findDecorators(lines,i-1);
      for(const d of decs){
        if(d.startsWith("@Controller(")) classBase=parseArgs(d);
        if(d.startsWith("@UseGuards(")) classGuards.push(d);
        if(d.startsWith("@Roles(")) classRoles.push(d);
        if(d.startsWith("@Public(" )||d==="@Public()") classPublic=true;
      }
    }
    const m=line.match(/^\s*@(?:(Get|Post|Put|Patch|Delete|Options|Head|All))\((.*)\)/);
    if(m){
      const method=m[1].toUpperCase();
      const sub=parseArgs(m[2]);
      let j=i+1; let sig="";
      while(j<lines.length){
        const t=lines[j].trim();
        if(t.startsWith("@")){j++; continue;}
        if(t.includes("(")){ sig=t; break;}
        j++;
      }
      const methodName = (sig.match(/([A-Za-z0-9_]+)\s*\(/)||[])[1]||"unknown";
      const mdecs=findDecorators(lines,i-1);
      const methodGuards=mdecs.filter(d=>d.startsWith("@UseGuards("));
      const methodRoles=mdecs.filter(d=>d.startsWith("@Roles("));
      const isPublic = classPublic || mdecs.some(d=>d==="@Public()"||d.startsWith("@Public("));
      const reqState = mdecs.filter(d=>d.startsWith("@RequireAccountStates("));
      rows.push({file:rel,method,path:[classBase,sub].filter(v=>v!=="").join("/").replace(/\/+/g,"/"),handler:methodName,public:isPublic,classGuards,methodGuards,classRoles,methodRoles,reqState});
    }
  }
}
const outPath=path.join(process.cwd(),"artifacts","backend-endpoint-matrix.json");
fs.mkdirSync(path.dirname(outPath),{recursive:true});
fs.writeFileSync(outPath,JSON.stringify(rows,null,2));
console.log(`wrote ${rows.length} endpoints to ${outPath}`);
