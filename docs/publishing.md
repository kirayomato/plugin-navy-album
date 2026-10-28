# 发布到 npm（让 poi 能在线安装）

本文档记录发布这个 fork 前必须知道的约束，以及发布/验证的完整流程。
结论性信息都来自 poi 源码与 npm registry 实测（2026-10）。

## 一、硬约束

1. **不能叫 `poi-plugin-navy-album`**
   registry 上这个名字属于 poi 团队（maintainers: letspoi、javran 等），最新版就是 1.7.21。
   用同名 `npm publish` 会直接 403（`You do not have permission to publish`）。

2. **名字必须以 `poi-plugin-` 开头**
   poi 的「从 npm 直接安装」输入框会用 `npm-package-arg` 解析并校验
   `/^poi-plugin-.+$/`（`views/components/settings/plugin/name-input.tsx`），
   不符合就禁用安装按钮。

3. **不能用 scoped 名（`@you/poi-plugin-xxx`）**
   虽然上面的校验允许 scoped，但 poi 枚举已装插件用的是
   `glob(join(PLUGIN_PATH, 'node_modules', 'poi-plugin-*'))`
   （`views/services/plugin-manager/index.ts`），只扫一层目录。
   scoped 包会落在 `node_modules/@you/poi-plugin-xxx`，**装了也不会被加载**。
   → 只能用不带 scope 的独立包名。

4. **首次发布前必须 `npm install`**
   繁简转换依赖 `opencc-js`，代码里对它做了懒加载 + 失败降级：
   依赖缺失时插件照常工作，但转换会静默失效。发布前请确保
   `node_modules/opencc-js` 存在且 `npm test` 通过。

5. **`poiPlugin.apiVer` 要覆盖目标 poi 版本**
   poi 会按这个映射判断插件 API 兼容性，新增 poi 版本支持时记得补。

已确认可用（2026-10 查询，均 404）：
`poi-plugin-navy-album-cn`、`-zh`、`-plus`、`-simplified`、`-zhcn`。

## 二、元信息改哪里（包名 / 显示名 / 作者 / 描述 / 图标）

poi 侧的解析全部集中在 `views/services/plugin-manager/read-plugin.js`
（poi 12.0.1 实测，字段优先级就是下面这几行的原样抄写）。
下文 poi 侧路径都按已编译的 `resources/app.asar` 记（`.js`），
在 GitHub 上一一对应到同名 `.ts` / `.tsx`。

| 展示项 | 取值来源（按优先级） | 备注 |
| --- | --- | --- |
| 包名 / 目录名 | `package.json` → `name` | 必须匹配 `/poi-plugin-.+/`，否则 `readPlugin` 直接 throw，插件显示为 BROKEN |
| 插件 `id` | `poiPlugin.id` → `name` | **决定 i18n 命名空间**和配置键 `plugin.<id>.enable`，见 2.6 |
| 列表显示名 | `poiPlugin.name` → `poiPlugin.title` → `name` | 取出后还会过一遍 `i18next.t("${id}:${该值}")`，所以实际写的是 i18n key |
| 描述 | `poiPlugin.description` → `description` | 同上，经 i18n 转译，最终用 `react-remarkable` 渲染，**支持 markdown** |
| 作者名 | `author`（字符串直接用；对象取 `.name`） | 缺省 `'unknown'` |
| 作者链接 | `author.links` → `author.url` → 内置 `plugin.json` 的 `link` → `https://github.com/poooi` | 注意是 **`links`（复数）**，写错就静默落到下一档 |
| 图标 | `poiPlugin.icon` | fontawesome name（如 `th-list`），也接受数组 |
| 排序 | `poiPlugin.priority` | 缺省 `10000`，**数字小的排前面** |

设置页插件条目里显示成 `<a href={plugin.link}>作者名</a>`（`views/components/settings/plugin/plugin-item.js`），
所以作者名和链接是拆开取的两个字段，一个写错不会连累另一个。

### 2.1 改包名（npm 包名 = 插件目录名 = 默认 id）

只需改 `package.json` 的 `name`，其余字段不受影响：

```json
"name": "poi-plugin-navy-album-kai"
```

