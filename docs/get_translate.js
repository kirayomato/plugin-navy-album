/*
 * get_translate.js — runnable demo of JP -> Simplified Chinese conversion.
 *
 * Run it directly with node from the plugin root:
 *
 *     node docs/get_translate.js
 *
 * It loads the plugin's real converter (game-misc/t2s.es) and compares it
 * against the two raw opencc-js locales (jp->tw, jp->cn) for the same word.
 *
 * Why the @babel/register bootstrap:
 *   - game-misc/t2s.es is written in ES-module syntax (export {}), which
 *     plain node cannot require without transpilation.
 *   - the repo's .babelrc references the removed @babel/preset-stage-0
 *     (Babel 7 deleted it), so we deliberately bypass it (babelrc:false,
 *     configFile:false) and use only @babel/preset-env.
 */

// @babel/register only transpiles files inside its `cwd`. The script can be
// launched from anywhere, but t2s.es lives in <plugin root>/game-misc, so we
// pin `cwd` to the plugin root (<docs>/..) to keep it in scope regardless of
// where `node` is invoked from.
// Run Method
// node docs/get_translate.js

const path = require('path')
require('@babel/register')({
  cwd: path.resolve(__dirname, '..'),
  babelrc: false,
  configFile: false,
  presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
  extensions: ['.es', '.js'],
})

const { toSimplified } = require('../game-misc/t2s.es')
const OpenCC = require('opencc-js')

const toTw = OpenCC.ConverterFactory(OpenCC.Locale.from.jp, OpenCC.Locale.to.tw)
const toCN = OpenCC.ConverterFactory(OpenCC.Locale.from.jp, OpenCC.Locale.to.cn)

const word = '機銃'
console.log('TW          :', toTw(word))
console.log('CN (bare)   :', toCN(word))
console.log('toSimplified:', toSimplified(word))
