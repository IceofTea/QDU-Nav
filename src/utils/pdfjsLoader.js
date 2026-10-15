/**
 * @模块路径  src/utils/pdfjsLoader.js
 * @职责      懒加载 pdfjs-dist，并绑定与主库同版本的本地 worker
 * @说明      仅被 billImport.js 在「中行 PDF 账单」分支动态 import：
 *             - worker 经 Vite `?url` 打包为站点本地资源，版本随依赖锁定，
 *               修正旧版 CDN worker（3.11.174）与 v6 主库协议/版本不匹配导致的解析失败；
 *             - 独立成块，避免静态引入把 ~1MB 解析库算进 Budget 分包体积；
 *             - 该模块仅浏览器 PDF 分支加载，Node 单测（CSV/xls 路径）不会触发。
 */
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export default pdfjsLib
