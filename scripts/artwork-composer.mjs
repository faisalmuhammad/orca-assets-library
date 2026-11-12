// Release-only compositions. The panel captures keep their native theme tokens.
// Bright orange/purple publication accents follow the requested release direction.
// These colors frame artwork; the shipped panel continues using Orca theme tokens.
export const artworkPalette = {purple: '#a855f7', orange: '#ff8a1f'};
export const artworkTheme = theme => ({...theme, artworkBg: theme.bg === '#fafafa' ? '#fffaf6' : '#282134', accent: theme.bg === '#fafafa' ? '#b94e00' : '#ffac58'});
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const text = (x, y, value, size, color, weight = 500, spacing = -.8) =>
  `<text x="${x}" y="${y}" font-family="Arial,Helvetica,sans-serif" font-size="${size}" font-weight="${weight}" letter-spacing="${spacing}" fill="${color}">${escape(value)}</text>`;
const image = (data, x, y, width, height) => `<image href="data:image/png;base64,${data.toString('base64')}" x="${x}" y="${y}" width="${width}" height="${height}"/>`;
const svg = (body, width = 1600, height = 1000) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
export const book = (x, y, size, color) => `<g transform="translate(${x} ${y}) scale(${size / 24})" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/><path d="M8 6h8M8 10h5"/></g>`;
const brand = (theme, x = 80, y = 76) => '<rect x="'+x+'" y="'+y+'" width="38" height="38" rx="10" fill="url(#tile-orange)"/>' + book(x+5,y+5,28,'#3b174f') + text(x+54,y+28,'Assets Library',24,theme.fg,700);

function background(theme, width = 1600, height = 1000) {
  const light=theme.bg==='#fafafa',bg=theme.artworkBg??theme.bg,cx=width*.77,cy=height*.5;
  return '<defs><radialGradient id="halo"><stop stop-color="'+artworkPalette.purple+'" stop-opacity="'+(light ? .12 : .28)+'"/><stop offset="1" stop-color="'+artworkPalette.purple+'" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="tile-orange" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffd08a"/><stop offset=".5" stop-color="'+artworkPalette.orange+'"/><stop offset="1" stop-color="#f5670a"/></linearGradient>' +
    '<linearGradient id="accent" x2="1" y2="1"><stop stop-color="'+artworkPalette.orange+'"/><stop offset="1" stop-color="'+artworkPalette.purple+'"/></linearGradient>' +
    '<linearGradient id="edge" x2="1" y2="1"><stop stop-color="'+artworkPalette.orange+'" stop-opacity=".4"/><stop offset="1" stop-color="'+artworkPalette.purple+'" stop-opacity=".4"/></linearGradient>' +
    '<filter id="shadow" x="-.4" y="-.3" width="1.8" height="1.8"><feDropShadow dx="0" dy="24" stdDeviation="28" flood-color="'+bg+'" flood-opacity="'+(light ? .22 : .65)+'"/></filter></defs>' +
    '<rect width="'+width+'" height="'+height+'" fill="'+bg+'"/><circle cx="'+cx+'" cy="'+cy+'" r="'+width*.42+'" fill="url(#halo)"/>' +
    '<g fill="none" stroke="'+artworkPalette.purple+'" stroke-opacity="'+(light ? .12 : .16)+'">'+[340,440,550].map((r,i)=>'<circle cx="'+cx+'" cy="'+cy+'" r="'+r*width/1600+'"'+(i===1?' stroke-dasharray="4 16"':'')+'/>').join('')+'</g>' +
    '<rect x="32" y="32" width="'+(width-64)+'" height="'+(height-64)+'" rx="24" fill="none" stroke="url(#edge)" stroke-opacity=".5"/>';
}

function pill(theme, label, x, y, width) {
  return `<rect x="${x}" y="${y}" width="${width}" height="40" rx="20" fill="${theme.bg}" fill-opacity=".45" stroke="${theme.accent}" stroke-opacity=".22"/>` +
    text(x + 18, y + 26, label, 16, theme.fg, 400, 0);
}

