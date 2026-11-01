// Generate synthetic image fixtures for local browser checks. No project imagery.
import { mkdir, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return(crc^0xffffffff)>>>0;}
function chunk(type,data){const t=Buffer.from(type),length=Buffer.alloc(4),crc=Buffer.alloc(4);length.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([length,t,data,crc]);}
function png(rgb){const w=320,h=180,header=Buffer.alloc(13);header.writeUInt32BE(w,0);header.writeUInt32BE(h,4);header[8]=8;header[9]=2;const raw=Buffer.alloc((w*3+1)*h);for(let y=0;y<h;y++){const row=y*(w*3+1);for(let x=0;x<w;x++)for(let c=0;c<3;c++)raw[row+1+x*3+c]=(x>35&&x<285&&y>35&&y<145)?rgb[c]:235;}return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);}
await mkdir('.qa',{recursive:true});
for(const [name,color] of [['original',[190,110,70]],['action',[178,157,80]],['verification',[75,125,93]]])await writeFile(`.qa/synthetic-${name}.png`,png(color));
console.log('Synthetic browser fixtures generated in ignored .qa/ directory.');