改完注意三件事：
- 老用户已经装过的旧包不会自动变成新包，是新装一个、旧目录仍在（`node_modules/` 下按包名分目录）。
- `p-state` 存档路径写死为 `APPDATA/navy-album`，与包名无关，改名不会丢设置。
- 包名同时也是 i18n 命名空间来源，见 2.6 —— 这是改名唯一容易漏的地方。

### 2.2 改显示名（多语言）

poi 里显示的名字是 `poiPlugin.title` 所指的 i18n key（当前是 `Package.Name`），
真实文案在 `assets/i18n/<locale>.json` 的 `Package.Name` 里：

```json
{ "Package": { "Name": "海色相簿改", "Desc": "舰娘与装备资料库" } }
```

现有 5 个 locale 的值：zh-CN `海色相簿改`、zh-TW `海色相簿`、ja-JP `艦隊図鑑`、
en-US / ko-KR `Navy Album`。想改名字就改这 5 个文件。

poi 的 i18next 配置是 `fallbackLng: false`（`views/env-parts/i18next.js`），
**缺 key 不会回退到英文**，界面上会直接把 `Package.Name` 这样的原始 key 暴露出来。
所以 5 个 locale 要么都写，要么别删 key。

> 说明：`poiPlugin.title` 的值本身只是「key 名」，不是文案。
> 改文案改 json；除非你想换一套 key 体系，否则 `package.json` 不用动。

### 2.3 改描述

`poiPlugin.description` 指向 `Package.Desc`，文案同样在 5 个 `assets/i18n/*.json` 里。
描述是当 markdown 渲染的（`react-remarkable`，链接自动 `target=_blank`），
可以写行内代码、链接、列表，但别写太长 —— 设置页那一栏会撑高。

`package.json` 顶层的 `description` 是另一码事：只有当 `poiPlugin.description`
不存在时 poi 才会用它，所以它实际只影响 npm 包页面的介绍语，可以顺手改掉。

### 2.4 改作者名 / 作者链接

```json
"author": {
  "name": "你的名字",
  "url": "https://github.com/你"
},
"contributors": [
  { "name": "Javran", "link": "https://github.com/Javran" },
  { "name": "Dazzy Ding", "link": "https://github.com/yukixz" }
]
```

几个坑：

- **`author` 是对象时只读 `.name`**，邮箱在 poi 界面里不显示（npm 页面会显示）。
  写成字符串 `"Your Name <you@example.com>"` 也行，但那样整串会被当成作者名显示，
  而且链接会退回内置 `plugin.json`（没有就 `https://github.com/poooi`），不如写成对象。
- **键名是 `links` 不是 `link`**：poi 先读 `author.links`，再读 `author.url`。
  当前用的是 `url`，能用；但如果你手动改成 `link`，链接会静默消失。
- **`contributors` poi 完全不读**，只对 npm 页面 / GitHub 有意义。
  但 fork 建议保留上游署名：`LICENSE` 是 MIT，版权声明必须保留，改 `author` 不等于可以改 LICENSE。
- 发布后 `npm view <包名> author maintainers` 可以核对 npm 侧读到的值，
  但注意 **npm 的 `maintainers` 是账号体系，与 `package.json` 的 `author` 无关**，
  别人看到「作者是你」靠的是 `author` 字段。

### 2.5 图标与排序

```json
"poiPlugin": {
  "icon": "th-list",
  "priority": 51
}
```

`icon` 是 fontawesome 的 name（`"fa/th-list"` 这种带前缀的写法也兼容，取 `/` 后半段）。
`priority` 越小越靠前，51 是上游原值，会被一堆内置插件夹在中间；想让自己的 fork 更显眼可以调到 10 左右。

### 2.6 ⚠️ 改名最容易漏的一处：i18n 命名空间

poi 给插件注册 i18n 时，命名空间取的是 **`plugin.id`**：

```js
// views/services/plugin-manager/plugin-i18n.js
const namespace = plugin.id
```

而 `id` 默认就是包名（`poiPlugin.id ?? packageName`）。同时插件代码里写的是：

```js
const {__} = window.i18n["poi-plugin-navy-album"]
```

这两者在**包名被改成 `poi-plugin-navy-album-kai` 之后就对不上了**：
poi 注册的是 `window.i18n["poi-plugin-navy-album-kai"]`，代码却去取老命名空间。

