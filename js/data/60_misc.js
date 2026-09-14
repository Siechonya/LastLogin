/* 60_misc.js — 日历 / 系统日志 / 备忘录（LL.calendar / LL.syslogs / LL.notes）
 * 事实来源：docs/STORY_BIBLE.md；槽位：docs/CONTENT_SPEC.md §4.3。Agent C 产出，勿改他人字段。 */
(function () {
  var LL = (globalThis.LL = globalThis.LL || {});

  /* ---------- 日历（16 条） ---------- */
  LL.calendar = [
    { id: 'cal:cal-0328', date: '2026-03-28', time: '09:30', title: '王秀兰案开庭（旁听）',
      note: '市中级人民法院第三法庭。请了半天假，坐在旁听席最后一排。想亲耳听听「辅助诊断」四个字在法庭上怎么念。',
      clue: null, deleted: false, recur: false, external: false },

    { id: 'cal:cal-0417', date: '2026-04-17', time: '14:00', title: 'v2.3发布评审会',
      note: '三楼大会议室，我记会议纪要。会后把评估报告终稿发全员。晚上又对了一遍测试集的数字，有点不对——记在日记里了。',
      clue: null, deleted: false, recur: false, external: false },

    { id: 'cal:cal-0420', date: '2026-04-20', time: '08:30', title: '体检',
      note: '公司年度体检，空腹。胃老毛病顺便查一下，别再拖。',
      clue: null, deleted: false, recur: false, external: false },

    { id: 'cal:cal-mom-bday', date: '2026-05-06', time: '18:30', title: '妈妈生日',
      note: '下班去取蛋糕（少糖款，她的血糖）。晚上视频陪她吹蜡烛。栗子要出镜。',
      clue: null, deleted: false, recur: false, external: false },

    { id: 'cal:cal-0509', date: '2026-05-09', time: '15:00', title: '郑楠·茶水间',
      note: '她约的，说还我杯子。茶水间人多，反而安全。有些话只能站着的三分钟里说。',
      clue: null, deleted: false, recur: false, external: false },

    { id: 'cal:cal-0518', date: '2026-05-18', time: '15:00', title: '周总约谈',
      note: '小会议室。日历邀请是他秘书发的，主题写「近期工作汇报」。带上录音笔——上周开始养成的习惯。',
      clue: null, deleted: false, recur: false, external: false },

    { id: 'cal:cal-0520', date: '2026-05-20', time: '19:00', title: '陈屿生日',
      note: '在家吃。做糖醋排骨（照妈那张方子，他爱吃，糖多半勺）。礼物上个月就买好了——他倒先送我耳机，说奖金发了。',
      clue: null, deleted: false, recur: false, external: false },

    { id: 'cal:cal-0528', date: '2026-05-28', time: '19:00–23:30', title: '加班',
      note: '终端合规检查，安全部进场。算法部要留人配合，我报名了。v2.3 上线前最后一轮扫描，晚饭在公司解决。门禁和打卡都替我记着时间。',
      clue: null, deleted: false, recur: false, external: false },

    { id: 'cal:cal-0530', date: '2026-05-30', time: '10:00', title: '年假申请',
      note: '在 OA 提交年假：6 月中旬起五天。理由写的「回老家陪母亲」。等审批。',
      clue: null, deleted: false, recur: false, external: false },

    { id: 'cal:cal-0601', date: '2026-06-01', time: '09:30', title: '复诊（胃）',
      note: '市一医院消化内科。带医保卡，空腹。老毛病，压力一大就疼——医生原话：「你这个胃，是替你的情绪受过。」',
      clue: null, deleted: false, recur: false, external: false },

    { id: 'cal:cal-0603', date: '2026-06-03', time: '15:00', title: '苏晴·老地方',
      note: '大学西门那家咖啡馆，靠窗的位置。带上材料清单。这次要谈定：给什么、怎么给、什么时候给。',
      clue: null, deleted: false, recur: false, external: false },

    { id: 'cal:cal-0606', date: '2026-06-06', time: '09:30', title: '终端合规检查',
      note: '安全部进场，全员终端扫描，说是例行。可 5 月 28 日才查过一轮。自己的文件先整理一遍——该加密的加密，该挪走的挪走。',
      clue: null, deleted: false, recur: false, external: false },

    { id: 'cal:cal-0608', date: '2026-06-08', time: '23:30', title: '寄快递（硬盘）',
      note: '新买的移动固态硬盘下午已签收（空白盘）。晚上把 starfall 拷进去，拷完立刻下楼寄出——驿站 24 小时。保价，如实申报内容物，别写「日用品」，签收记录要经得起看。寄往敦煌沙州的代收点，路过时自提。',
      clue: null, deleted: false, recur: false, external: false },

    { id: 'cal:cal-0611', date: '2026-06-11', time: '19:00', title: '加班（晚归）',
      note: '白天在工位把收尾的活干完；晚上开始「加班」。很晚才回，手机静音。不用等我吃饭。',
      clue: null, deleted: false, recur: false, external: false },

    { id: 'cal:cal-0613', date: '2026-06-13', time: '07:40', title: '出差·敦煌',
      note: '07:40 江城→兰州（12306 候补，乘车人：林晚）。兰州中转夜班车到敦煌。次日按预订取车，沙州租车，支持异地还。此行程 2026-06-10 23:20 从日历删除。',
      clue: null, deleted: true, recur: false, external: false },

    { id: 'cal:cal-0812', date: '2026-08-12', time: '21:00', title: '英仙座流星雨（每年）',
      note: '极大日在 8 月 12 日前后，后半夜最好，找个光污染低的地方。2019 年的今天在天台，三个人数了四个小时。每年这一天，记得抬头。',
      clue: null, deleted: false, recur: true, external: false }
  ];

  /* ---------- 系统日志（26 条，按时间排序） ---------- */
  LL.syslogs = [
    { id: 'log:syslog-0403-boot', ts: '2026-04-03 09:02:11', type: 'power',
      text: '开机 user=linwan（周五）', clue: null },

    { id: 'log:syslog-0408-net', ts: '2026-04-08 19:47:36', type: 'net',
      text: '已连接无线网络 home-5G', clue: null },

    { id: 'log:syslog-0415-sys', ts: '2026-04-15 12:31:09', type: 'sys',
      text: 'Aster OS 3.2 系统更新安装完成（build 20260401），自动重启', clue: null },

    { id: 'log:syslog-0417-net', ts: '2026-04-17 08:56:44', type: 'net',
      text: '已连接无线网络 HUIYU-Office（慧语医疗）', clue: null },

    { id: 'log:syslog-0420-boot', ts: '2026-04-20 07:18:27', type: 'power',
      text: '开机 user=linwan（体检日，06:55 闹钟后首次解锁）', clue: null },

    { id: 'log:syslog-0422-sys', ts: '2026-04-22 13:05:51', type: 'sys',
      text: '安全中心：病毒库更新至 20260422-01，全盘快速扫描通过', clue: null },

    { id: 'log:syslog-0428-net', ts: '2026-04-28 20:31:15', type: 'net',
      text: '无线网络切换：HUIYU-Office → home-5G', clue: null },

    { id: 'log:syslog-0506-power', ts: '2026-05-06 23:12:40', type: 'power',
      text: '进入休眠（电量 22%，未接电源）', clue: null },

    { id: 'log:syslog-0509-usb', ts: '2026-05-09 16:02:18', type: 'usb',
      text: 'USB 存储挂载：卷标=SANYAN-BACKUP，只读，来源=江城第三医院（归还的病历资料盘），已弹出', clue: null },

    { id: 'log:syslog-0512-power', ts: '2026-05-12 07:41:55', type: 'power',
      text: '唤醒（休眠恢复）', clue: null },

    { id: 'log:syslog-0517-sys', ts: '2026-05-17 11:23:37', type: 'sys',
      text: '磁盘例行维护完成：清理缓存 2.4GB', clue: null },

    { id: 'log:syslog-0520-net', ts: '2026-05-20 21:36:03', type: 'net',
      text: '蓝牙已连接：SoundCore Q20（客厅）', clue: null },

    { id: 'log:syslog-0528-login', ts: '2026-05-28 22:14:03', type: 'auth',
      text: '登录成功 user=linwan src=local-keyboard', clue: 'CL-P4' },

    { id: 'log:syslog-0528-usb', ts: '2026-05-28 22:16:41', type: 'usb',
      text: 'USB 存储挂载：卷标=KINGSTON，复制 /文档 目录 37 个文件，22:29 安全弹出', clue: null },

    { id: 'log:syslog-0530-power', ts: '2026-05-30 00:41:19', type: 'power',
      text: '进入休眠', clue: null },

    { id: 'log:syslog-0601-sys', ts: '2026-06-01 22:08:45', type: 'sys',
      text: '安全中心：病毒库更新至 20260601-02', clue: null },

    { id: 'log:syslog-0605-net', ts: '2026-06-05 23:38:12', type: 'net',
      text: '已连接无线网络 home-5G', clue: null },

    { id: 'log:syslog-0608-usb', ts: '2026-06-08 21:40:07', type: 'usb',
      text: 'USB 存储挂载：卷标=STARFALL，写入 1.2GB（平均 96MB/s），23:02 安全弹出', clue: null },

    { id: 'log:syslog-0609-net', ts: '2026-06-09 23:55:31', type: 'net',
      text: '云盘上传完成：1.2GB（starfall_backup.zip），用时 14 分 22 秒', clue: null },

    { id: 'log:syslog-0610-cal', ts: '2026-06-10 23:20:05', type: 'cal',
      text: '删除日历事件：「出差·敦煌」（2026-06-13）', clue: null },

    { id: 'log:syslog-0611-power', ts: '2026-06-11 23:00:41', type: 'power',
      text: '进入休眠', clue: null },

    { id: 'log:syslog-0611-login', ts: '2026-06-11 23:47:12', type: 'auth',
      text: '登录成功 user=linwan src=local-keyboard', clue: null },

    { id: 'log:syslog-0611-task', ts: '2026-06-11 23:49:03', type: 'task',
      text: '创建计划任务：cleanup.bat @ 2026-06-12 02:15（执行一次）', clue: null },

    { id: 'log:syslog-0612-task', ts: '2026-06-12 02:15:00', type: 'task',
      text: '执行 cleanup.bat：清理临时文件/最近使用记录', clue: 'CL-M5' },

    { id: 'log:syslog-0612-power', ts: '2026-06-12 03:00:00', type: 'power',
      text: '关机（定时任务完成后按预设关机）', clue: null },

    { id: 'log:syslog-0910-boot', ts: '2026-09-10 08:12:44', type: 'power',
      text: '开机 user=linwan 距上次登录 91 天', clue: null, external: true }
  ];

  /* ---------- 备忘录（6 条） ---------- */
  LL.notes = [
    { id: 'note:note-stars', title: '英仙座许愿', date: '2026-03-21',
      body: '春分。整理旧物翻到 2019 年的星图，边角都磨毛了。\n\n今年英仙座：8-12 记得抬头。\n\n2019 年那晚在天台许的什么愿，想不起来了——大概许了保研，许了不秃头，许了「我们三个以后每年一起看」。前两个灵了，第三个卡在「每年」上。\n\n知秋上次回消息还是过年。苏晴倒常联系，忙得脚不沾地。\n\n愿望这东西，许的时候要大声，还的时候要安静。',
      clue: null, deleted: false },

    { id: 'note:note-medicine', title: '胃药·饭后', date: '2026-04-02',
      body: '铝碳酸镁，饭后 1-2 小时嚼服，一天三次。\n忌辛辣、忌冰美式（做不到，尽量）、忌熬夜（更做不到）。\n\n妈来电话问药有没有按时吃。我说有。她不信，让我拍药盒日期给她看——拍完她回了个「哼」。\n\n郑楠说她胃也不好，测试组的职业病：排期一紧，全组的胃跟着紧。',
      clue: null, deleted: false },

    { id: 'note:note-cat', title: '栗子寄养·妈家·周三送', date: '2026-05-30',
      body: '妈生日过了，天天在电话里念叨栗子，说想它胖了没有。\n\n这阵子加班没完没了，跟妈说好了：找个周三把栗子送过去——她周三不上早市，能在家等。\n\n要带的：猫包、猫粮一袋、猫砂盆、它睡的那条小毯子（要有它自己的味道，不然应激）。\n\n妈说她每天给我发视频。行吧，到底是谁想谁。\n\n栗子，去外婆家乖一点，别挠纱窗。',
      clue: null, deleted: false },

    { id: 'note:note-evidence-checklist', title: '证据清单·待交苏晴', date: '2026-06-08',
      body: '打包进 starfall.zip（已完成，副本在移动硬盘 STARFALL）：\n\n1. 原始评测日志（v2.3 磨玻璃结节子集，recall_ggn=0.781；发布版报告写的 92.4%）\n2. 5-18 周明远约谈录音 + 逐字转写（「经得起看，不是经得起查」）\n3. 周明远↔何珊邮件链整理（和解操作、法务口径、对家属的「慰问」安排）\n4. 王秀兰病历时间线（2025-11-03 判「良性」→ 2026-02-17 去世）+ 王建国提供的材料\n5. 启帆数据现金支取凭条翻拍（6-01，三十万）+ 6-04 阳台照片\n\n规矩（和苏晴 6-03 老地方定下的）：\n- 原件交苏晴，副本留本地；郑楠的名字全部抹掉，出事也不能烧到她。\n- 发稿时机：王秀兰案再审窗口期，早一天都不行。\n- 交接信号：纸鹤飞的时候。',
      clue: null, deleted: false },

    { id: 'note:note-zhiqiu', title: '给知秋的暗号', date: '2026-06-09',
      body: '天津四 / M31——她记性好，会懂的。\n\n天津四：夏季大三角最亮的一颗，天鹅的尾巴。2019-08-12 天台上，我们第一次一起认出的恒星。\nM31：仙女座星系。2019 年 10 月，我们第一次用望远镜认出的星系。四月她还在聊天里问我「还记得吗」——她当然记得，她连我随口说的笑话都记三年。\n\n压缩包就用「天津四」做密码。不用告诉她，也不用解释——该懂的时候，她抬头就懂。\n\n今晚 21:20 给她发最后一条：「好久不见。等我消息。」\n\n对不起，知秋。这次换你在天台等我。',
      clue: null, deleted: false },

    { id: 'note:note-scheduled-msg', title: '给陈屿的定时消息文案', date: '2026-06-10',
      body: '纸鹤定时发送已设置，6 月 11 日深夜自动发出。文案定稿如下，一个字都不许再改：\n\n23:52 →「我们谈谈吧，江边。」\n00:05 →「算了你别来了。」\n\n要点：\n- 语气要像吵过架：第一条硬，第二条赌气。冷静才是最假的。\n- 不带称呼、不用表情包、句尾不加语气词。我们真吵架的时候，我从不喊他全名。\n- 间隔 13 分钟，够他从城东赶到江边——也够他到的时候，只看手机、包和外套。\n- 定时消息发出后不可撤回。这条规则他以后会反复跟警察确认。\n\n他一定会来。他比谁都需要这场「争执」是真的。',
      clue: 'CL-M3', deleted: false }
  ];
})();
