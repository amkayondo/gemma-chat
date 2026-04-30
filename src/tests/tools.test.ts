import { describe, it, expect } from 'vitest'
import { cleanFileContent, findNextAction, emitSafeBoundary } from '../main/tools'

describe('cleanFileContent', () => {
  it('strips fully wrapped markdown fences', () => {
    const raw = '```html\n<p>Hello</p>\n```'
    expect(cleanFileContent(raw, 'index.html')).toBe('<p>Hello</p>')
  })

  it('strips leading fence only', () => {
    const raw = '```js\nconsole.log("hi")\n'
    expect(cleanFileContent(raw, 'app.js')).toBe('console.log("hi")\n')
  })

  it('strips leading fence and trailing fence', () => {
    const raw = '```js\nconsole.log("hi")\n```\n'
    expect(cleanFileContent(raw, 'app.js')).toBe('console.log("hi")')
  })

  it('returns plain text unchanged', () => {
    const raw = 'const x = 1\n'
    expect(cleanFileContent(raw, 'app.js')).toBe('const x = 1\n')
  })

  it('truncates html after </html>', () => {
    const raw = '<html><body>hi</body></html>\nextra commentary here'
    const result = cleanFileContent(raw, 'index.html')
    expect(result).toBe('<html><body>hi</body></html>\n')
    expect(result).not.toContain('extra commentary')
  })

  it('truncates svg after </svg>', () => {
    const raw = '<svg><circle/></svg>\nsome extra text'
    const result = cleanFileContent(raw, 'icon.svg')
    expect(result).toBe('<svg><circle/></svg>\n')
  })

  it('truncates json after trailing brace', () => {
    const raw = '{ "key": "value" }\n\nSome explanation'
    const result = cleanFileContent(raw, 'data.json')
    expect(result).toBe('{ "key": "value" }\n')
  })

  it('handles json with trailing bracket', () => {
    const raw = '[1, 2, 3]\nsome text'
    const result = cleanFileContent(raw, 'data.json')
    expect(result).toBe('[1, 2, 3]\n')
  })
})

describe('findNextAction', () => {
  it('returns null when no action in text', () => {
    expect(findNextAction('hello world', 0)).toBeNull()
  })

  it('returns incomplete when action tag is not closed', () => {
    const text = 'before <action name="calc"><expression>2+2</expression>'
    expect(findNextAction(text, 0)).toBe('incomplete')
  })

  it('parses a simple action with numeric arg', () => {
    const text = '<action name="calc"><expression>2 + 2</expression></action>'
    const result = findNextAction(text, 0)
    expect(result).not.toBeNull()
    expect(result).not.toBe('incomplete')
    if (result && result !== 'incomplete') {
      expect(result.name).toBe('calc')
      expect(result.args.expression).toBe('2 + 2')
      expect(result.start).toBe(0)
      expect(result.end).toBe(text.length)
    }
  })

  it('parses an action with string arg', () => {
    const text = '<action name="web_search"><query>vitest docs</query></action>'
    const result = findNextAction(text, 0)
    expect(result).not.toBeNull()
    expect(result).not.toBe('incomplete')
    if (result && result !== 'incomplete') {
      expect(result.name).toBe('web_search')
      expect(result.args.query).toBe('vitest docs')
    }
  })

  it('parses an action with boolean true arg', () => {
    const text =
      '<action name="edit_file"><path>f.js</path><replace_all>true</replace_all></action>'
    const result = findNextAction(text, 0)
    if (result && result !== 'incomplete') {
      expect(result.args.replace_all).toBe(true)
    }
  })

  it('parses content block correctly', () => {
    const text =
      '<action name="write_file"><path>a.txt</path><content>\nhello\n</content></action>'
    const result = findNextAction(text, 0)
    if (result && result !== 'incomplete') {
      expect(result.args.path).toBe('a.txt')
      expect(result.args.content).toBe('hello')
    }
  })

  it('skips text before action start', () => {
    const text = 'Some intro text. <action name="calc"><expression>1+1</expression></action>'
    const result = findNextAction(text, 0)
    if (result && result !== 'incomplete') {
      expect(result.start).toBeGreaterThan(0)
      expect(result.name).toBe('calc')
    }
  })

  it('respects the from offset', () => {
    const text = '<action name="calc"><expression>1</expression></action> then <action name="calc"><expression>2</expression></action>'
    const first = findNextAction(text, 0)
    if (first && first !== 'incomplete') {
      const second = findNextAction(text, first.end)
      if (second && second !== 'incomplete') {
        expect(second.args.expression).toBe(2)
      }
    }
  })

  it('handles case-insensitive action tag', () => {
    const text = '<ACTION name="calc"><expression>5</expression></ACTION>'
    const result = findNextAction(text, 0)
    if (result && result !== 'incomplete') {
      expect(result.name).toBe('calc')
    }
  })
})

describe('emitSafeBoundary', () => {
  it('returns buffer.length when no action-like text present', () => {
    const buf = 'Hello, world!'
    expect(emitSafeBoundary(buf, 0)).toBe(buf.length)
  })

  it('holds back at a < that could start <action', () => {
    const buf = 'some text <act'
    const result = emitSafeBoundary(buf, 0)
    expect(result).toBe(buf.indexOf('<'))
  })

  it('holds back when buffer ends with partial <action ...>', () => {
    const buf = 'some text <action '
    const result = emitSafeBoundary(buf, 0)
    expect(result).toBe(buf.indexOf('<'))
  })

  it('does not hold back for other tags like <br>', () => {
    const buf = 'some text <br> more text'
    const result = emitSafeBoundary(buf, 0)
    expect(result).toBe(buf.length)
  })

  it('returns from when buffer equals from', () => {
    expect(emitSafeBoundary('abc', 3)).toBe(3)
  })

  it('respects the from offset', () => {
    const buf = 'done <action name="x"><y>z</y></action>'
    // After the action has been consumed (from = buf.length), nothing to hold back
    expect(emitSafeBoundary(buf, buf.length)).toBe(buf.length)
  })
})
