/**
 * 本地存储键名一次性迁移（qdu_* 历史键 → nav_* 中性键）
 * ---------------------------------------------------------------------------
 * 骨架仓历史遗留 qdu_ 前缀键名，与校本品牌无关。统一改名为 nav_ 前缀后，
 * 已在用老版本的用户 localStorage 里仍有旧数据（班级/课表/日程/反馈等），
 * 这里在应用挂载前把「旧键有值、新键为空」的项原样复制过去，保证升级不掉数据。
 * 旧键不删除（留作回滚与排查依据），后续读写一律走新键。
 */
const KEY_MAP = {
  qdu_agent_class: 'nav_agent_class',
  qdu_agent_exec: 'nav_agent_exec',
  qdu_agent_exec_ts: 'nav_agent_exec_ts',
  qdu_agent_fb: 'nav_agent_fb',
  qdu_agent_inbox: 'nav_agent_inbox',
  qdu_agent_miss: 'nav_agent_miss',
  qdu_agent_reminders: 'nav_agent_reminders',
  qdu_agent_reminders_fired: 'nav_agent_reminders_fired',
  qdu_agent_schedule: 'nav_agent_schedule',
  qdu_agent_session: 'nav_agent_session',
  qdu_api_base: 'nav_api_base',
  qdu_chat_history_v1: 'nav_chat_history_v1',
  qdu_fix_orders: 'nav_fix_orders',
  qdu_imported_courses: 'nav_imported_courses',
  qdu_supabase: 'nav_supabase',
  qdu_wall_name: 'nav_wall_name',
  qdu_wf_fav: 'nav_wf_fav',
  qdu_wf_usage: 'nav_wf_usage'
}

export function migrateStorage() {
  try {
    for (const [oldKey, newKey] of Object.entries(KEY_MAP)) {
      const v = localStorage.getItem(oldKey)
      if (v !== null && localStorage.getItem(newKey) === null) {
        localStorage.setItem(newKey, v)
      }
    }
  } catch { /* 隐私模式/无 localStorage 时忽略 */ }
}
