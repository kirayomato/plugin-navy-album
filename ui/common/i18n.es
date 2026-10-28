/*
  本题材（navy-album）的文案放在 `window.i18n` 下，命名空间由 poi 决定：
  `readPlugin` 里 `namespace = plugin.id`，而 `plugin.id` 默认取 package.json
  的 `name`，即 `poi-plugin-navy-album-kai`。

  本项目是从 `poi-plugin-navy-album` 分叉而来，历史上一直读的是上游命名空间。
  两个插件同时安装时，上游的命名空间确实存在，于是老文案会命中，但本项目新增
  的键（如 `SimplifyNames`）在上游包里没有 —— i18next 查不到就原样返回键名，
  按钮上便显示成 "SimplifyNames"。

  所以这里优先用本项目自己的命名空间，上游命名空间只作兜底（万一将来改名，
  老文案至少还能显示出来）。
 */
import { PACKAGE_NAME, UPSTREAM_PACKAGE_NAME } from '../../plugin-meta'

const NAMESPACES = [
  PACKAGE_NAME,
  UPSTREAM_PACKAGE_NAME,
]

const build = () => {
  const available = NAMESPACES
    .map(ns => window.i18n && window.i18n[ns])
    .filter(x => x && typeof x.__ === 'function')

  // 逐级兜底：某个命名空间没有该键时 i18next 会返回键名本身，此时试下一个
  const __ = (key, ...args) => {
    for (const {__: translate} of available) {
      const translated = translate(key, ...args)
      if (translated !== key) return translated
    }
    return key
  }

  return {__}
}

const getI18n = () => build()

export { getI18n }
