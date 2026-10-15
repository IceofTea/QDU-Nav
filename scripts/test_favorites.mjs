/**
 * 「我的快捷」收藏自测：node scripts/test_favorites.mjs
 * 覆盖：规范化/幂等/上限裁剪/排序与置顶/开关/上下移动/分组/导入三形态/合并去重/站点实例。
 */
import assert from 'node:assert/strict'
import {
  KINDS, MAX_ITEMS, makeFavoriteId, normalizeFavorite, normalizeList, pruneFavorites,
  isFavorite, addFavorite, removeFavorite, toggleFavorite, moveFavorite, setPinned,
  sortFavorites, groupByKind, summarize, exportFavorites, importFavorites, mergeFavorites,
  createFavorites
} from '../src/utils/favorites.js'

let failed = 0
function check(name, fn) {
  try {
    fn()
    console.log('✔', name)
  } catch (e) {
    failed++
    console.error('✘', name, '\n   ', e.message)
  }
}

const app = (target, label) => ({ kind: 'app', target, label })

check('makeFavoriteId：同 kind+target 同 id，kind 非法回落 other', () => {
  assert.equal(makeFavoriteId('app', 'budget'), 'app:budget')
  assert.equal(makeFavoriteId('unknown', 'x'), 'other:x')
  assert.equal(makeFavoriteId('app', 'budget'), makeFavoriteId('app', 'budget'))
  assert.notEqual(makeFavoriteId('app', 'a'), makeFavoriteId('app', 'b'))
})

check('normalizeFavorite：非法项返回 null，合法项补齐字段', () => {
  assert.equal(normalizeFavorite(null), null)
  assert.equal(normalizeFavorite({}), null)
  assert.equal(normalizeFavorite({ target: '' }), null)
  const f = normalizeFavorite({ kind: 'app', target: 'budget', label: '', sub: '生活费', icon: '' })
  assert.equal(f.id, 'app:budget')
  assert.equal(f.label, 'budget', 'label 缺省回落 target')
  assert.equal(f.icon, '🧩', '缺省按 kind 给图标')
  assert.equal(f.pinned, false)
  assert.ok(Number.isFinite(f.addedAt))
})

check('normalizeList：批内同 id 去重，顺序保持', () => {
  const list = normalizeList([app('a', 'A'), app('b', 'B'), { ...app('a', 'A2') }, null])
  assert.deepEqual(list.map((i) => i.id), ['app:a', 'app:b'])
})

check('addFavorite 幂等：重复添加不产生第二条', () => {
  let l = []
  const r1 = addFavorite(l, app('a', 'A'), 1000)
  assert.equal(r1.added, true)
  const r2 = addFavorite(r1.list, app('a', 'A'), 2000)
  assert.equal(r2.added, false)
  assert.equal(r2.list.length, 1)
})

check('removeFavorite / isFavorite', () => {
  const l = addFavorite([], app('a', 'A')).list
  assert.equal(isFavorite(l, 'app:a'), true)
  assert.equal(isFavorite(removeFavorite(l, 'app:a'), 'app:a'), false)
  assert.equal(removeFavorite(l, 'app:zzz').length, 1)
})

check('toggleFavorite 开关语义', () => {
  const on = toggleFavorite([], app('a', 'A'), 1)
  assert.equal(on.on, true)
  assert.equal(on.list.length, 1)
  const off = toggleFavorite(on.list, app('a', 'A'), 2)
  assert.equal(off.on, false)
  assert.equal(off.list.length, 0)
})

check('pruneFavorites：超上限时保留置顶 + 最新的', () => {
  const many = []
  for (let i = 0; i < MAX_ITEMS + 5; i++) many.push({ kind: 'app', target: 't' + i, label: 'T' + i, addedAt: i })
  const pinnedNewest = [...many, { kind: 'app', target: 'pinned', label: 'P', pinned: true, addedAt: 0 }]
  const out = pruneFavorites(pinnedNewest)
  assert.equal(out.length, MAX_ITEMS)
  assert.ok(out.some((i) => i.target === 'pinned'), '置顶项必须保留')
  assert.ok(out.some((i) => i.target === 't' + (MAX_ITEMS + 4)), '最新的应保留')
  assert.ok(!out.some((i) => i.target === 't0'), '最旧的应被丢弃')
})

check('setPinned 把置顶项排到最前（取消置顶保持当前位置）', () => {
  let l = addFavorite([], app('a', 'A'), 1).list
  l = addFavorite(l, app('b', 'B'), 2).list
  l = addFavorite(l, app('c', 'C'), 3).list
  const pinned = setPinned(l, 'app:c', true)
  assert.deepEqual(pinned.map((i) => i.target), ['c', 'a', 'b'])
  const unpinned = setPinned(pinned, 'app:c', false)
  assert.deepEqual(unpinned.map((i) => i.target), ['c', 'a', 'b'], '取订不改变用户排好的顺序')
  assert.equal(unpinned.find((i) => i.target === 'c').pinned, false)
})

