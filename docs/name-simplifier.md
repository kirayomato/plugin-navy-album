# 名称繁简转换：实现说明与补字表维护

这是 fork 新增的功能：把舰船名、装备名里的繁体字和日文新字体转成简体。
开关在舰船/装备列表的搜索框右侧（`繁→简`），状态存进 `p-state.json` 的 `ui.simplifyNames`。

本文先解释转换链路，然后重点讲**补字表怎么手动维护**。

## 一、涉及的文件

| 文件 | 作用 |
| --- | --- |
| `game-misc/t2s.es` | 转换本体：`toSimplified` / `simplifyIf`，**补字表就在这里** |
| `ui/common/name-simplifier-toggle.es` | 开关按钮 |
| `selectors/common.es` | `nameSimplifierSelector`：开关打开时返回 `toSimplified`，否则返回恒等函数 |
| `test/game-misc/t2s.js` | 单元测试，改完补字表要在这里加断言 |

各显示点的接入（列表名、类型名、详情头部、改造链、装备栏、更新页、搜索匹配）都在 selector 层完成，
组件不需要知道转换的存在。**转换不写回 `master.json`**，磁盘上永远是日文原文。

## 二、为什么是两段式

游戏 master data 的名字是日文，里面混了两种字：

- 繁体字：`陸奥`、`飛龍`、`鳳翔`
- 日文新字体：`戦`、`駆`、`図`（日文简化过的字形，不在繁体字表里）

所以只做一次 繁→简 是转不动的，`戦`、`駆`、`図` 会原样留下。
现在的做法是 `OpenCC.Locale.from.jp`（日文新字体 → 正体）再接 `OpenCC.Locale.to.cn`（正体 → 简体）：

```js
OpenCC.ConverterFactory(
  OpenCC.Locale.from.jp,
  OpenCC.Locale.to.cn,
  [supplementaryDict]
)
```

实测：`戦艦棲姫 → 战舰栖姬`、`駆逐艦 → 驱逐舰`、`零式水上偵察機 → 零式水上侦察机`。

## 三、补字表在哪、怎么写

位置：`game-misc/t2s.es` 文件顶部的 `supplementaryDict`。

```js
const supplementaryDict = [
  ['闘', '斗'],
  ['鬭', '斗'],
  ['姫', '姬'],
  ['衞', '卫'],
  ['砲', '炮'],
]
```

格式就是 `[原字, 期望结果]`，作为 `ConverterFactory` 的第三个参数传进去。
它是 OpenCC 内置词典之外的一层附加字典，**不改动 OpenCC 本身**，也不影响别的插件。

### 三条硬规则（都实测验证过）

**1. `key` 必须写「日文 → 正体」这一步之后的字形，不是你看到的原文。**

这是最容易踩的坑。`護衛棲姫` 里的 `衛` 经过第一阶段会变成旧字形 `衞`，
所以表里的 key 是 `衞` 而不是 `衛`。写 `['衛','卫']` 完全无效。

想知道中间态是什么，用这一行跑一下：

```js
// node -e "..." 里 require 到 opencc-js 之后
const toTw = OpenCC.ConverterFactory(OpenCC.Locale.from.jp, OpenCC.Locale.to.tw)
toTw('護衛棲姫')   // => '護衞棲姫'   ← 表里的 key 要从这里挑
toTw('戦闘糧食')   // => '戰鬭糧食'   ← 所以 key 是 鬭，不是 闘
```

（`Locale.to` 里没有单独的 `t`，用 `tw` 近似观察即可，足够判断字形。）

**2. `key` 只能是一个字；`value` 可以多字。**

多字 key 不会报错，但完全不生效（试过 `['戰鬭','X']`，无效果）。
所以补字表**不能用来修短语**，只能修单字。
`value` 写成多字是有效的（`['鬭','斗X']` 会把 `戦闘` 变成 `战斗X粮食`），但没有任何理由这么用。

