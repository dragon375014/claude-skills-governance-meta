# 中文使用指南（給程式小白）

如果你跟我一樣是「一個人寫程式做自己生意」的獨立開發者、不是科班出身、邊做邊學 SaaS 治理 —— 這份指南幫你**判斷你需不需要用這個 repo**，以及**遇到什麼狀態時打開哪個檔**。

英文版主 README 走國際技術讀者的密度感。這份中文指南走「你 6 個月後回頭來看也讀得懂」的口語感。

---

## 一句話

這個 repo 不教你寫 code，**它教你寫「規則」來擋住未來的自己再次犯相同錯誤**。

你曾經修過一個 bug、3 個月後在另一個模組又犯了一樣的錯 —— 這個 repo 就是為了這種事存在的。

---

## 你「現在」需不需要這份 repo？

**還不需要**的情況（不要過早治理）：

- 你的專案 < 50 個檔案
- 你還沒上線、還在 prototype 階段
- 你還沒踩過第二次同樣的坑（沒看過第二次以前不知道是「pattern」還是「巧合」）
- 你的專案是個人玩具、沒客戶

**已經需要**的情況：

- 你的專案 >= 100 個檔案、>= 3 個月開發
- 你發現自己**修同樣類型的 bug 第二次以上**
- 你寫 commit message 時想過「我下次會不會又犯這個錯」
- 你有別的事情要分心（咖啡店、家庭、其他專案），不能 24/7 盯著 code

> **想要更精確的判斷？** 上面是粗略版。把這個 repo 丟給你專案裡的 AI（Claude Code 等），叫它讀 [`adoption-fitness-check.md`](./adoption-fitness-check.md) —— 它會**實際掃你的專案**，逐檔告訴你「現在該裝 ✅ / 太早裝會浪費 ⚠️ / 你這專案根本用不到 🚫」，還會吐一份採用步驟 handoff。**重點是別貪多**：裝了用不到的東西只會變成死設定 + 讓人誤以為有保護。

---

## 症狀對照表（最重要！）

遇到下面任一狀況時，去看對應的檔案：

| 你看到什麼 | 看這個檔 |
|---|---|
| **我改了一個欄位名，發現另一頁顯示空白 / 錯誤** | [`breakpoint-taxonomy.md`](./breakpoint-taxonomy.md) 的 Type A 或 Type C |
| **同一筆訂單總金額在不同頁面顯示不一樣** | [`breakpoint-taxonomy.md`](./breakpoint-taxonomy.md) 的 Type B + [`playbooks/ssot-consolidation.md`](./playbooks/ssot-consolidation.md) |
| **我加了一個資料庫函式，前端用以前的方式呼叫突然出錯（400）** | [`anti-patterns/pg-function-overload-zombie.md`](./anti-patterns/pg-function-overload-zombie.md) |
| **後台 admin 看資料正常，但客戶反應網站打開看不到任何商品** | [`anti-patterns/spread-overwrites-ssot.md`](./anti-patterns/spread-overwrites-ssot.md) |
| **我發現 5 個不同地方在算同一個金額，每次都對不上** | [`playbooks/ssot-consolidation.md`](./playbooks/ssot-consolidation.md) |
| **我建了新的 Supabase 資料表，部署完線上前端讀不到（403）** | [`templates/check-migration-grants.mjs`](./templates/check-migration-grants.mjs) |
| **我想在新專案第一天就裝一個自動防呆機制（CI 守門）** | [`governance-guard-template.mjs`](./governance-guard-template.mjs) + [`defensive-vs-offensive-governance.md`](./defensive-vs-offensive-governance.md) |
| **我發現自己一直在踩同類型的雷，但說不出來是什麼類型** | [`breakpoint-taxonomy.md`](./breakpoint-taxonomy.md) 全文 |

---

## 名詞翻譯（你可能不熟的英文詞）

| 英文 | 白話翻譯 |
|---|---|
| **Governance** | 治理。意思是「不靠人記憶、靠規則自動擋掉錯誤」 |
| **Defensive (governance)** | 防禦型。**已知的錯誤不准進來**。在 commit / push 時自動擋下 |
| **Offensive (governance)** | 攻擊型。**潛伏在系統裡的問題主動撈出來**。定期掃描資料庫找漏網之魚 |
| **SSOT (Single Source of Truth)** | 單一資料源。同一筆資料只信任一個地方 |
| **Anti-pattern** | 反模式。一個看起來合理、實際上會炸的寫法 |
| **Breakpoint** | 斷層。資料從一處流到另一處時不一致的點 |
| **Migration** | 資料庫變更。每次改資料表結構寫一個 .sql |
| **RPC** | 遠端呼叫的資料庫函式。Supabase 裡你常用的 `supabase.rpc(...)` |
| **Overload** | 函式多載。同一個函式名稱有多個版本（參數不同） |
| **CI** | 持續整合。push 上去後自動跑檢查的流程 |

