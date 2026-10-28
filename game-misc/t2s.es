/*
   Converting names of ships / equips to Simplified Chinese.

   KanColle master data carries names as Japanese text, in which
   traditional Chinese characters and Japanese Shinjitai characters
   are mixed:

   - "陸奥", "飛龍": traditional characters
   - "戦艦", "駆逐", "図鑑": Japanese Shinjitai

   so converting a name for a Simplified Chinese reader has to be done
   in two stages: Shinjitai to traditional, then traditional to
   simplified (a plain traditional-to-simplified pass leaves
   "戦" / "駆" / "図" untouched).
 */

const supplementaryDict = [
  /*
     "闘" is turned into "鬭" by the first stage, which is not the
     simplified form we want.
   */
  ['闘', '斗'],
  ['鬭', '斗'],

  /*
     characters that only exist in Japanese, so OpenCC dictionaries
     have no simplified form for them.
   */
  ['姫', '姬'],
  ['衞', '卫'],
  ['砲', '炮'],
]

const identity = str => str

/*
   The converter is built lazily: constructing it costs some time and
   most users never turn this feature on. Should opencc-js be
   unavailable, names are left as they are instead of breaking the
   whole album.
 */
let converter = null
const getConverter = () => {
  if (converter === null) {
    try {
      // eslint-disable-next-line global-require
      const OpenCC = require('opencc-js')
      converter = OpenCC.ConverterFactory(
        OpenCC.Locale.from.jp,
        OpenCC.Locale.to.cn,
        [supplementaryDict]
      )
    } catch (e) {
      console.error('failed to initialize the name converter', e)
      converter = identity
    }
  }
  return converter
}

/*
   names are converted over and over again (re-render, filtering),
   while the number of distinct names stays in the same order of
   magnitude as the number of ships and equips, so caching pays off.
 */
const cache = new Map()
const cacheLimit = 10000

/*
   Converts traditional characters (and Japanese Shinjitai) of `str` to
   Simplified Chinese. Anything else - kana, latin characters, digits -
   is kept as is, and so is the input when it is not a non-empty string.
 */
const toSimplified = str => {
  if (typeof str !== 'string' || str === '')
    return str
  const cached = cache.get(str)
  if (cached !== undefined)
    return cached
  if (cache.size >= cacheLimit)
    cache.clear()
  const simplified = getConverter()(str)
  cache.set(str, simplified)
  return simplified
}

// convenience wrapper for the common "only when enabled" case
const simplifyIf = (enabled, str) => enabled ? toSimplified(str) : str

export {
  toSimplified,
  simplifyIf,
}