**3. 不要写重复的 key。** 同一个 key 出现两次时行为取决于加载顺序，属于自找麻烦。

### 现有五条逐条说明

| 条目 | 为什么需要 |
| --- | --- |
| `['闘','斗']` | **当前实测无效**（`闘` 早已变成 `鬭`，这个 key 匹配不上）。留着是对 OpenCC 换版本的冗余保险，删掉也不影响任何结果 |
| `['鬭','斗']` | 真正起作用的一条。第一阶段把 `闘` 变 `鬭`，而 正体→简体 这一步不认 `鬭` |
| `['姫','姬']` | 日文汉字，OpenCC 词典里没有对应简体。`姫` 在日文是「公主」的意思，对应中文的 `姬` |
| `['衞','卫']` | 旧字形。`衛` 经第一阶段变 `衞`，而 正体→简体 不认 `衞` |
| `['砲','炮']` | 日文用 `砲`，中文规范用 `炮`，OpenCC 不做这个替换 |

规律：这五条都是「OpenCC 收了钱但不干活」的地方——要么中间态冒出一个它不认识的旧字形，要么它压根没有映射。

## 四、怎么发现该补哪个字

### 快法：肉眼过一遍

开关打开，把舰船和装备列表从头翻一遍。名字里的繁体字很显眼，尤其是新船和新装备上线之后。
这个方法不需要任何工具，日常够用。

### 细法：把全部名称导出来看

需要先 `npm install`（脚本要 `opencc-js`），并确认 poi 跑过至少一次（否则没有 `master.json`）。

**第一步，找到 `master.json`：**

```powershell
Get-ChildItem "$env:APPDATA\*\navy-album\master.json" -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty FullName
```

如果没找到，打开 poi 的开发者工具看 `window.APPDATA_PATH`，再拼上 `navy-album\master.json`。

**第二步，把下面这段存成 `tmp/scan-names.js`，然后 `node tmp/scan-names.js <上面那个路径>`：**

```js
const fs = require('fs')
const OpenCC = require('opencc-js')

// 必须与 game-misc/t2s.es 的 supplementaryDict 逐条保持一致
const supplementaryDict = [
  ['闘', '斗'],
  ['鬭', '斗'],
  ['姫', '姬'],
  ['衞', '卫'],
  ['砲', '炮'],
]

const toCn = OpenCC.ConverterFactory(
  OpenCC.Locale.from.jp, OpenCC.Locale.to.cn, [supplementaryDict])
const toTw = OpenCC.ConverterFactory(
  OpenCC.Locale.from.jp, OpenCC.Locale.to.tw)

const mst = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const sources = [
  ['ship', mst.api_mst_ship],
  ['equip', mst.api_mst_slotitem],
  ['stype', mst.api_mst_stype],
  ['etype', mst.api_mst_slotitem_equiptype],
  ['bgm', mst.api_mst_bgm],
]

const seen = new Set()
const entries = []
for (const [kind, arr] of sources) {
  for (const raw of arr || []) {
    const name = raw.api_name
    if (typeof name !== 'string' || name === '' || seen.has(name))
      continue
    seen.add(name)
    entries.push({kind, name, mid: toTw(name), out: toCn(name)})
  }
}

const isHan = ch => /[\u3400-\u9fff\uf900-\ufaff]/.test(ch)
const isKana = ch => /[\u3040-\u30ff]/.test(ch)

// A: 结果里仍残留「单字能转」的字 => 大概率漏转
const residue = entries
  .map(e => ({...e, bad: [...new Set([...e.out].filter(ch => toCn(ch) !== ch))]}))
  .filter(e => e.bad.length > 0)

// B: 中间态和最终态一模一样、却含能转的字 => 整串都没被处理
const untouched = entries.filter(e =>
  e.mid === e.out && [...e.mid].some(ch => isHan(ch) && toCn(ch) !== ch))

// C: 结果里的汉字频次，靠人眼扫出「看起来像繁体但检测不出来」的字
const freq = new Map()
for (const e of entries)
  for (const ch of e.out) {
    if (isKana(ch) || !isHan(ch))
      continue
    freq.set(ch, (freq.get(ch) || 0) + 1)
  }

console.log(`共 ${entries.length} 条不同名称\n`)

console.log(`A. 残留了可简化的字（${residue.length} 条）`)
for (const e of residue)
  console.log(`   [${e.kind}] ${e.name} -> ${e.out}   残留: ${e.bad.join(' ')}`)

console.log(`\nB. 整串未发生变化（${untouched.length} 条）`)
for (const e of untouched)
  console.log(`   [${e.kind}] ${e.name}`)

const han = [...freq.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([ch, n]) => `${ch}(${n}${toCn(ch) !== ch ? ',可转' : ''})`)
console.log(`\nC. 结果中的汉字共 ${freq.size} 个（带「可转」的是漏转，其余靠人眼）`)
console.log('   ' + han.join(' '))
```

