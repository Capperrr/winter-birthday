import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {copyFile,readFile,writeFile} from 'node:fs/promises';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../..');
await build({entryPoints:[path.join(root,'src/living/index.js')],outfile:path.join(root,'dist/living-birthday.js'),bundle:true,format:'iife',target:['es2020'],minify:true,legalComments:'eof',nodePaths:[path.join(here,'node_modules')],banner:{js:'/* WINTER living birthday · Three.js MIT. See assets/living/three-LICENSE.txt. */'}});
const bundle=path.join(root,'dist/living-birthday.js');
// Three's embedded GLSL includes trailing spaces; normalize the generated file.
await writeFile(bundle,(await readFile(bundle,'utf8')).replace(/[\t ]+$/gm,''));
await copyFile(path.join(here,'node_modules/three/LICENSE'),path.join(root,'dist/assets/living/three-LICENSE.txt'));
