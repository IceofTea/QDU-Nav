const img = (f) => import.meta.env.BASE_URL + 'data/calendar/' + f

export const previewTerms = [
  { id: 'y2026', label: '2026~2027 学年', labelEn: '2026–2027 Academic Year', image: img('2026-2027.jpg'), sourceUrl: 'https://jwc.qdu.edu.cn/info/1005/6515.htm', pdf: 'https://jwc.qdu.edu.cn/__local/B/9A/2E/40B29415B5A7CFF532359EB9134_33509644_26A34.pdf' },
  { id: 'y2025', label: '2025~2026 学年', labelEn: '2025–2026 Academic Year', image: img('2025-2026.jpg'), sourceUrl: 'https://jwc.qdu.edu.cn/info/1005/5861.htm', pdf: 'https://jwc.qdu.edu.cn/__local/A/CB/B6/57F536570022CB4F5D178504D8A_6E8A2FCC_2747A.pdf' },
  { id: 'y2024', label: '2024~2025 学年', labelEn: '2024–2025 Academic Year', image: img('2024-2025.jpg'), sourceUrl: 'https://jwc.qdu.edu.cn/info/1005/5404.htm', pdf: 'https://jwc.qdu.edu.cn/__local/A/CD/A8/AAB3F4C5FBBDD0D56AD397DDA87_C2980293_274DA.pdf' },
  { id: 'y2023', label: '2023~2024 学年', labelEn: '2023–2024 Academic Year', image: img('2023-2024.jpg'), sourceUrl: 'https://jwc.qdu.edu.cn/info/1005/4840.htm', pdf: 'https://jwc.qdu.edu.cn/__local/B/1C/62/F516003E4F76AF3A6E90AB7F0D5_7A349D26_253A9.pdf' },
  { id: 'y2022', label: '2022~2023 学年', labelEn: '2022–2023 Academic Year', image: img('2022-2023.jpg'), sourceUrl: 'https://jwc.qdu.edu.cn/info/1005/3314.htm', pdf: 'https://jwc.qdu.edu.cn/__local/C/64/E3/9B584B5ED6E3336D04F041A46A1_4A9D7267_1A8E3.pdf' },
  { id: 'y2021', label: '2021~2022 学年', labelEn: '2021–2022 Academic Year', image: img('2021-2022.jpg'), sourceUrl: 'https://jwc.qdu.edu.cn/info/1005/3313.htm', pdf: 'https://jwc.qdu.edu.cn/__local/F/59/76/59331C19B594639F0AA2ACA70F7_2FCADAB7_1A31C.pdf' },
  { id: 'y2020', label: '2020~2021 学年', labelEn: '2020–2021 Academic Year', image: img('2020-2021.jpg'), sourceUrl: 'https://jwc.qdu.edu.cn/info/1005/3312.htm', pdf: 'https://jwc.qdu.edu.cn/__local/1/77/C2/9264C5DCABFE8300DEF37946453_791CB08B_1A4B3.pdf' },
  { id: 'y2019', label: '2019~2020 学年', labelEn: '2019–2020 Academic Year', image: img('2019-2020-1.jpg'), sourceUrl: 'https://jwc.qdu.edu.cn/info/1005/3311.htm', pdf: 'https://jwc.qdu.edu.cn/__local/8/10/D6/B24985CEF7268BCC53AC8C4192C_FD8B4402_2D795.pdf' },
  { id: 'y2019b', label: '2019~2020 学年 · 说明页', labelEn: '2019–2020 Academic Year · Notes', image: img('2019-2020-2.jpg'), sourceUrl: 'https://jwc.qdu.edu.cn/info/1005/3311.htm', pdf: 'https://jwc.qdu.edu.cn/__local/8/10/D6/B24985CEF7268BCC53AC8C4192C_FD8B4402_2D795.pdf' },
]

export function defaultTermIdx() {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  const startYear = m >= 8 ? y : y - 1
  const i = previewTerms.findIndex((t) => t.id === 'y' + startYear)
  return i >= 0 ? i : 0
}
