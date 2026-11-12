import { validateTextDocument, markdownThumbnail } from './markdown';

// Accept UTF-8 HTML documents/fragments, never arbitrary bytes with an HTML extension.
// Previews use escaped source text; no document is executed or fetched.
export function validateHtml(bytes:Buffer):string {
  const text=validateTextDocument(bytes,'HTML');
  const lead=text.slice(0,8192).replace(/^\uFEFF/,'').replace(/<!--[^]*?-->/g,'').trimStart();
  if(!/^(?:<!doctype\s+html(?:\s|>)|<(?:html|head|body|title|meta|link|style|script|main|section|article|header|footer|nav|div|span|p|h[1-6]|a|img|ul|ol|li|table|form|button|input|svg|canvas|figure|details|template)(?:\s|\/?>))/i.test(lead))throw new Error('Unsupported HTML document signature');
  return text;
}
export const htmlThumbnail=(text:string)=>markdownThumbnail(text,'HTML');
