import type { ReactNode } from 'react'
import type { GreetingColor } from './greetingPrefs'

const PRIDE   = ['#E40303', '#FF8C00', '#FFED00', '#008026', '#004DFF', '#750787']
const AM_DARK = ['#CC0000', '#FFFFFF', '#003F87']
const AM_LITE = ['#CC0000', '#003F87']

export function renderGreeting(text: string, color: GreetingColor, isDark: boolean): ReactNode {
  if (color === 'rainbow') {
    return (
      <span style={{
        background: 'linear-gradient(to right, #ff0000, #ff7700, #ffee00, #00cc00, #0055ff, #8800ee)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>
        {text}
      </span>
    )
  }
  if (color === 'pride' || color === 'america') {
    const palette = color === 'pride' ? PRIDE : (isDark ? AM_DARK : AM_LITE)
    let idx = 0
    return text.split('').map((ch, i) =>
      ch === ' '
        ? <span key={i}> </span>
        : <span key={i} style={{ color: palette[idx++ % palette.length] }}>{ch}</span>
    )
  }
  return text
}
