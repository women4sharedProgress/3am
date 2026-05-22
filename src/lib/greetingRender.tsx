import type { ReactNode } from 'react'
import type { GreetingColor } from './greetingPrefs'

const PRIDE   = ['#E40303', '#FF8C00', '#FFED00', '#008026', '#004DFF', '#750787']
const AM_DARK = ['#CC0000', '#FFFFFF']
const AM_LITE = ['#CC0000', '#003F87']

const SOLID: Partial<Record<GreetingColor, string>> = {
  purple:  '#B597D5',
  bright:  '#C97FFF',
  green:   '#00B050',
  blue:    '#4A90C4',
  teal:    '#2A9080',
  red:     '#CC0000',
  navy:    '#002868',
  demblue: '#003F87',
  brown:   '#8B4513',
  yellow:  '#FFC000',
}

export function renderGreeting(text: string, color: GreetingColor, isDark: boolean): ReactNode {
  if (color === 'blackwhite') {
    return <span style={{ color: isDark ? '#FFFFFF' : '#111111' }}>{text}</span>
  }
  if (color in SOLID) {
    return <span style={{ color: SOLID[color] }}>{text}</span>
  }
  if (color === 'rainbow') {
    return (
      <span style={{
        background: 'linear-gradient(to bottom, #ff0000, #ff7700, #ffee00, #00cc00, #0055ff, #4b0082, #8800ee)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>
        {text}
      </span>
    )
  }
  if (color === 'merica') {
    return (
      <span style={{
        backgroundImage: 'linear-gradient(#002868, #002868), repeating-linear-gradient(180deg, #CC0000, #CC0000 7.69%, #FFFFFF 7.69%, #FFFFFF 15.38%)',
        backgroundSize: '40% 54%, 100% 100%',
        backgroundPosition: '0 0, 0 0',
        backgroundRepeat: 'no-repeat, no-repeat',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        WebkitTextStroke: '1px #000000',
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
