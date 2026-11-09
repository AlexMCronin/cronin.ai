// Menu and search for cronin.ai. Plain JavaScript, no libraries.
// The menu and search panels open and close on their own (HTML "popover"); this file adds three things.

// 1. Close a panel when one of its links is clicked (links to a section on the same page don't reload it).
document.querySelectorAll('.overlay a').forEach(a => a.addEventListener('click', () => a.closest('.overlay').hidePopover()));

// 2. Search. The first time someone types, read the site's pages, then match the words typed against their text.
//    To make a new page searchable, add its address here.
const PAGES = ['/', '/hardware-nation/', '/nanites/'];
const input = document.querySelector('.search-input');
const results = document.querySelector('.search-results');
const clean = s => s.replace(/\s+/g, ' ').trim();
let loading = null;

async function readPages() {
  const items = [];
  for (const url of PAGES) {
    const doc = new DOMParser().parseFromString(await (await fetch(url)).text(), 'text/html');
    const page = doc.querySelector('.title') ? clean(doc.querySelector('.title').textContent) : 'Home';
    doc.querySelectorAll('main :is(h2, h3, p, figcaption, blockquote), main li:not(:has(p))').forEach(el => {
      const text = clean(el.textContent);
      if (text.length > 1) items.push({ url, page, text });
    });
  }
  return items;
}

function message(text) {
  results.innerHTML = '';
  const li = document.createElement('li');
  li.className = 'search-none';
  li.textContent = text;
  results.append(li);
}

function show(items, query) {
  results.innerHTML = '';
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  if (!words.length) return;
  const hits = items.filter(i => words.every(w => i.text.toLowerCase().includes(w))).slice(0, 8);
  if (!hits.length) return message('No results');
  const pattern = new RegExp('(' + words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'gi');
  for (const hit of hits) {
    // A short piece of text around the first match, with the matched words in bold.
    const at = Math.max(0, hit.text.toLowerCase().indexOf(words[0]) - 60);
    const start = at > 0 ? hit.text.indexOf(' ', at) + 1 : 0;
    const snippet = (start > 0 ? '… ' : '') + hit.text.slice(start, start + 180) + (start + 180 < hit.text.length ? ' …' : '');
    const a = document.createElement('a');
    // Opening the link scrolls to the matching text (browsers that don't support this open the top of the page).
    a.href = hit.url + '#:~:text=' + encodeURIComponent(hit.text.split(' ').slice(0, 8).join(' ')).replace(/-/g, '%2D');
    const label = document.createElement('span');
    label.className = 'search-page';
    label.textContent = hit.page;
    a.append(label);
    snippet.split(pattern).forEach((part, n) => a.append(n % 2 ? Object.assign(document.createElement('mark'), { textContent: part }) : part));
    if (hit.url === location.pathname) {
      // Same page: scroll straight to it.
      a.addEventListener('click', e => {
        const el = [...document.querySelectorAll('main *')].find(x => clean(x.textContent) === hit.text);
        if (!el) return;
        e.preventDefault();
        document.getElementById('search').hidePopover();
        el.scrollIntoView({ block: 'center' });
      });
    }
    const li = document.createElement('li');
    li.append(a);
    results.append(li);
  }
}

if (input) {
  input.addEventListener('input', async () => {
    loading = loading || readPages();
    try { show(await loading, input.value); } catch { loading = null; message('Search is not available right now.'); }
  });
}

// 3. The grey top bar fades to white as it moves over the grey footer, so it doesn't blend in (Gates Notes does the same with its dark bar).
//    The fade follows the scroll: it starts just before the bar reaches the footer and is complete once the bar is fully over it.
const bar = document.querySelector('header.bar');
const footerPanel = document.querySelector('.footer-panel');
if (bar && footerPanel) {
  const FADE = 120; // pixels of scrolling the fade takes
  let queued = false;
  const update = () => {
    queued = false;
    const b = bar.getBoundingClientRect(), f = footerPanel.getBoundingClientRect();
    const clamp = x => Math.min(1, Math.max(0, x));
    const t = Math.min(clamp((b.bottom + 72 - f.top) / FADE), clamp((f.bottom - b.top) / FADE));
    // From the usual frosted grey, rgba(245, 245, 245, 0.82), to white, rgba(255, 255, 255, 0.92).
    const c = Math.round(245 + 10 * t);
    bar.style.backgroundColor = t > 0 ? `rgba(${c}, ${c}, ${c}, ${(0.82 + 0.1 * t).toFixed(3)})` : '';
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  update();
}
