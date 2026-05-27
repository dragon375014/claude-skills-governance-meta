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
```

第一次跑出來通常會看到一堆「import-target-untracked」訊息 —— 那些都是你忘了 `git add` 的本地檔案，會在 CI 爆炸。**這個是 free 的價值**。

### 路徑 2：你還沒踩過坑，先看哪些坑長什麼樣

照「症狀對照表」順序讀 markdown。每篇 ~10 分鐘。

讀完後你會有：
- 一份「我可能會踩什麼坑」的清單
- 知道每種坑該怎麼預防（每篇都有 Detection Rule 段）

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

## 相關 repo（未來會有）

我規劃中的下一個 OSS 小 repo 是 `claude-skills-goal-design`，主題是「怎麼設計一個有 rubric + 五元素的精確 goal prompt 給 AI 跑」。等那個 repo 上架後，這裡會加 cross-link。

---

## 問題 / 回饋

這份指南想做得讓「跟我一樣的腳色」用得起來。如果你讀完還是覺得「不知道從哪開始」、「這個檔在講什麼」、「某個比喻不懂」，歡迎在 GitHub 開 issue 告訴我，我會調整文字。

但請先讀 [CONTRIBUTING.md](./CONTRIBUTING.md) — issue / PR 政策是刻意保守的，不是因為我不歡迎，是因為我一個人沒辦法保證回覆速度。

歡迎 fork 後寫成你自己的版本。
