import { marked,type Token,type Tokens } from 'marked';
import { el,icon } from './dom';

// Render bounded lexer tokens directly into DOM. No HTML sink or resource URLs.
export function renderMarkdownPreview(target:HTMLElement,source:string) {
  const excerpt=source.slice(0,3000).split(/\r?\n/).slice(0,64).join('\n');
  let budget=200;
  const text=(value:string)=>document.createTextNode(value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(_,entity:string)=>{
    const names:Record<string,string>={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
    if(entity[0]!=='#')return names[entity.toLowerCase()]??'';
    const code=entity[1].toLowerCase()==='x'?parseInt(entity.slice(2),16):Number(entity.slice(1));
    return code>0&&code<=0x10ffff&&!(code>=0xd800&&code<=0xdfff)?String.fromCodePoint(code):'';
  }));
  function render(tokens:Token[],parent:HTMLElement,depth=0) {
    if(depth>12)return;
    for(const token of tokens){
      if(--budget<0)return;
      const nested=(node:HTMLElement,children:Token[])=>{render(children,node,depth+1);parent.append(node);};
      switch(token.type){
        case 'heading':{const t=token as Tokens.Heading;const node=el(t.depth<=1?'h3':'h4');nested(node,t.tokens);break;}
        case 'paragraph':nested(el('p'),(token as Tokens.Paragraph).tokens);break;
        case 'strong':nested(el('strong'),(token as Tokens.Strong).tokens);break;
        case 'em':nested(el('em'),(token as Tokens.Em).tokens);break;
        case 'del':nested(el('s'),(token as Tokens.Del).tokens);break;
        case 'blockquote':nested(el('blockquote'),(token as Tokens.Blockquote).tokens);break;
        case 'code':{const node=el('pre');node.append(el('code',(token as Tokens.Code).text));parent.append(node);break;}
        case 'codespan':parent.append(el('code',(token as Tokens.Codespan).text));break;
        case 'br':parent.append(el('br'));break;
        case 'hr':parent.append(el('hr'));break;
        case 'link':nested(el('span','','markdown-link'),(token as Tokens.Link).tokens);break;
        case 'image':{const node=el('span','','markdown-image');node.append(icon('image'),text((token as Tokens.Image).text||'Image reference'));parent.append(node);break;}
        case 'list':{
          const t=token as Tokens.List,node=el(t.ordered?'ol':'ul');
          if(node instanceof HTMLOListElement&&typeof t.start==='number')node.start=t.start;
          for(const item of t.items.slice(0,12)){if(--budget<0)break;const li=el('li');
            if(item.task){li.className='markdown-task';const mark=el('span',item.checked?'☑':'☐');mark.setAttribute('aria-label',item.checked?'Completed':'Incomplete');li.append(mark);}
            render(item.tokens,li,depth+1);node.append(li);
          }parent.append(node);break;
        }
        case 'table':{
          const t=token as Tokens.Table,table=el('table'),head=el('thead'),row=el('tr');
          for(const cell of t.header.slice(0,4)){const th=el('th');render(cell.tokens,th,depth+1);row.append(th);}head.append(row);table.append(head);
          const body=el('tbody');for(const cells of t.rows.slice(0,4)){const tr=el('tr');for(const cell of cells.slice(0,4)){const td=el('td');render(cell.tokens,td,depth+1);tr.append(td);}body.append(tr);}table.append(body);parent.append(table);break;
        }
        case 'text':{const t=token as Tokens.Text;if(t.tokens)render(t.tokens,parent,depth+1);else parent.append(text(t.text));break;}
        case 'escape':parent.append(text((token as Tokens.Escape).text));break;
        case 'html':case 'def':case 'space':break;
        default:parent.append(text(token.raw));
      }
    }
  }
  target.replaceChildren();render(marked.lexer(excerpt,{gfm:true}),target);
  if(!target.textContent?.trim())target.append(el('p','No text to preview. Open the file to view this document.'));
}
