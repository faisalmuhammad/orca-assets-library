const escape=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export function validateTextDocument(bytes:Buffer,label:string):string {
  if(bytes.length>2*1024*1024)throw new Error(label+' preview limit is 2 MB');
  const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text))throw new Error(label+' file contains binary data');
  return text;
}
export const validateMarkdown=(bytes:Buffer)=>validateTextDocument(bytes,'Markdown');
export function markdownThumbnail(text:string,label='MARKDOWN'):Buffer {
  const lines=text.split(/\r?\n/).filter(line=>line.trim()).slice(0,16);let y=92;
  const content=lines.map((line,index)=>{
    const heading=/^#{1,2}\s/.test(line),title=index===0&&heading;
    const plain=line.replace(/^#{1,6}\s*/,'').replace(/!\[([^\]]*)\]\([^)]*\)/g,'[Image: $1]').replace(/\[([^\]]*)\]\([^)]*\)/g,'$1').replace(/\*\*|__|\x60/g,'').slice(0,title?30:heading?42:54);
    const result='<text x="36" y="'+y+'" font-family="sans-serif" font-size="'+(title?26:heading?18:13)+'" fill="'+(heading?'#203e36':'#6f6b80')+'">'+escape(plain)+'</text>';y+=title?46:heading?34:25;return result;
  }).join('');
  return Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="480" height="560"><rect width="480" height="560" rx="12" fill="#fafaf8"/><text x="36" y="42" font-family="sans-serif" font-size="11" fill="#6f6b80">'+escape(label)+'</text><path d="M36 58H444" stroke="#dedfe3"/>'+content+'</svg>');
}