为什么现在没炸：机器上同时装着上游 `poi-plugin-navy-album`，
是它注册了 `poi-plugin-navy-album` 这个命名空间，本 fork 一直在蹭。
**只要用户只装本 fork**，`window.i18n["poi-plugin-navy-album"]` 就是 `undefined`，
`const {__} = undefined` 立刻 `TypeError`，整块 UI 白屏。

现存的硬编码点：`ui/` 下 **16 个文件、20 处**，形如 `window.i18n["poi-plugin-navy-album"]`。

修法（推荐 A）：

**A. 把命名空间改成与包名一致**。在仓库根目录跑（Windows PowerShell）：

```powershell
Get-ChildItem -Path .\ui -Recurse -Filter *.es | ForEach-Object {
  $c = Get-Content -LiteralPath $_.FullName -Raw
  $n = $c -replace 'window\.i18n\["poi-plugin-navy-album"\]', 'window.i18n["poi-plugin-navy-album-kai"]'
  if ($n -ne $c) { Set-Content -LiteralPath $_.FullName -Value $n -NoNewline -Encoding utf8 }
}

# 校验：应输出 0
(Get-ChildItem -Path .\ui -Recurse -Filter *.es |
  Select-String -SimpleMatch 'window.i18n["poi-plugin-navy-album"]' | Measure-Object).Count
```

跑完 `git diff --stat` 应该是 16 个文件。改的是**纯字符串**，不涉及逻辑，`npm test` 不受影响。

**B. 让新包沿用老命名空间**：在 `package.json` 的 `poiPlugin` 里加 `"id": "poi-plugin-navy-album"`。
不推荐 —— `id` 同时是配置键 `plugin.<id>.enable` 的来源，两个插件会抢同一个启用开关；
而且两边都往同一个命名空间 `addResourceBundle`（带 `overwrite`），后加载的会盖掉前一个。

### 2.7 改名不影响的东西（已核对）

- **存档**：`p-state/index.es` 里写死 `join(APPDATA_PATH, 'navy-album')`，与包名无关。
- **依赖与打包**：`files` 白名单、`dependencies`、`apiVer` 都与名字无关。
- **IPC**：`ipc.es` 里写死 `ipc.register('NavyAlbum', ...)`，不拼包名，
  所以改名不用动它。但也别指望它隔离：poi 的 `lib/ipc.js` 按 `scope` 合并注册，
  两个插件同时装会共用 `NavyAlbum` 这个 scope（同名 key 后者覆盖前者），
  且一方的 `unregisterAll('NavyAlbum')` 会把另一方的一起清掉。
  想让两个 fork 真正并存，就把 scope 也改成自己的名字（改完要同步改取用方）。

### 2.8 改完怎么自测

改名的回归点只有「单独安装能不能跑」，所以别在有上游的机器上直接试：

1. 把 `poi/plugins/node_modules/poi-plugin-navy-album` 临时改名（或移走），只留本 fork；
2. 重启 poi，打开设置 → 插件，确认：条目名字是 `Package.Name` 的译文而不是 `Package.Name` 原文；
   作者名与链接正确；点开面板不报 `TypeError`；
3. 恢复上游目录。

控制台里出现 `Cannot destructure property '__' of 'window.i18n[...]' as it is undefined`
就是 2.6 没修。

## 三、仓库侧已备好的东西

- `package.json` 的 `files` 白名单：只发布运行所需文件
  （`index.es`、`ipc.es`、`ptyp.es`、`devtools.es` + `assets/ game-misc/ observers/ p-state/ selectors/ store/ ui/`）。
  tarball 约 215KB / 115 个文件。
  顺带确保 `.eslintrc.js`、`.workbuddy/`（本地记忆）、`test/`、`scripts/`、`docs/` 不会被打包。
- `version` 已升到 **1.8.0**（新增繁简转换属于 minor）。
- `repository` / `bugs` / `homepage` 指向本 fork。
- `prepublishOnly: npm test`：`npm publish` 前自动跑测试，测试挂了就发不出去。
- `npm run pack:check`：干跑打包，打印文件清单与体积（不写盘、不需要联网）。

> 备注：`.npmignore` 里 `tests/` 是历史拼写错误（实际目录是 `test/`），
> 现在由 `files` 白名单兜底，不会再漏。