**怎么读这三段报告：**

- **A 段**：转换函数明明认识这个字，它却留在结果里 —— 确定要处理。加一条补字表就能修。
- **B 段**：整串一个字都没变。纯假名/纯英文的名字会这样，属正常；含汉字的就值得看一眼。
- **C 段**：结果里的汉字总数。**这一段是兜底**，因为 A/B 都有一个共同的盲区，见下。

### 盲区（必须知道）

A 段和 B 段的判定都依赖「`toCn(单字)` 能把这个字转掉」。

如果一个字**根子里就不在字典里**（`姫`、`砲` 就是这种），`toCn(单字)` 返回它自己，
A 段看不出异常，B 段也不会报，只有 C 段能看到它赫然留在汉字列表里。

所以：**工具只能帮你抓「转得动却没转」的字，抓不到「字典里根本没有」的字**。
后者只能靠 C 段人眼扫，或者翻图鉴时留意。这也意味着这套东西不能当 CI 门禁用。

## 五、加字的完整流程

1. 在 `game-misc/t2s.es` 的 `supplementaryDict` 里加一条 `['原字', '结果']`。
   先确认 key 是**中间态字形**（`toTw` 跑一下），不是原文。
2. 在 `test/game-misc/t2s.js` 的 `fixes up characters the dictionaries leave non-simplified`
   用例里加一条断言（下面是格式示例，按你实际加的字改写）：

   ```js
   assert.equal(toSimplified('護衛棲姫'), '护卫栖姬')
   ```

   用**完整的名称**而不是单个字，这样顺带验证了整串转换。
3. `npm test` 跑一遍。
4. **重启 poi**。模块级的 `converter` 和 `cache` 只在首次转换时构建一次，
   热改代码不重建，不重启看不到效果。
5. 顺手验证幂等：`toSimplified(toSimplified(x))` 应该等于 `toSimplified(x)`。

## 六、其它陷阱

- **别把简繁同形的字塞进表里**（`台`、`卷`、`干`、`著`、`余` 这类）。
  它们本来就该保持原样，加进去只会污染。
- **别指望补字表修短语**，多字 key 不生效（见第三节规则 2）。
  真遇到短语级问题（`ドラム缶 → ドラム罐` 这种），改不了就别硬改。
- **表会作用于所有名称**，包括深海舰名和装备类型名。加之前想一下会不会误伤别的词。
- **开关状态会影响搜索结果**：搜索同时匹配原文与简体形式，与开关无关。
  如果搜索突然命中奇怪的东西，先确认不是转换表的问题。

## 七、已知遗留

- `ドラム缶` 会显示成 `ドラム罐`。这是 OpenCC 的 `jp→t` 阶段把 `缶` 映射成 `罐` 导致的，
  中文语境下不算错，所以没有做反转换。真要修，只能加 `['罐','缶']`，
  但那会把所有 `罐` 都变成 `缶`，影响面过大 —— 结论是不修。
- `['闘','斗']` 这条实测无效，原因见第三节。
