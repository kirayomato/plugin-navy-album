import assert from 'assert'
import { toSimplified, simplifyIf } from '../../game-misc/t2s'

const spec = it

describe('game-misc', () =>
  describe('t2s', () => {
    spec('converts traditional characters', () => {
      assert.equal(toSimplified('陸奥'), '陆奥')
      assert.equal(toSimplified('飛龍'), '飞龙')
      assert.equal(toSimplified('鳳翔'), '凤翔')
    })

    spec('converts Japanese Shinjitai as well', () => {
      assert.equal(toSimplified('駆逐艦'), '驱逐舰')
      assert.equal(toSimplified('図鑑'), '图鉴')
      assert.equal(toSimplified('零式水上偵察機'), '零式水上侦察机')
      assert.equal(toSimplified('戦艦棲姫'), '战舰栖姬')
    })

    spec('fixes up characters the dictionaries leave non-simplified', () => {
      assert.equal(toSimplified('戦闘糧食'), '战斗粮食')
      assert.equal(toSimplified('護衛棲姫'), '护卫栖姬')
      assert.equal(toSimplified('高角砲'), '高角炮')
    })

    spec('keeps kana, latin characters and digits', () => {
      assert.equal(toSimplified('中型バルジ'), '中型バルジ')
      assert.equal(toSimplified('九一式徹甲弾'), '九一式彻甲弹')
      assert.equal(
        toSimplified('No. 41cm Triple Gun Mount'),
        'No. 41cm Triple Gun Mount')
    })

    spec('is idempotent', () => {
      ['陸奥', '戦艦棲姫', '高角砲', '陸奥'].forEach(name =>
        assert.equal(toSimplified(toSimplified(name)), toSimplified(name)))
    })

    spec('passes through non-string and empty input', () => {
      assert.equal(toSimplified(''), '')
      assert.equal(toSimplified(null), null)
      assert.equal(toSimplified(undefined), undefined)
      assert.equal(toSimplified(12), 12)
    })

    spec('simplifyIf only converts when enabled', () => {
      assert.equal(simplifyIf(false, '陸奥'), '陸奥')
      assert.equal(simplifyIf(true, '陸奥'), '陆奥')
    })
  })
)
