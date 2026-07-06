document.addEventListener("DOMContentLoaded", () => {
    // 💡 スクロールバーを見えなくする（スマホアプリ風にする）CSSを自動追加
    if (!document.getElementById("hideScrollbarStyle")) {
        const style = document.createElement("style");
        style.id = "hideScrollbarStyle";
        style.innerHTML = `#timetableScrollContainer::-webkit-scrollbar { display: none; } #timetableScrollContainer { -ms-overflow-style: none; scrollbar-width: none; }`;
        document.head.appendChild(style);
    }

    const contentArea = document.getElementById("timetableContent");
    const container = document.getElementById("timetableCenterContainer");
    
    const ttCheckbox = document.getElementById("timetableCheckbox");
    const ttClassField = document.getElementById("timetableClassField");
    const ttTimeField = document.getElementById("timetableTimeField");
    
    const customSelectButton = document.getElementById("customSelectButton");
    const customSelectValue = document.getElementById("customSelectValue");
    const customSelectDropdown = document.getElementById("customSelectDropdown");
    const customSelectArrow = document.getElementById("customSelectArrow");
    
    const ttSwitchTime = document.getElementById("timetableSwitchTime"); // 時刻入力

    const FIREBASE_URL = "https://johou7-275be-default-rtdb.firebaseio.com/timetable.json"; 
    let globalTimetableData = null; 

    const isEnabled = localStorage.getItem("timetableEnabled") !== "false"; 
    const savedClass = localStorage.getItem("timetableClass") || "101";     
    const savedTime = localStorage.getItem("timetableSwitchTime") || "16:00"; // デフォルト16:00

    if(ttCheckbox) ttCheckbox.checked = isEnabled;
    if(customSelectValue) customSelectValue.innerText = savedClass;
    if(ttSwitchTime) ttSwitchTime.value = savedTime;
    if(ttClassField) ttClassField.style.display = isEnabled ? "flex" : "none";
    if(ttTimeField) ttTimeField.style.display = isEnabled ? "flex" : "none";
    if(container) container.style.display = isEnabled ? "block" : "none";

    const classList = [
        "101","102","103","104","105","106","107","108","109","110",
        "201","202","203","204","205/6文","205理","206理","207","208","209","210",
        "301","302","303","304","305","306","307","308","309","310"
    ];

    function getThemeSuffix() {
        const colors = ["blue", "red", "yellow", "green", "cyan", "pink", "orange", "purple", "silver", "brown", "peach", "dark"];
        const activeClasses = [...document.body.classList, ...document.documentElement.classList];
        for (const color of colors) {
            if (activeClasses.includes(color) || document.documentElement.getAttribute("data-theme") === color || document.body.getAttribute("data-theme") === color) {
                return `-${color}`;
            }
        }
        const saved = localStorage.getItem("theme") || localStorage.getItem("color") || localStorage.getItem("theme-color");
        if (saved && colors.includes(saved.toLowerCase())) return `-${saved.toLowerCase()}`;
        return "-blue";
    }

    function updateDropdownTheme() {
        if (!customSelectDropdown) return;
        const suffix = getThemeSuffix();
        customSelectDropdown.style.background = `var(--accentLightTint${suffix})`;
        customSelectDropdown.style.color = `var(--textColorDark${suffix})`;
        if (suffix === "-dark") {
            customSelectDropdown.style.border = "1px solid rgba(255, 255, 255, 0.15)";
            customSelectDropdown.style.boxShadow = "0 -4px 25px rgba(0,0,0,0.5)";
        } else {
            customSelectDropdown.style.border = "1px solid rgba(0, 0, 0, 0.1)";
            customSelectDropdown.style.boxShadow = "0 -4px 20px rgba(0,0,0,0.15)";
        }
        const items = customSelectDropdown.querySelectorAll(".dropdown-item");
        items.forEach(item => { item.style.color = `var(--textColorDark${suffix})`; });
    }

    if (customSelectDropdown) {
        classList.forEach(cls => {
            const item = document.createElement("div");
            item.innerText = cls;
            item.className = "dropdown-item";
            item.style.cssText = "padding: 10px 16px; cursor: pointer; font-size: 14px; transition: background 0.2s, color 0.2s;";
            item.onmouseover = () => item.style.background = "rgba(128, 128, 128, 0.15)";
            item.onmouseout = () => item.style.background = "transparent";
            item.addEventListener("click", () => {
                customSelectValue.innerText = cls;
                localStorage.setItem("timetableClass", cls);
                customSelectDropdown.style.display = "none";
                customSelectArrow.style.transform = "rotate(0deg)";
                if (globalTimetableData) renderTimetable(globalTimetableData, cls);
            });
            customSelectDropdown.appendChild(item);
        });
        updateDropdownTheme();
    }

    if (customSelectButton) {
        customSelectButton.addEventListener("click", (e) => {
            e.stopPropagation();
            const isOpen = customSelectDropdown.style.display === "block";
            if (!isOpen) {
                updateDropdownTheme();
                customSelectDropdown.style.display = "block";
                customSelectArrow.style.transform = "rotate(180deg)";
            } else {
                customSelectDropdown.style.display = "none";
                customSelectArrow.style.transform = "rotate(0deg)";
            }
        });
    }

    document.addEventListener("click", () => {
        if (customSelectDropdown && customSelectDropdown.style.display === "block") {
            customSelectDropdown.style.display = "none";
            customSelectArrow.style.transform = "rotate(0deg)";
        }
    });

    if(ttCheckbox) {
        ttCheckbox.addEventListener("change", (e) => {
            const checked = e.target.checked;
            localStorage.setItem("timetableEnabled", checked);
            ttClassField.style.display = checked ? "flex" : "none";
            ttTimeField.style.display = checked ? "flex" : "none";
            if (container) container.style.display = checked ? "block" : "none";
            if (checked && !globalTimetableData) fetchTimetableFromFirebase();
        });
    }
    
    // 💡 切り替え時刻が変更されたら保存して再描画
    if (ttSwitchTime) {
        ttSwitchTime.addEventListener("change", (e) => {
            localStorage.setItem("timetableSwitchTime", e.target.value);
            if (globalTimetableData) {
                const currentClass = localStorage.getItem("timetableClass") || "101";
                renderTimetable(globalTimetableData, currentClass);
            }
        });
    }

    if (isEnabled && contentArea) {
        fetchTimetableFromFirebase();
    }

    async function fetchTimetableFromFirebase() {
        try {
            const response = await fetch(FIREBASE_URL);
            if (!response.ok) throw new Error("Firebaseからのデータ取得に失敗しました");
            globalTimetableData = await response.json();
            
            // データ構造が変わったため schedules の存在を確認
            if (!globalTimetableData || !globalTimetableData.schedules) {
                contentArea.innerHTML = `<p style='color:orange; font-size:14px; margin:0; text-align:center;'>データ構造が新しくなりました。GASで「実行」を押してデータを更新してください。</p>`;
                return;
            }
            const currentClass = localStorage.getItem("timetableClass") || "101";
            renderTimetable(globalTimetableData, currentClass);
        } catch (error) {
            console.error("時間割取得エラー:", error);
            if(contentArea) contentArea.innerHTML = `<p style='color:red; font-size:13px; margin:0; text-align:center;'>時間割の取得に失敗しました。<br><small>${error.message}</small></p>`;
        }
    }

    // 💡 表を描画するメイン機能
    function renderTimetable(data, targetClass) {
        if (!contentArea) return;
        const suffix = getThemeSuffix();
        
        if (container) {
            container.style.background = `var(--accentLightTint${suffix})`;
            container.style.color = `var(--textColorDark${suffix})`;
            container.style.boxShadow = "none";
        }

        const daysOfWeek = ["日曜", "月曜", "火曜", "水曜", "木曜", "金曜", "土曜"];
        const now = new Date();
        
        // 曜日と日付の計算（今日と明日）
        const todayIndex = now.getDay();
        const tomorrowIndex = (todayIndex + 1) % 7;
        const todayName = daysOfWeek[todayIndex];
        const tomorrowName = daysOfWeek[tomorrowIndex];
        
        const searchClass = targetClass.replace("/", "_");
        const todayArray = (data.schedules[todayName] || {})[searchClass] || [];
        const tomorrowArray = (data.schedules[tomorrowName] || {})[searchClass] || [];

        const tYear = now.getFullYear(), tMonth = now.getMonth() + 1, tDate = now.getDate();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tmYear = tomorrow.getFullYear(), tmMonth = tomorrow.getMonth() + 1, tmDate = tomorrow.getDate();
        
        const todayString = `${tYear}年${tMonth}月${tDate}日（${todayName.replace("曜","")}）`;
        const tomorrowString = `${tmYear}年${tmMonth}月${tmDate}日（${tomorrowName.replace("曜","")}）`;

        // 時刻判定
        const switchTimeStr = localStorage.getItem("timetableSwitchTime") || "16:00";
        const [switchHour, switchMin] = switchTimeStr.split(":").map(Number);
        const isAfterSwitch = now.getHours() > switchHour || (now.getHours() === switchHour && now.getMinutes() >= switchMin);

        // 表を作るヘルパー関数
        function buildTable(dateStr, label, scheduleArray) {
            let t = `<div style="min-width: 100%; scroll-snap-align: center; flex: 0 0 100%; box-sizing: border-box;">`;
            t += `<p style="font-weight: bold; margin-bottom: 12px; font-size: 15px; text-align: center; color: var(--textColorDark${suffix});">${dateStr} ${targetClass} <span style="font-size:11px; opacity:0.8;">(${label})</span></p>`;
            t += `<table style='display: table !important; width: 100% !important; border-collapse: collapse !important; font-size: 13px !important; text-align: center !important; table-layout: fixed !important;'>`;
            t += `<tr style='display: table-row !important; background: var(--darkColor${suffix}) !important; color: var(--whitishColor${suffix}) !important;'>`;
            for (let i = 0; i < 7; i++) {
                t += `<th style='display: table-cell !important; border: 1px solid var(--accentLightTint${suffix}) !important; padding: 8px !important; font-weight: bold !important; min-width: 45px !important;'>${i + 1}限</th>`;
            }
            t += "</tr><tr style='display: table-row !important; background: var(--whitishColor${suffix}) !important; color: var(--textColorDark${suffix}) !important;'>";
            for (let i = 0; i < 7; i++) {
                const subject = scheduleArray[i] || "―";
                t += `<td style='display: table-cell !important; border: 1px solid var(--accentLightTint${suffix}) !important; padding: 8px !important; word-break: break-all !important; white-space: normal !important; vertical-align: middle !important; font-weight: 500 !important;'>${subject}</td>`;
            }
            t += "</tr></table></div>";
            return t;
        }

        // 💡 2日分を横並びスクロールコンテナに入れる
        let html = `<div id="timetableScrollContainer" style="display: flex; overflow-x: auto; width: 100%; scroll-snap-type: x mandatory; scroll-behavior: smooth; gap: 20px; padding-bottom: 5px;">`;
        html += buildTable(todayString, "今日", todayArray);
        html += buildTable(tomorrowString, "明日", tomorrowArray);
        html += `</div>`;
        
        // 💡 下のドットインジケーター（どっちを見ているか分かるように）
        html += `
        <div style="display: flex; justify-content: center; gap: 8px; margin-top: 8px;">
            <div id="dot-today" style="width: 7px; height: 7px; border-radius: 50%; background: ${!isAfterSwitch ? `var(--darkColor${suffix})` : `var(--accentLightTint${suffix})`}; transition: 0.3s; filter: brightness(0.9);"></div>
            <div id="dot-tomorrow" style="width: 7px; height: 7px; border-radius: 50%; background: ${isAfterSwitch ? `var(--darkColor${suffix})` : `var(--accentLightTint${suffix})`}; transition: 0.3s; filter: brightness(0.9);"></div>
        </div>
        `;
        
        contentArea.innerHTML = html;

        // 💡 時間を過ぎていたら、瞬時に「明日」へスクロールさせる
        const scrollContainer = document.getElementById("timetableScrollContainer");
        if (scrollContainer) {
            if (isAfterSwitch) {
                scrollContainer.style.scrollBehavior = "auto"; // アニメーションなしで
                scrollContainer.scrollLeft = scrollContainer.offsetWidth + 20; // 明日へ移動
                scrollContainer.style.scrollBehavior = "smooth"; // スムーズをオンに戻す
            }
            
            // スワイプ時にドットの色を変える
            scrollContainer.addEventListener("scroll", () => {
                const dotToday = document.getElementById("dot-today");
                const dotTomorrow = document.getElementById("dot-tomorrow");
                if (dotToday && dotTomorrow) {
                    const scrolledHalf = scrollContainer.scrollLeft > (scrollContainer.offsetWidth / 2);
                    dotToday.style.background = scrolledHalf ? `var(--accentLightTint${suffix})` : `var(--darkColor${suffix})`;
                    dotTomorrow.style.background = scrolledHalf ? `var(--darkColor${suffix})` : `var(--accentLightTint${suffix})`;
                }
            });
        }
    }
});
