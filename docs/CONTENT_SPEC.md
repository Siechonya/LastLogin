# 内容规格 CONTENT_SPEC（数据 Schema + 全槽位清单）

> 配合 docs/STORY_BIBLE.md 使用。Bible 管「事实」，本文件管「结构与槽位」。
> 内容 agent 只能修改分配给自己的 js/data/*.js 文件；id、日期、人名、密码、clue 引用必须与本文件一致，不得增删 id。

## 1. 文件布局与加载方式

纯静态、零构建、零依赖。`index.html` 用普通 `<script src>`（**非 ES module**，保证 file:// 双击可玩）按序加载：

```
js/data/00_meta.js          ← 主控编写：meta/characters/locks/clues/hints/deduction/intro/ending
js/data/11_files_work.js    ← Agent A1：工作/生活类文件（LL.filesWork）
js/data/13_files_missing.js ← Agent C：失踪线文件+日记+回收站（LL.filesMissing）
js/data/20_emails.js        ← Agent A1：邮件（LL.emails）
js/data/30_chats.js         ← Agent B1：聊天（LL.chats）
js/data/40_photos.js        ← Agent B2：照片数据（LL.photos）；SVG 资产由 Agent D 产出
js/data/50_browser.js       ← Agent A2：缓存页/历史/书签（LL.browser）
js/data/60_misc.js          ← Agent C：日历/系统日志/备忘录（LL.calendar/LL.syslogs/LL.notes）
assets/photos/*.svg         ← Agent D
assets/avatars/*.svg        ← Agent D
```

引擎在启动时合并：`LL.files = LL.filesWork.concat(LL.filesMissing)`。

每个 data 文件为立即执行函数，向全局命名空间追加（**禁止覆盖**他人字段）：

```js
(function () {
  var LL = (globalThis.LL = globalThis.LL || {});
  LL.emails = [ /* ... */ ];
})();
```

Node 验证器用 `vm` 依序执行同一批文件后读取 `LL`，保证浏览器/验证器读同一份数据。

## 2. Schema（字段定义）

通用：`id` 全局唯一（带类型前缀）；`clue` = 关键线索 id 或 null（见 Bible §6）；日期格式 `YYYY-MM-DD` 或 `YYYY-MM-DD HH:mm`；`external:true` 表示失踪后外部世界内容（允许晚于 2026-06-11 23:47）。

```js
// files —— 文件系统条目（文件夹由 path 自动推导，不需单独声明）
{ id:'file:xxx', path:'/文档/工作/归档/数据对比表.md', kind:'md'|'text'|'zip'|'photo'|'binary',
  date:'2026-05-19', size:'18KB', body:'…(md 子集: # ## - > **bold** `code` 换行)',
  clue:null, deleted:false, lock:null|'L1', app:'text'|'zip'|'photo',
  props:{created:'…', note:'…'} }

// emails —— folder: inbox|sent|draft|trash
{ id:'email:xxx', folder:'inbox', from:{name:'何珊', email:'heshan@huiyu-med.com'},
  to:[{name:'林晚', email:'linwan@yunmail.com'}], cc:[], date:'2026-05-28 09:12',
  subject:'关于近期工作的合规提醒', body:'…(纯文本, 空行分段)', clue:'CL-W2', external:false }

// chats —— 会话与消息；from:'me'=林晚 'them'=对方 'sys'=系统灰条
{ id:'chat:conv-xxx', peer:'chenyu', name:'陈屿', avatar:'ava-chenyu',
  messages:[ {id:'chat:msg-xxx', from:'them', ts:'2026-05-02 21:14', type:'text'|'image'|'recalled'|'sys',
              text:'…', photo:'photo:xxx'|null, clue:'CL-P3'|null} ] }

// photos —— album:'default'|'hidden06'；hidden06 受 L2 锁
{ id:'photo:xxx', title:'英仙座', date:'2019-08-12 23:41', album:'default',
  src:'assets/photos/ph-perseid-2019.svg', clue:null, external:false,
  exif:{device:'iPhone 11', mode:'长曝光', gps:null, note:'…'},
  caption:'照片下方一行说明', story:'打开后显示的长文（她写的图注/回忆）' }

// browser
pages:[{ id:'page:xxx', url:'https://…', title:'…', site:'新晨周刊', date:'2026-04-15',
         body:'…(md)', clue:'CL-W5', external:false, banner:'本文已被撤稿（快照）'|null }]
