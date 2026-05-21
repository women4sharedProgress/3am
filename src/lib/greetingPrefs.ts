export type GreetingWord =
  | 'none' | 'hello' | 'greetings' | 'welcome'
  | 'all hail' | 'be well' | 'name only'

export type GreetingColor = 'default' | 'rainbow' | 'pride' | 'america'

export interface GreetingPrefs {
  word:  GreetingWord
  color: GreetingColor
}

export const DEFAULT_GREETING: GreetingPrefs = { word: 'hello', color: 'default' }
export const GREETING_STORAGE_KEY = 'wsp-greeting-prefs'

export const GREETING_WORDS: { value: GreetingWord; label: string }[] = [
  { value: 'none',      label: 'None' },
  { value: 'hello',     label: 'Hello' },
  { value: 'greetings', label: 'Greetings' },
  { value: 'welcome',   label: 'Welcome' },
  { value: 'all hail',  label: 'All Hail' },
  { value: 'be well',   label: 'Be Well' },
  { value: 'name only', label: 'Name only' },
]

export const GREETING_COLORS: { value: GreetingColor; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'rainbow', label: 'Rainbow' },
  { value: 'pride',   label: 'Pride'   },
  { value: 'america', label: 'America' },
]

export function buildGreetingText(word: GreetingWord, username: string): string | null {
  if (word === 'none') return null
  if (word === 'name only') return username
  const label =
    word === 'all hail' ? 'All Hail' :
    word === 'be well'  ? 'Be Well'  :
    word.charAt(0).toUpperCase() + word.slice(1)
  return `${label}, ${username}`
}