---

## 如何最低成本試用

不需要學整個 repo。**先試一個檔案 30 分鐘就好**：

### 路徑 1：你已經有專案在跑（最常見）

```sh
# 1. clone 到任何位置
git clone https://github.com/<你的-username>/claude-skills-governance-meta.git ~/code/governance-meta

# 2. 拷貝防禦工具到你的專案
cp ~/code/governance-meta/governance-guard-template.mjs your-project/scripts/governance-guard.mjs

# 3. 用編輯器打開 scripts/governance-guard.mjs，改最上面兩個變數：
#    - ALIAS_MAP：你的 import alias（@/foo → src/foo？）
#    - SCAN_SRC_DIR：你的原始碼資料夾（src? frontend/src?）

# 4. 跑跑看
cd your-project && node scripts/governance-guard.mjs

# 5. 讓它「自動觸發」（最多人忘記這步）—— 接進 build / commit
npm pkg set scripts.guard="node scripts/governance-guard.mjs"
npm pkg set scripts.prebuild="npm run guard"     # 每次 build 前自動跑
#   或接 .husky/pre-commit，每次 commit 前自動跑
```

第一次跑出來通常會看到一堆「import-target-untracked」訊息 —— 那些都是你忘了 `git add` 的本地檔案，會在 CI 爆炸。**這個是 free 的價值**。

> ⚠️ **複製 ≠ 觸發**。第 4 步只是手動跑一次；第 5 步把它接進 `prebuild` / pre-commit hook，它才會**每次自動觸發**。只 copy 不接 hook = 那支檔案永遠不會自己跑。
>
> （這段講的是 `.mjs` 模板。這個 repo 現在**也**發 Claude skill 了（`scaffold/skills/` 的 architecture-completeness-guardian + trace-lock-modify + step-back-review）——那一層不是靠 hook、是靠 skill registry + 一條 CLAUDE.md 規則觸發。裝 skill 時務必放在第一層 `.claude/skills/<name>/SKILL.md`：Claude 的 registry 只認第一層、不掃 `.claude/skills/<分類>/<name>/` 子目錄，放錯一層 skill 就從清單消失。怎麼裝見 [`docs/onboarding-checklist.md`](./docs/onboarding-checklist.md)，放置規則細節見 [`adoption-fitness-check.md`](./adoption-fitness-check.md) §4。
>
> 還有一個關鍵警告：**skill 只是「提醒 AI」的 prompt，不是強制機制**——新開的 session 不保證一定自動觸發，這就是為什麼除了裝 skill 還要在 CLAUDE.md 加一條 hard rule 當第二道保險。skill 層「不保證什麼」全寫在 [`docs/known-limitations.md`](./docs/known-limitations.md)，裝之前先讀。）

### 路徑 2：你還沒踩過坑，先看哪些坑長什麼樣

照「症狀對照表」順序讀 markdown。每篇 ~10 分鐘。

讀完後你會有：
- 一份「我可能會踩什麼坑」的清單
- 知道每種坑該怎麼預防（每篇都有 Detection Rule 段）

---

## 第三個 skill：step-back-review（反向審查）

前面講的 guardian 和 trace-lock 都是「你要動手做某件事」的時候才觸發——方向全部是**往前衝**。step-back-review 是反方向的：它叫 AI 切換成「唱反調的審查者」，專門做一個人開發最缺的那件事——**退一步看全局、挑毛病、找出「改了 A 忘了 B」的洞**。

一個人寫程式沒有 reviewer、沒有 QA、沒有會跟你抬槓的 PM；這個 skill 就是讓 AI 補上那個「站在對立面的人」。你說「退一步看整體」「幫我挑毛病」「少了什麼直接列、先不要做」這類話時就會觸發。

整套體系是三件一組：

