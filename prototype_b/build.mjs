import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const moduleURL=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const escapeScript=source=>source.replace(/<\/script/gi,'<\\/script');

function one(source, pattern, description, transform) {
  const occurrences=[...source.matchAll(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags+'g'))];
  if (occurrences.length!==1) throw new Error(`A 版本不匹配：需要唯一的 ${description}，找到 ${occurrences.length} 处。没有写入文件。`);
  return source.replace(pattern,(...args)=>transform(...args));
}

const runtimeStart=`const prototypeB=startPrototypeB({
 THREE,scene,camera,canvas:renderer.domElement,creatures,
 createDraft,positionDraft,inspectDraft,commitDraft,discardDraft,
 canPlace:()=>!stage.classList.contains('placing'),
 limits:{minX:MIN_X,maxX:MAX_X,minZ:MIN_Z,maxZ:MAX_Z},
});`;

/** Overlay the known A world bundle without modifying or evaluating its code. */
export function overlayPrototypeB(aHTML,{engineSource,runtimeSource}) {
  if (typeof aHTML!=='string' || typeof engineSource!=='string' || !engineSource.trim() ||
      typeof runtimeSource!=='string' || !runtimeSource.trim()) throw new Error('原型 A 或 B 的源码不完整。');
  let result=one(aHTML,/<script type="importmap">\s*([\s\S]*?)\s*<\/script>/,'A 的 importmap',(_match,json)=>{
    const map=JSON.parse(json);
    if (!map.imports || !map.imports.three || !map.imports.society || !map.imports.construction ||
        map.imports['prototype-b-placement'] || map.imports['prototype-b-runtime']) {
      throw new Error('Importmap 不是预期的 A 版本，或已经包含 B 模块。');
    }
    map.imports['prototype-b-placement']=moduleURL(engineSource);
    map.imports['prototype-b-runtime']=moduleURL(runtimeSource);
    return '<script type="importmap">\n'+JSON.stringify(map)+'\n</script>';
  });
  result=one(result,/<script type="module">([\s\S]*?)<\/script>/,'A 的世界模块',(_match,code)=>{
    for (const name of ['createDraft','positionDraft','inspectDraft','commitDraft','discardDraft']) {
      if (!code.includes('function '+name+'(')) throw new Error('A 版本缺少现有建造接口：'+name);
    }
    let world=one(code,/const SAVE_KEY='ucug1505-living-society-v1';/,'A 的存档键',
      ()=>"const SAVE_KEY='ucug1505-prototype-b-living-society-v1';");
    world=one(world,/new window\.p5\(sketch=>\{/,'A 的世界启动点',match=>runtimeStart+'\n'+match);
    world=one(world,/renderer\.render\(scene,camera\);/,'A 的渲染点',match=>'prototypeB.draw();\n  '+match);
    return '<script type="module">\n'+escapeScript("import {startPrototypeB} from 'prototype-b-runtime';\n"+world)+'</script>';
  });
  result=one(result,/<title>[^<]*<\/title>/,'页面标题',()=>'<title>小球世界 · Prototype B 软件验证</title>');
  return result;
}

export function buildPrototypeB(repositoryRoot, {sourceOutputDir=here, writeOutput=true}={}) {
  const root=path.resolve(repositoryRoot);
  const aPath=path.join(root,'prototype_a','living-world.html');
  const outputDirectory=path.join(root,'prototype_b');
  const outputPath=path.join(outputDirectory,'living-world.html');
  if (!fs.existsSync(aPath)) throw new Error('未找到已打包的 prototype_a/living-world.html。请从完整的项目 ZIP 解压后再运行。');
  const fmt={engineSource:fs.readFileSync(path.join(sourceOutputDir,'placement.mjs'),'utf8'),
    runtimeSource:fs.readFileSync(path.join(sourceOutputDir,'runtime.mjs'),'utf8')};
  const output=overlayPrototypeB(fs.readFileSync(aPath,'utf8'),fmt);
  if (writeOutput) {
    if (fs.existsSync(outputDirectory) && fs.lstatSync(outputDirectory).isSymbolicLink()) {
      throw new Error('不写入符号链接目录：prototype_b。');
    }
    fs.mkdirSync(outputDirectory,{recursive:true});
    // Never follow or overwrite an older output; preserve both the original A and any earlier B.
    fs.writeFileSync(outputPath,output,{flag:'wx'});
  }
  return {outputPath,bytes:Buffer.byteLength(output)};
}

if (process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const {outputPath,bytes}=buildPrototypeB(process.argv[2]??path.resolve(here,'..'));
    console.log(`已生成 Prototype B：${outputPath}（${bytes} bytes），A 未改动。`);
  } catch (e) {
    console.error('未生成 B：'+e.message);
    process.exitCode=1;
  }
}