history:[{ id:'hist:xxx', ts:'2026-06-09 23:10', title:'…', url:'…', page:'page:xxx'|null,
           cluster:'hist-06'|null, clue:null }]
bookmarks:[{ id:'bm:xxx', title:'…', url:'…', page:'page:xxx'|null }]

// calendar
{ id:'cal:xxx', date:'2026-06-03', time:'15:00', title:'苏晴·老地方', note:'…', clue:null,
  deleted:false, recur:false, external:false }

// syslogs —— type: auth|usb|task|net|power|cal|sys
{ id:'log:xxx', ts:'2026-05-28 22:14:03', type:'auth', text:'登录成功 user=linwan src=local-keyboard', clue:'CL-P4' }

// notes
{ id:'note:xxx', title:'给陈屿的定时消息文案', date:'2026-06-10', body:'…', clue:'CL-M3', deleted:false }
```

## 3. 主控编写部分（00_meta.js，内容 agent 不要碰）

meta / characters / locks(L0-L3) / clues(16枚) / hints(全部提示分级) / deduction(Q1-Q3) / intro(开场) / ending(结局) —— 全部按 Bible §5-§8 由主控实现，agent 产出的内容通过 `clue` 字段与之挂钩。

## 4. 槽位清单（agent 工作单）

> 每行 = 一个必须产出的条目。「要点」是必须传达的情节信息；行文风格自由但须自然、有生活质感、无空洞占位。
> 标 ★ 的条目承载关键线索/密码来源，要点信息**必须明确出现**，不得含糊。

### 4.1 Agent A —— 工作线：js/data/10_files.js(files部分) + 20_emails.js + 50_browser.js

**文件（写入 10_files.js 的 `LL.filesWork` 数组，主控合并）**

| id | path | kind/date | 要点 |
|---|---|---|---|
| file:doc-report | /文档/工作/慧眼v2.3评估报告-发布版.md | md 2026-04-17 | ★公司发布版报告，醒目写着「结节召回率 92.4%」；官样文章腔；页脚「慧语医疗·算法部」 |
| file:doc-rawlog | /文档/工作/评估日志片段-原始.txt | text 2026-05-09 | ★等宽日志体，原始评测输出 `recall_ggn=0.781`（磨玻璃结节子集）；顶部郑楠留言「只敢拷这一段」；与发布版矛盾 |
| file:doc-meeting0417 | /文档/工作/会议纪要-0417.md | md 2026-04-17 | v2.3发布评审会；周明远定调「数字要好看」；林晚负责记录；她备注了一句疑问 |
| file:doc-weekly19 | /文档/工作/周报-第19周.md | md 2026-05-08 | 真实周报质感：模型迭代/联调/三院试点；末尾私人备注「胃又疼」 |
| file:doc-resign | /文档/工作/辞职信-草稿.md | md 2026-05-30 | 写了半页又停住；「我不确定离开是不是逃兵」 |
| file:doc-archive-compare | /文档/工作/归档/数据对比表.md | md 2026-05-19 lock:L1 | ★发布版vs原始逐项对比表（92.4/78.1等）；她标注「改动人：算法部→周」 |
| file:doc-archive-rec | /文档/工作/归档/录音转写-0518.md | md 2026-05-18 lock:L1 | ★CL-W4 周明远约谈转写：「数据要经得起看，不是经得起查」「你想清楚你签过什么」；她手记补充 |
| file:doc-archive-mails | /文档/工作/归档/内部邮件整理.md | md 2026-05-25 lock:L1 | 她抄录的周明远↔何珊往来要点（和解操作、法务口径） |
| file:doc-archive-plan | /文档/工作/归档/证据清单.md | md 2026-06-04 lock:L1 | ★她整理的可公开材料清单；写明「原件交苏晴，副本留本地」；提到需要一个「不会被怀疑的地方」 |
| file:doc-resume | /文档/简历-林晚-2025.md | md 2025-12-02 | 背景：江城大学计算机系、天文社、2024入职慧语 |
| file:desk-todo | /桌面/待办.txt | text 2026-06-10 | 生活痕迹+伏笔：「11号加班(晚归)」「给妈打电话」「栗子猫粮寄到妈家」 |
| file:dl-installer | /下载/AsterOS-3.2-更新说明.txt | text 2026-05-02 | 无害系统文件，少量真实感更新日志 |
| file:dl-cat | /下载/栗子驱虫记录.txt | text 2026-05-15 | 猫的一致性道具 |
| file:mus-list | /音乐/播放列表.txt | text 2026-03-01 | 虚构歌曲《星港》《银河铁道之夜》；一首与陈屿的回忆、一首与天文社的回忆 |

**邮件（20_emails.js）**：按 Bible 邮箱设定，全部 19 封：
inbox：mail-zhou-0310(表扬排期)、mail-zhou-0506(★微妙警告「注意信息边界」)、mail-heshan-0528(★CL-W2 合规提醒函，法务腔威胁)、mail-zhengnan-0509(「日志放你网盘了，看完删」)、mail-suqing-0603(「老地方，带上你说的东西」)、mail-wangjg-0422(★王建国求助，朴素动人)、mail-hr-0606(★CL-W6 离职账号回收/封网通知)、mail-hr-checkup(体检)、mail-chenyu-0415(甜蜜)、mail-spam(发票代开垃圾邮件)、mail-hr-reject-0531(驳回年假)、mail-news-0614([外]警方通报推送)
sent：mail-sent-wangjg-0425(回复家属，善意谨慎)、mail-sent-zhengnan-0510(「删了，别再发」)、mail-sent-suqing-0604(材料清单)、mail-sent-hr-0530(年假申请)
draft：mail-draft-chenyu(★CL-P2「我们都知道你做了什么」，提到6-01启帆现金支取凭条在他外套口袋)、mail-draft-zhiqiu(★F2「给知秋：如果我出事了」只写了一句就停)、mail-draft-evidence(证据清单草稿)
trash：mail-trash-threat2(6-01匿名威胁「聪明人知道什么时候停手」，临时邮箱)、mail-trash-zhou-0520(周抄送何珊，她转发后删)、mail-trash-suqing-0417(苏晴「稿子被撤了，他们动作很快」)

**浏览器（50_browser.js）**：
pages(8)：page:news-suqing-report(★CL-W5《AI误诊之后：王秀兰案的147天》全文，banner「本文已被撤稿（快照）」)、page:news-police-0614([外]警方通报：6-12 00:40手机江边关机、09:30男友报警)、page:court-1024(★L1密码来源：(2026)鄂01民初1024号撤诉裁定，含王秀兰案经过)、page:huiyu-pr(官网PR「召回率业界领先92%」)、page:forum-whistle(论坛帖「医疗AI数据造假怎么举报」3回复)、page:lenghu-obs(冷湖天文观测基地访客预约页)、page:dunhuang-car(敦煌租车行)、page:weather-lenghu(冷湖9月天气历史)
history(22)：4-6月搜索流。★cluster 'hist-06'(6-07~6-10)：江边公园 监控 盲区 / 长途汽车 江城 西宁 / 敦煌 租车 异地还车 / 冷湖 天气 9月 / 失踪人口 多久 销案 —— CL-M4。5月簇：慧眼 召回率 磨玻璃 / 数据造假 举报 流程 / 启帆数据(6-05)。6-09: 12306 候补。日常混入：外卖、豆瓣、猫粮、天气预报(江城)。
bookmarks(5)：新晨周刊/中国裁判文书网/慧语内网/江城天气/江城大学天文社校友页。

### 4.2 Agent B —— 人际线：js/data/30_chats.js + 40_photos.js

**聊天（30_chats.js）** 7 个会话，消息 ts 必须符合 Bible 时间线与语气分期规则（§9.4）：
- chat:conv-chenyu（≥42条）：4月甜蜜(樱花/耳机伏笔F1-d)；5月打探期(F1-b「最近总对接慧语那边的项目」★CL-P3 msg-chenyu-0502、F1-c规律加班、F1-a欠债与母亲手术)；6-06起林晚冷淡短句；★6-11晚剧本对话(23:52「我们谈谈吧，江边」→陈屿撤回两条 CL-P5 msg-chenyu-0611-recall→00:05「算了你别来了」)；6-12早陈屿连发「你在哪」「我报警了」无人回。
- chat:conv-suqing（≥30条）：撤稿愤懑(4-17)、约见面(6-03老地方)、暗号「纸鹤飞的时候」(6-08★按计划)、提到知秋「你跟知秋说了吗」「没说。她心软，我怕她拦我」(F2伏笔)。
- chat:conv-zhiqiu（≥26条，与玩家！）：2024后联系变少的成年人疏离感；★4月msg「还记得我们第一次用望远镜认出的星系吗」(L2伏笔,知秋回「M31，仙女座」)；★6月初msg「如果有一天我消失了，你就抬头找那颗星——我们第一次一起认出来的那颗」(L3伏笔,知秋回「天津四？大夏天的别吓我」)；★6-09 21:20「好久不见。等我消息。」(F2-g)；2019流星雨回忆(L0氛围)。
- chat:conv-mom（≥20条）：亲情；妈妈催回家/栗子寄养(6-08「猫粮我寄过去了」)；★6-08晚「妈，如果我联系不上，你别急，把电脑给知秋」(字条伏笔,妈妈回「说什么胡话」)。
- chat:conv-work 工作群「慧眼算法组」（≥28条）：周明远/郑楠/何珊(法务进群)出现；排期压力；★5-28「今晚安全部做终端合规检查，大家配合」(与异常登录互证)；6-06封网通知呼应CL-W6。
- chat:conv-zhengnan（≥14条）：★5-09 msg-zhengnan-0509 日志交付(CL-W3)「别把我供出来，我房贷还有26年」；害怕与良知拉扯。
- chat:conv-delivery 快递助手（6条）：★6-08「移动固态硬盘×1 已签收」(CL-M5辅)；5-20猫粮；日常。

**照片（40_photos.js）** 15张（14+结局明信片），数据条目+story 长文图注由 B 写，SVG 由 D 按 §4.4 规格画：
default：ph-perseid-2019(★L0/L3: caption/story 明确「第一次认出天津四」「8月12日极大」)、ph-m31-2019(★L2)、ph-club-2019(天文社合影,三人)、ph-chenyu-0402(樱花,甜蜜)、ph-desk-0320(工位,慧语工牌)、ph-wang-family-0422(★王秀兰病床照,王建国发来,沉重)、ph-cat-0501(栗子)、ph-river-0611(★江边22:03「最后一张」,story里她写「风很大」)、ph-note-mother([外]★CL-M6 妈妈拍的 handwritten 字条「如果我联系不上，把电脑交给知秋」,intro后入册)
hidden06(L2锁)：ph-chenyu-phone(★CL-P1 6-04 21:37 阳台偷拍,第二部手机亮屏,exif:静音快门)、ph-threat-letter(★CL-M1 6-07「威胁信」,exif:定时自拍3s/客厅/画面边缘镜子与拖鞋,story点破)、ph-ticket-12306(★CL-M2 6-09截图,候补订单6-13江城→兰州,乘车人林晚)、ph-receipt-qifan(★6-05启帆数据现金支取凭条翻拍,6-01,30万)、ph-usb-starfall(6-08深夜桌面,移动硬盘,屏幕微光starfall.zip进度条)
ending：ph-postcard-lenghu([外]2027-09冷湖明信片,结局用)

### 4.3 Agent C —— 失踪线：js/data/60_misc.js + 10_files.js(filesMissing部分)

**文件（写入 `LL.filesMissing`）**：

| id | path | kind/date | 要点 |
|---|---|---|---|
| file:doc-diary-0329 | /文档/个人/日记/日记-0329.md | md | 王秀兰去世后她的震动；「系统说良性，人就信了良性」 |
| file:doc-diary-0425 | /文档/个人/日记/日记-0425.md | md | 起疑92%；天文社回忆一闪（知秋/苏晴） |
| file:doc-diary-0518 | /文档/个人/日记/日记-0518.md | md | ★约谈后；「归档密码用了那个案号——不能忘」(L1提示) |
| file:doc-diary-0605 | /文档/个人/日记/日记-0605.md | md | ★发现凭条/第二部手机，确认陈屿背叛；心碎但冷静 |
| file:doc-diary-0610 | /文档/个人/日记/日记-0610.md | md | ★F2-g「该说再见了，但不是以他们以为的方式」；栗子已送妈家 |
| file:doc-recipe | /文档/个人/妈妈菜谱.txt | text | 亲情生活痕迹 |
| file:doc-staratlas | /文档/个人/天文社星图笔记.md | md | ★英仙座8-12极大/M31/天津四「夏季大三角最亮」(L0/L2/L3强化) |
| file:bin-fakeplan | /回收站/布置清单.txt | text 2026-06-10 deleted | ★F2-h：江边(手机+包+外套)/22:00拍照/23:52定时/02:15脚本 |
| file:bin-msgdraft | /回收站/给陈屿的信-删.txt | text 2026-06-06 deleted | 爱过与背叛；「我甚至检查过你有没有在汤里下药——你看你把我变成了什么」 |
| file:bin-search | /回收站/搜索记录截图说明.txt | text 2026-06-07 deleted | ★她自存搜索截图说明：监控盲区/销案期限(CL-M4辅) |
| file:bin-threat-original | /回收站/威胁信-原稿.txt | text 2026-06-07 deleted | ★F2：她亲手写的「威胁信」原稿（打印体文案），自我厌恶与决心 |
| file:dl-starfall | /下载/starfall.zip | zip 2026-06-08 lock:L3 size:1.2GB | 最终证据包（引擎处理解锁，body为文件清单文本） |

**日历（60_misc.js `LL.calendar`）**：16条按 Bible §3（含 ★cal-0528加班19:00-23:30、★cal-0613 deleted「出差·敦煌」、cal-0812 recur「英仙座流星雨(每年)」、cal-0603苏晴老地方、cal-0518周总约谈15:00、cal-0611加班(晚归)、cal-0608寄快递(硬盘)、cal-0606终端合规检查、cal-0328开庭旁听、cal-0417评审会、cal-0420体检、cal-0509郑楠茶水间、cal-0520陈屿生日、cal-mom-bday妈妈生日5-06、cal-0530年假申请、cal-0601复诊胃）。

**系统日志（`LL.syslogs`）**：26条，日常(开关机/更新/休眠/网络)与★关键混杂：
syslog-0528-login(★22:14:03 auth 登录 user=linwan src=local-keyboard, CL-P4)、syslog-0528-usb(22:16 KINGSTON 拷贝/文档37文件)、syslog-0608-usb(★21:40 STARFALL write 1.2GB, CL-M5)、syslog-0609-net(23:55 上传yunpan 1.2GB)、syslog-0610-cal(★23:20 删除日历事件「出差·敦煌」)、syslog-0611-login(★23:47:12 最后一次登录)、syslog-0611-task(23:49 创建计划任务cleanup.bat@02:15)、syslog-0612-task(★02:15:00 执行cleanup.bat, CL-M5)、syslog-0612-power(03:00关机)、syslog-0910-boot([外]2026-09-10 08:12开机=玩家)。其余日常日志日期分布在4-6月，不得晚于6-11（除上述external）。

**备忘录（`LL.notes`）**：6条：note-scheduled-msg(★CL-M3 6-10 定时消息文案:23:52「我们谈谈吧，江边」/00:05「算了你别来了」)、note-evidence-checklist(6-08 证据清单·待交苏晴)、note-zhiqiu(★6-09「给知秋的暗号：天津四/M31——她记性好，会懂的」)、note-cat(5-30 栗子寄养)、note-stars(3-21 英仙座许愿)、note-medicine(4-02 胃药)。

### 4.4 Agent D —— SVG 美术：assets/photos/*.svg + assets/avatars/*.svg

- 照片 16 张（§4.2 列表 + ph-postcard-lenghu），尺寸统一 `viewBox="0 0 800 533"`（3:2），风格：深夜蓝黑基调+琥珀点缀、剪影/渐变/细颗粒（feTurbulence 低透明度）、手绘感；**禁止文字大段堆砌**，照片内允许极少量场景文字（如12306订单卡片、威胁信打印字、字条手写字——这三张是「文档型照片」，需清晰可读的排版文字）。
- 头像 10 个：ava-linwan/chenyu/suqing/zhiqiu/mom/zhengnan/zhou/heshan/work/delivery，`viewBox="0 0 64 64"`，抽象剪影+单色底，彼此可区分。
- 全部为手写 SVG（无外部引用、无 JS、无 font 依赖；文字用 `font-family="sans-serif"`）。

## 5. 交叉引用规则（验证器强制）

1. `clue` 字段只能取 Bible §6 的 17 个 id；每个 clue id 必须恰好被 1 个主载体引用（辅证可重复提及但不设 clue 字段）。
2. chat 消息 `photo` 字段、photo `src` 字段引用的资产必须存在。
3. 所有 id 唯一；所有日期符合 Bible §3；人名只用 Bible §1 canonical。
4. 林晚产出内容日期 ≤ 2026-06-11 23:47，除非 `external:true`。
5. 锁内条目（归档/*、hidden06、starfall.zip）必须带 lock 字段，且其 clue 的提示分级符合 Bible §7。
6. 文本内出现的数字必须与 Bible §9.5 一致（92.4%/78.1%/1024/30万/1.2GB/23:47/23:52/02:15/00:40/09:30）。
