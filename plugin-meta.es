/*
   包名的唯一来源。代码里任何「自报家门」的地方都从这里取，不要再写字面量。

   背景（poi 12 源码，见 tmp/asar-out/）：

     lifecycle.js:85    extendReducer(plugin.packageName, plugin.reducer)
     create-store.js    _reducerExtensions[packageName] = reducer
     reducer-factory    combineReducers({_: func})
                        → state.ext[packageName] = {_: ...}
     base.js:121        extensionSelectorFactory(key) → state.ext[key]._

   也就是说，插件状态挂在哪个分区，完全由 package.json 的 `name` 决定，
   而插件侧没有任何 API 能拿到这个值 —— 只能自己读。

   本仓库是 `poi-plugin-navy-album` 的分叉，改名后散落的字面量只改了一部分，
   于是 selector 读的是另一个分区：界面用 initState 默认值渲染得很正常，
   点击写入的状态却永远读不回来，且不报任何错（最贵的一类 bug）。

   现在改名只需要改 package.json，这四处会自动跟随。
 */

import pkg from './package.json'

// 与 package.json 的 name 严格一致，用作 state.ext 的 key。
const PACKAGE_NAME = pkg.name

/*
   Redux 的 action 是广播给全 store 的，每个 reducer 都能看到所有 action。
   两个插件若用同一个 type 前缀，就会互相处理对方的 action
   （上游插件和本 fork 可以同时安装，前缀相同即为真实的串扰）。
   所以前缀同样跟着包名走。
 */
const ACTION_PREFIX = `@${pkg.name}`

/*
   上游包名。只用于 i18n 命名空间的兜底读取，不参与任何状态 key。
   本项目的语言包 key 之前一直写在上游命名空间下，留着它可以在
   "只装本 fork" 的情况下把老文案也读出来。
 */
const UPSTREAM_PACKAGE_NAME = 'poi-plugin-navy-album'

export {
  PACKAGE_NAME,
  ACTION_PREFIX,
  UPSTREAM_PACKAGE_NAME,
}