function panel(theme, capture, highlight = false) {
  // A 420 × 800 capture enlarged uniformly to 462 × 880. Never crop the UI.
  return `${highlight?'<rect x="1019" y="44" width="494" height="912" rx="32" fill="url(#accent)" filter="url(#shadow)"/>':''}<defs><clipPath id="panel-clip"><rect x="1035" y="60" width="462" height="880" rx="16"/></clipPath></defs>
    <rect x="1023" y="48" width="486" height="904" rx="28" fill="${theme.bg}" filter="url(#shadow)" stroke="url(#edge)"/>
    <g clip-path="url(#panel-clip)">${image(capture, 1035, 60, 462, 880)}</g>`;
}

export function screenshotArtwork(key, theme, capture) {
  theme = artworkTheme(theme);
  const copy = {
    dark: ['Generated in chat.', 'Found automatically.', 'New agent outputs appear as they are created.', 'AUTOMATIC DISCOVERY'],
    light: ['New worktree.', 'Known outputs, found.', 'Discover outputs from identifiable previous chats.', 'FOLLOWS YOUR WORKTREE'],
    list: ['Find the output.', 'Skip the file hunt.', 'Search automatically discovered files by name.', 'GENERATED ASSETS FIRST'],
    markdown: ['Documents, too.', 'Found with images.', 'Generated Markdown appears alongside images.', 'IMAGES AND MARKDOWN']
  }[key];
  return svg(background(theme) + brand(theme) +
    text(80, 258, copy[3], 15, theme.accent, 500, 2.2) +
    text(80, 372, copy[0], 76, theme.fg) +
    text(80, 462, copy[1], 76, theme.fg) +
    `<rect x="80" y="505" width="96" height="4" rx="2" fill="url(#accent)"/>` +
    text(80, 574, copy[2], 25, theme.muted, 400) +
    pill(theme, 'Current worktree', 80, 638, 172) + pill(theme, 'Private by default', 266, 638, 176) +
    text(80, 922, 'Orca sidebar plugin · Sample assets', 16, theme.muted, 400, 0) + panel(theme, capture));
}

export function coverArtwork(theme, capture) {
  theme = artworkTheme(theme);
  return svg(background(theme) + brand(theme) +
    text(80, 272, 'AUTOMATIC GENERATED ASSET DISCOVERY', 15, theme.accent, 500, 2.2) +
    text(80, 390, 'Assets Library', 90, theme.fg, 700, -2) +
    text(80, 490, 'Automatically discover', 32, theme.muted, 400) +
    text(80, 538, 'what your agents generate.', 32, theme.muted, 400) +
    `<rect x="80" y="590" width="96" height="4" rx="2" fill="url(#accent)"/>` +
    pill(theme, 'Automatic discovery', 80, 656, 205) + pill(theme, 'Current worktree', 300, 656, 172) +
    text(80, 748, 'Images, videos and Markdown.', 23, theme.fg, 400) +
    text(80, 787, 'New outputs, found as they appear.', 23, theme.muted, 400) +
    panel(theme, capture, true) +
    text(80, 922, 'Automatic discovery in Orca’s right sidebar.', 18, theme.muted, 400, 0));
}

export function socialArtwork(theme, capture) {
  theme = artworkTheme(theme);
  return svg(background(theme, 1280, 640) + brand(theme, 64, 56) +
    text(64, 216, 'AUTOMATIC GENERATED ASSET DISCOVERY', 13, theme.accent, 500, 1.8) +
    text(64, 316, 'Assets Library', 70, theme.fg, 700, -1.5) +
    text(64, 388, 'Discover what your agents generate.', 27, theme.muted, 400) +
    `<rect x="64" y="431" width="80" height="4" rx="2" fill="url(#accent)"/>` +
    text(64, 542, 'Images · Videos · Markdown', 20, theme.fg, 400, 0) +
    text(64, 578, 'Current worktree. Discovered automatically.', 17, theme.muted, 400, 0) +
    '<g transform="translate(290 20) scale(.6)">' + panel(theme, capture, true) + '</g>', 1280, 640);
}

export function iconArtwork(theme) {
  theme=artworkTheme(theme);
  return svg(background(theme,512,512)+'<rect x="34" y="34" width="444" height="444" rx="108" fill="url(#tile-orange)" stroke="#ffe2b9" stroke-opacity=".6"/>'+book(96,86,326,'#3b174f'),512,512);
}