## 四、发布流程

```bash
# 1) 定名 + 元信息：见上面第二节，name / poiPlugin.* / i18n 文案 / author 一起改
#    特别是 2.6 的 i18n 命名空间，别只改 name

# 2) 装依赖（opencc-js 必须装上）
npm install

# 3) 跑测试 + 看打包内容
npm test
npm run pack:check

# 4) 登录（首次会走浏览器/OTP，2FA 开了就按提示输码）
npm login

# 5) 发布（无 scope，不需要 --access public）
npm publish

# 6) 验证
npm view <新包名> version dist.tarball
npm view <新包名> maintainers
```

发布后补两件事：

```bash
git tag v1.8.0 && git push origin v1.8.0
```

并在 README 顶部加一段安装说明（可参考下面这段，把包名替换掉）：

```markdown
## Installation

In poi: Settings → Plugins → "Install directly from npm" → 输入
`poi-plugin-navy-album-cn` → Install。装完重启 poi。
```

## 五、用户侧怎么装（poi 内）

poi → 设置（Settings）→ 插件（Plugins）→ 底部「Install directly from npm」
输入包名 → Install。poi 会在自己的插件目录里执行 `npm install`，
所以 `opencc-js` 会被自动装到用户机器上，用户无需手动做任何事。

想升级就是同一个输入框再装一次（或插件条目上的更新按钮）。

## 六、想出现在 poi 的内置插件列表？

poi 应用内的插件列表来自 poi 仓库的 `assets/data/plugin.json`
（每个插件一条：多语言 name/description、icon、author、link），
不是从 npm 搜索出来的。要进去只能向 `poooi/poi` 提 PR。

对上游同名插件的 fork 来说，这条基本走不通（会被认为重复），
所以现实分发方式是：README / 发布页写清包名，用户手动粘贴安装。

## 七、改名的其它副作用（评估过，很小）

- **p-state 不受影响**：存档路径是 `APPDATA/navy-album/p-state.json`
  （`p-state/index.es` 里写死的 `join(APPDATA_PATH, 'navy-album')`），
  与包名无关，用户既有设置不会丢。
- **与上游并存**：包名不同 → 两个目录、两个插件条目，可同时装、互不干扰。
- **i18n 命名空间**：这一条以前写的「不用改」是错的，见 2.6。
  命名空间 = `plugin.id` = 包名，包名变了代码里的 `window.i18n["poi-plugin-navy-album"]`
  就对不上，必须一起改；顺带一提两者并存时如果共用命名空间会互相覆盖资源，
  但按 2.6 方案 A 改完之后各用各的，不会串味。

## 八、一个要留意的兼容性细节（`poiPlugin.apiVer`）

poi 读插件时的判定逻辑（`views/services/plugin-manager/read-plugin.tsx`）：

> 对 `apiVer` 里每一条 `poi版本上限 → 插件版本上限`，
> 若 `POI_VERSION <= 上限` 且 `插件version > 该映射值`，则 `needRollback = true`，
> 版本被回滚成映射值，插件显示为「需要更新」。

当前 `apiVer` 只覆盖到 `8.99.99 → 0.7.8`。而市面上的 poi 已经是 12.x：

- 在 poi 12 上：`12.10.3 <= 8.99.99` 不成立 → 不触发回滚，**可以正常用**；
- 在 poi ≤ 8.99.99 上：插件版本 1.8.0 > 0.7.8 → 会被回滚/提示更新
  （上游 1.7.21 也一样，这是继承下来的问题）。

要照顾老 poi，就往 `apiVer` 里补一条覆盖当前 poi 大版本的映射，例如：

```json
"apiVer": {
  "7.99.99": "0.3.5",
  "8.1.0-beta.4": "0.4.1",
  "8.99.99": "0.7.8",
  "12.99.99": "1.8.0"
}
```

补之前请先在对应 poi 版本上真机验证一遍，这属于对外兼容性声明。

## 九、以后每次发版

1. 改 `package.json` 的 `version`（semver）
2. `npm test`（`prepublishOnly` 也会兜一遍）
3. `npm publish`
4. `git tag` 并 push
5. 需要时更新 README 的 Changelog 段落