| 組件 | 檔案位置 | 角色 |
|---|---|---|
| skill 本體（六種審查鏡頭） | [`scaffold/skills/step-back-review/`](./scaffold/skills/step-back-review/) | 你開口時的深度反向審查（對抗 persona） |
| 哨兵 script | [`step-back-sentinel-template.mjs`](./step-back-sentinel-template.mjs) | 自動偵測「改了 A、忘了 B」的足跡；乾淨就閉嘴，只在有事時開口 |
| CLAUDE.md 規則 | [`scaffold/claude-md-rule-templates/rule-34-step-back-cadence.md`](./scaffold/claude-md-rule-templates/rule-34-step-back-cadence.md) | 接線：開 session 時 + 每 N 個 commit 自動跑哨兵，不用靠你記得 |

---

## 不要這樣做（給小白的提醒）

1. **不要一次把整個 repo 全部抄進專案**
   - 先抄 1 個檔，跑通了再說。一次全抄會迷路

2. **不要在「沒踩過第二次」之前就建治理規則**
   - 第一次踩坑 → 修
   - 第二次踩 → 寫規則擋
   - 沒踩過的坑不要預先治理（會浪費時間 + rule 會錯）

3. **不要把治理規則寫得太複雜**
   - 一條 rule 只擋一種 pattern
   - 複雜的 rule 寫不對、改不動、刪不掉，最後變成負擔

4. **不要強迫每個 commit 都要過所有 rule**
   - 緊急 hotfix 時用 `git commit --no-verify` 跳過是合理的
   - 過後再回頭補（規則是幫你的，不是綁你的）

5. **不要把這個 repo 的規則照抄當成「最佳實踐」**
   - 這些規則是**從一個咖啡 SaaS 專案抽出來的**
   - 你的專案有自己的 pattern，要自己生規則
   - 這個 repo 是「教你怎麼寫規則」，不是「給你規則用」

---

## 我是怎麼用這個 repo 的？（作者個人視角）

我是一個獨立開發者，做一個咖啡產業垂直整合的 SaaS。寫了一年半，累積了 31 條治理規則、52 個 skill、14 個 audit script。

這個 repo 是我從那一年半的踩坑經驗中抽出**跨專案通用的部分**。

我自己的使用方式：
- 每次踩第二次坑時，我會問自己「這條能不能變 universal pattern？」
- 能的話 → 抽進這個 repo + 補 anti-pattern markdown
- 不能的話 → 留在私有專案的 SKILL.md

你不用照著我做。**你只要在你的專案裡建一個 `governance-guard.mjs`、每次踩雷後加一條 rule，3 年後你就會有自己的 governance 體系。**

---

## 接下來

讀完這份指南後，建議順序：

1. 開 [`defensive-vs-offensive-governance.md`](./defensive-vs-offensive-governance.md) 讀 5 分鐘，建立「為什麼要治理」的腦袋
2. 開 [`breakpoint-taxonomy.md`](./breakpoint-taxonomy.md) 讀 10 分鐘，下次遇到 bug 時知道怎麼分類
3. 在你的專案 `scripts/` 拷一份 `governance-guard-template.mjs`，跑跑看出什麼結果
4. 過 1 個月後，發現自己踩到第二次同樣的坑 → 來這個 repo 看有沒有對應 anti-pattern
5. 如果沒有 → 在自己專案寫一條 rule + 寫一篇 anti-pattern markdown
6. 半年後回頭看自己累積的東西，可以挑去你的部落格 / Twitter 分享

---

## 相關 repo

當初規劃的 `claude-skills-goal-design` 已經上架了，改名叫 [`goal-workflow-designer`](https://github.com/dragon375014/goal-workflow-designer)——主題就是當初說的「怎麼設計一個有 rubric + 五元素的精確 goal prompt 給 AI 跑」。

這個 repo 現在是**五個公開 repo 工具鏈**的治理層（spec-sonar、specmit、goal-workflow-designer、agent-work-board、加上這裡）。完整地圖見 [specmit/ECOSYSTEM.md](https://github.com/dragon375014/specmit/blob/main/ECOSYSTEM.md)；想一個指令全裝，跑 `npx specmit init`。

---

## 問題 / 回饋

這份指南想做得讓「跟我一樣的腳色」用得起來。如果你讀完還是覺得「不知道從哪開始」、「這個檔在講什麼」、「某個比喻不懂」，歡迎在 GitHub 開 issue 告訴我，我會調整文字。

但請先讀 [CONTRIBUTING.md](./CONTRIBUTING.md) — issue / PR 政策是刻意保守的，不是因為我不歡迎，是因為我一個人沒辦法保證回覆速度。

歡迎 fork 後寫成你自己的版本。
