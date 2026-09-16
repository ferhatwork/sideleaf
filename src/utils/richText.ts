import { ItemFormatting } from '../types';

const allowedTags = new Set([
  'B',
  'STRONG',
  'I',
  'EM',
  'U',
  'S',
  'BR',
  'P',
  'DIV',
  'SPAN',
  'UL',
  'OL',
  'LI',
  'FONT',
]);

const allowedFontNames = new Set(['arial', 'georgia', 'courier new', 'verdana', 'inter']);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeColor(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^#[0-9a-f]{3,8}$/i.test(trimmed)) return trimmed;
  if (/^(rgb|rgba|hsl|hsla)\([\d\s.,%+-]+\)$/i.test(trimmed)) return trimmed;
  if (/^[a-z]{1,24}$/i.test(trimmed)) return trimmed;
  return null;
}

function safeFont(value: string | null): string | null {
  if (!value) return null;
  const firstFamily = value.split(',')[0].trim().replace(/^['"]|['"]$/g, '').toLowerCase();
  return allowedFontNames.has(firstFamily) ? firstFamily : null;
}

function sanitizeElement(element: HTMLElement): void {
  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType !== Node.ELEMENT_NODE) continue;

    const childElement = child as HTMLElement;
    if (!allowedTags.has(childElement.tagName)) {
      const textNode = document.createTextNode(childElement.textContent || '');
      childElement.replaceWith(textNode);
      continue;
    }

    if (childElement.tagName === 'FONT') {
      const replacement = document.createElement('span');
      const color = safeColor(childElement.getAttribute('color'));
      const font = safeFont(childElement.getAttribute('face'));
      if (color) replacement.style.color = color;
      if (font) replacement.style.fontFamily = font;
      while (childElement.firstChild) replacement.appendChild(childElement.firstChild);
      childElement.replaceWith(replacement);
      sanitizeElement(element);
      continue;
    }

    for (const attribute of Array.from(childElement.attributes)) {
      if (attribute.name !== 'style') childElement.removeAttribute(attribute.name);
    }

    const style = childElement.getAttribute('style');
    childElement.removeAttribute('style');
    if (style) {
      const parsedStyle = document.createElement('span');
      parsedStyle.setAttribute('style', style);
      const color = safeColor(parsedStyle.style.color);
      const font = safeFont(parsedStyle.style.fontFamily);
      const declarations: string[] = [];
      if (color) declarations.push(`color:${color}`);
      if (font) declarations.push(`font-family:${font}`);
      if (parsedStyle.style.fontWeight === 'bold' || parsedStyle.style.fontWeight === '700') {
        declarations.push('font-weight:700');
      }
      if (parsedStyle.style.fontStyle === 'italic') declarations.push('font-style:italic');
      if (parsedStyle.style.textDecoration.includes('underline')) {
        declarations.push('text-decoration:underline');
      }
      if (declarations.length > 0) childElement.setAttribute('style', declarations.join(';'));
    }

    sanitizeElement(childElement);
  }
}

/** Removes scripts, links and unsafe attributes while keeping editor formatting. */
export function sanitizeRichText(html: string): string {
  if (!html) return '';
  if (typeof document === 'undefined') return escapeHtml(html.replace(/<[^>]*>/g, ''));

  const container = document.createElement('div');
  container.innerHTML = html;
  sanitizeElement(container);
  return container.innerHTML;
}

export function richTextToPlainText(html: string): string {
  if (!html || typeof document === 'undefined') return html.replace(/<[^>]*>/g, '').trim();

  const container = document.createElement('div');
  container.innerHTML = sanitizeRichText(html);

  const readNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const element = node as HTMLElement;
    if (element.tagName === 'BR') return '\n';
    const value = Array.from(element.childNodes).map(readNode).join('');
    if (['DIV', 'P', 'LI'].includes(element.tagName) && value && !value.endsWith('\n')) {
      return `${value}\n`;
    }
    return value;
  };

  return readNode(container)
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function legacyStyle(formatting?: ItemFormatting): string {
  if (!formatting) return '';
  const declarations: string[] = [];
  if (formatting.bold) declarations.push('font-weight:700');
  if (formatting.italic) declarations.push('font-style:italic');
  if (safeColor(formatting.color || null)) declarations.push(`color:${formatting.color}`);
  if (formatting.fontFamily === 'serif') declarations.push('font-family:georgia');
  if (formatting.fontFamily === 'mono') declarations.push('font-family:courier new');
  return declarations.join(';');
}

/** Converts legacy plain notes into an editable HTML representation. */
export function plainTextToRichHtml(
  text: string,
  formatting?: ItemFormatting,
  autoList = false
): string {
  const lines = text.split(/\r?\n/);
  const listStyle = formatting?.listStyle || (autoList && lines.length > 1 ? 'bullet' : 'none');
  const style = legacyStyle(formatting);

  if (listStyle === 'bullet' || listStyle === 'numbered') {
    const tag = listStyle === 'bullet' ? 'ul' : 'ol';
    const items = lines
      .filter((line) => line.trim())
      .map((line) => `<li>${escapeHtml(line)}</li>`)
      .join('');
    return `<${tag}${style ? ` style="${style}"` : ''}>${items}</${tag}>`;
  }

  const body = lines.map((line) => escapeHtml(line)).join('<br>');
  return style ? `<span style="${style}">${body}</span>` : body;
}
