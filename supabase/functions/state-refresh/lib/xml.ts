/**
 * Shared XML reader — tiny, no dependencies.
 *
 * Good enough for the flat, predictable XML that state web services return
 * (WA's wslwebservices, and other SOAP/ASMX-style feeds). Not a full parser:
 * no attributes, no namespaces-aware lookups. If a state's XML is deeply
 * nested or messy, use a real parser for that state instead.
 */

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

export function decode(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return Number.isFinite(n) ? String.fromCodePoint(n) : m
    }
    return ENTITIES[e.toLowerCase()] ?? m
  })
}

/** Every <name>...</name> block (outer content), in order. */
export function blocks(xml: string, name: string): string[] {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'g')
  return [...xml.matchAll(re)].map(m => m[1])
}

/**
 * Text of the first <name>text</name> that holds plain text (no child tags).
 * Self-closing / empty / missing → null.
 */
export function text(xml: string, name: string): string | null {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([^<]*)</${name}>`))
  if (!m) return null
  const v = decode(m[1]).trim()
  return v === '' ? null : v
}

/** Remove a child block so its fields don't shadow same-named parent fields. */
export function without(xml: string, name: string): string {
  return xml.replace(new RegExp(`<${name}(?:\\s[^>]*)?>[\\s\\S]*?</${name}>|<${name}\\s*/>`, 'g'), '')
}