check('moveFavorite 上下移动与越界保护', () => {
  let l = ['a', 'b', 'c'].reduce((acc, t) => addFavorite(acc, app(t, t.toUpperCase())).list, [])
  assert.deepEqual(moveFavorite(l, 'app:b', -1).map((i) => i.target), ['b', 'a', 'c'])
  assert.deepEqual(moveFavorite(l, 'app:b', 1).map((i) => i.target), ['a', 'c', 'b'])
  assert.deepEqual(moveFavorite(l, 'app:a', -1).map((i) => i.target), ['a', 'b', 'c'], '越界不动')
  assert.deepEqual(moveFavorite(l, 'app:zzz', 1).map((i) => i.target), ['a', 'b', 'c'])
})

check('groupByKind 分组与 summarize 统计', () => {
  let l = addFavorite([], app('a', 'A')).list
  l = addFavorite(l, { kind: 'room', target: 'r1', label: 'R1' }).list
  l = addFavorite(l, { kind: 'room', target: 'r2', label: 'R2' }).list
  const g = groupByKind(l)
  assert.equal(g.length, 2)
  assert.equal(g.find((x) => x.kind === 'room').items.length, 2)
  assert.equal(g.find((x) => x.kind === 'room').icon, '🏫')
  const s = summarize(setPinned(l, 'app:a', true))
  assert.equal(s.total, 3)
  assert.equal(s.pinned, 1)
  assert.deepEqual(s.kinds.sort(), ['app', 'room'])
})

check('KINDS 白名单与图标覆盖', () => {
  assert.ok(KINDS.includes('app') && KINDS.includes('link'))
  assert.equal(normalizeFavorite({ kind: 'nope', target: 'x' }).kind, 'other')
})

check('导出→导入往返一致', () => {
  let l = addFavorite([], app('budget', '生活费')).list
  l = addFavorite(l, { kind: 'link', target: 'https://jwc.qdu.edu.cn', label: '教务处' }).list
  const text = exportFavorites(l, { app: 'QDU-Nav', version: '1.7.3' }, new Date('2026-10-15T00:00:00Z'))
  const parsed = JSON.parse(text)
  assert.equal(parsed.kind, 'nav-favorites')
  assert.equal(parsed.count, 2)
  const back = importFavorites(text)
  assert.equal(back.ok, true)
  assert.equal(back.items.length, 2)
  assert.equal(back.items.find((i) => i.target === 'https://jwc.qdu.edu.cn').label, '教务处')
})

check('importFavorites 三形态 + 错误码 + 丢非法项', () => {
  const item = { kind: 'app', target: 'a', label: 'A' }
  assert.equal(importFavorites(JSON.stringify([item])).ok, true)
  assert.equal(importFavorites(JSON.stringify({ items: [item] })).ok, true)
  assert.equal(importFavorites(JSON.stringify({ favorites: [item] })).ok, true)
  assert.equal(importFavorites('{bad').error, 'not-json')
  assert.equal(importFavorites('{"x":1}').error, 'no-items')
  assert.equal(importFavorites(JSON.stringify([{ nope: 1 }])).error, 'all-invalid')
  const r = importFavorites(JSON.stringify([item, { ...item }, null, { bad: 1 }]))
  assert.equal(r.items.length, 1, '同 id 应去重')
  assert.equal(r.dropped, 3)
})

check('mergeFavorites 追加去重 / 替换', () => {
  const cur = addFavorite([], app('a', 'A')).list
  const inc = [app('a', 'A2'), app('b', 'B')]
  const app1 = mergeFavorites(cur, inc)
  assert.equal(app1.list.length, 2)
  assert.equal(app1.added, 1)
  assert.equal(app1.dup, 1)
  const rep = mergeFavorites(cur, inc, { mode: 'replace' })
  assert.deepEqual(rep.list.map((i) => i.target), ['a', 'b'])
})

check('createFavorites：读写落存储、幂等开关、清空', () => {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  }
  const fav = createFavorites('test_favorites')
  assert.deepEqual(fav.load(), [])
  assert.equal(fav.toggle(app('budget', '生活费')).on, true)
  assert.equal(fav.isOn('app:budget'), true)
  assert.equal(fav.load().length, 1)
  assert.equal(fav.toggle(app('budget', '生活费')).on, false)
  assert.equal(fav.load().length, 0)
  fav.add(app('a', 'A'))
  fav.add(app('b', 'B'))
  assert.deepEqual(fav.move('app:b', -1).map((i) => i.target), ['b', 'a'])
  assert.equal(fav.pin('app:a', true)[0].target, 'a')
  assert.deepEqual(fav.clear(), [])
  assert.deepEqual(fav.load(), [])
})

check('sortFavorites 置顶优先且稳定', () => {
  const l = normalizeList([
    { kind: 'app', target: 'a', addedAt: 1 },
    { kind: 'app', target: 'b', addedAt: 2, pinned: true },
    { kind: 'app', target: 'c', addedAt: 3 }
  ])
  assert.deepEqual(sortFavorites(l).map((i) => i.target), ['b', 'a', 'c'])
})

console.log(failed ? `\n${failed} 项失败` : '\n全部通过')
process.exit(failed ? 1 : 0)
