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

## 二、仓库侧已备好的东西

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

## 三、发布流程

```bash
# 1) 定名：只改 name 一行，其它字段不用动
#    "name": "poi-plugin-navy-album-cn"

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

## 四、用户侧怎么装（poi 内）

poi → 设置（Settings）→ 插件（Plugins）→ 底部「Install directly from npm」
输入包名 → Install。poi 会在自己的插件目录里执行 `npm install`，
所以 `opencc-js` 会被自动装到用户机器上，用户无需手动做任何事。

想升级就是同一个输入框再装一次（或插件条目上的更新按钮）。

## 五、想出现在 poi 的内置插件列表？

poi 应用内的插件列表来自 poi 仓库的 `assets/data/plugin.json`
（每个插件一条：多语言 name/description、icon、author、link），
不是从 npm 搜索出来的。要进去只能向 `poooi/poi` 提 PR。

对上游同名插件的 fork 来说，这条基本走不通（会被认为重复），
所以现实分发方式是：README / 发布页写清包名，用户手动粘贴安装。

## 六、改名的副作用（评估过，很小）

- **p-state 不受影响**：存档路径是 `APPDATA/navy-album/p-state.json`
  （`p-state/index.es` 里写死的 `join(APPDATA_PATH, 'navy-album')`），
  与包名无关，用户既有设置不会丢。
- **与上游并存**：包名不同 → 两个目录、两个插件条目，可同时装、互不干扰
  （注意两者都会注册 `poi-plugin-navy-album` 这个 i18n 命名空间，但各自独立打包，
  不会串味）。
- **i18n 命名空间不用改**：`window.i18n["poi-plugin-navy-album"]` 是插件自己
  注册的命名空间，与 npm 包名无关。

## 七、一个要留意的兼容性细节（`poiPlugin.apiVer`）

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

## 八、以后每次发版

1. 改 `package.json` 的 `version`（semver）
2. `npm test`（`prepublishOnly` 也会兜一遍）
3. `npm publish`
4. `git tag` 并 push
5. 需要时更新 README 的 Changelog 段落
