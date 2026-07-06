document.addEventListener("DOMContentLoaded", () => {
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
    
    // クラス選択用
    const customSelectButton = document.getElementById("customSelectButton");
    const customSelectValue = document.getElementById("customSelectValue");
    const customSelectDropdown = document.getElementById("customSelectDropdown");
    const customSelectArrow = document.getElementById("customSelectArrow");
    
    // 💡 時刻選択用
    const timeSelectButton = document.getElementById("timeSelectButton");
    const timeSelectValue = document.getElementById("timeSelectValue");
    const timeSelectDropdown = document.getElementById("timeSelectDropdown");
    const timeSelectArrow = document.getElementById("timeSelectArrow");

    const FIREBASE_URL = "https://johou7-275be-default-rtdb.firebaseio.com/timetable.json"; 
    let globalTimetableData = null; 

    const isEnabled = localStorage.getItem("timetableEnabled") !== "false"; 
    const savedClass = localStorage.getItem("timetableClass") || "101";     
    const savedTime = localStorage.getItem("timetableSwitchTime") || "16:00"; 

    if(ttCheckbox) ttCheckbox.checked = isEnabled;
    if(customSelectValue) customSelectValue.innerText = savedClass;
    if(timeSelectValue) timeSelectValue.innerText = savedTime; // 時刻の初期表示
    if(ttClassField) ttClassField.style.display = isEnabled ? "flex" : "none";
    if(ttTimeField) ttTimeField.style.display = isEnabled ? "flex" : "none";
    if(container) container.style.display = isEnabled ? "block" : "none";

    const classList = [
        "101","102","103","104","105","106","107","108","109","110",
        "201","202","203","204","205/6文","205理","206理","207","208","209","210",
        "301","302","303","304","305","306","307","308","309","310"
    ];
    
    // 💡 選べる時刻のリスト（放課後によく切り替わる時間帯を用意）
    const timeList = ["14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "18:00", "19:00"];

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

    // 💡 両方のドロップダウンにテーマカラーを適用
    function applyThemeToDropdown(dropdown) {
        if (!dropdown) return;
        const suffix = getThemeSuffix();
        dropdown.style.background = `var(--accentLightTint${suffix})`;
        dropdown.style.color = `var(--textColorDark${suffix})`;
        if (suffix === "-dark") {
            dropdown.style.border = "1px solid rgba(255, 255, 255, 0.15)";
            dropdown.style.boxShadow = "0 -4px 25px rgba(0,0,0,0.5)";
        } else {
            dropdown.style.border = "1px solid rgba(0, 0, 0, 0.1)";
            dropdown.style.boxShadow = "0 -4px 20px rgba(0,0,0,0.15)";
        }
        const items = dropdown.querySelectorAll(".dropdown-item");
        items.forEach(item => { item.style.color = `var(--textColorDark${suffix})`; });
    }

    // ドロップダウンアイテムを生成する共通関数
    function populateDropdown(dropdown, list, valueElement, arrowElement, storageKey, onSelect) {
        if (!dropdown) return;
        list.forEach(val => {
            const item = document.createElement("div");
            item.innerText = val;
            item.className = "dropdown-item";
            item.style.cssText = "padding: 10px 16px; cursor: pointer; font-size: 14px; transition: background 0.2s, color 0.2s;";
            item.onmouseover = () => item.style.background = "rgba(128, 128, 128, 0.15)";
            item.onmouseout = () => item.style.background = "transparent";
            item.addEventListener("click", () => {
                valueElement.innerText = val;
                localStorage.setItem(storageKey, val);
                dropdown.style.display = "none";
                arrowElement.style.transform = "rotate(0deg)";
                if (onSelect) onSelect(val);
            });
            dropdown.appendChild(item);
        });
        applyThemeToDropdown(dropdown);
    }

    // クラスリストと時刻リストを生成
    populateDropdown(customSelectDropdown, classList, customSelectValue, customSelectArrow, "timetableClass", (cls) => {
        if (globalTimetableData) renderTimetable(globalTimetableData, cls);
    });
    
    populateDropdown(timeSelectDropdown, timeList, timeSelectValue, timeSelectArrow, "timetableSwitchTime", () => {
        if (globalTimetableData) {
            const currentClass = localStorage.getItem("timetableClass") || "101";
            renderTimetable(globalTimetableData, currentClass); // 時刻が変わったら表（今日か明日か）を再計算
        }
    });

    // ボタンの開閉処理（共通化）
    function setupDropdownToggle(button, dropdown, arrow) {
        if (!button) return;
        button.addEventListener("click", (e) => {
            e.stopPropagation();
            // 他のドロップダウンを閉じる
            if (customSelectDropdown && dropdown !== customSelectDropdown) {
                customSelectDropdown.style.display = "none";
                customSelectArrow.style.transform = "rotate(0deg)";
            }
            if (timeSelectDropdown && dropdown !== timeSelectDropdown) {
                timeSelectDropdown.style.display = "none";
                timeSelectArrow.style.transform = "rotate(0deg)";
            }
            
            const isOpen = dropdown.style.display === "block";
            if (!isOpen) {
                applyThemeToDropdown(dropdown);
                dropdown.style.display = "block";
                arrow.style.transform = "rotate(180deg)";
            } else {
                dropdown.style.display = "none";
                arrow.style.transform = "rotate(0deg)";
            }
        });
    }

    setupDropdownToggle(customSelectButton, customSelectDropdown, customSelectArrow);
    setupDropdownToggle(timeSelectButton, timeSelectDropdown, timeSelectArrow);

    document.addEventListener("click", () => {
        if (customSelectDropdown && customSelectDropdown.style.display === "block") {
            customSelectDropdown.style.display = "none";
            customSelectArrow.style.transform = "rotate(0deg)";
        }
        if (timeSelectDropdown && timeSelectDropdown.style.display === "block") {
            timeSelectDropdown.style.display = "none";
            timeSelectArrow.style.transform = "rotate(0deg)";
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

    if (isEnabled && contentArea) {
        fetchTimetableFromFirebase();
    }

    async function fetchTimetableFromFirebase() {
        try {
            const response = await fetch(FIREBASE_URL);
            if (!response.ok) throw new Error("Firebaseからのデータ取得に失敗しました");
            globalTimetableData = await response.json();
            
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

        const switchTimeStr = localStorage.getItem("timetableSwitchTime") || "16:00";
        const [switchHour, switchMin] = switchTimeStr.split(":").map(Number);
        const isAfterSwitch = now.getHours() > switchHour || (now.getHours() === switchHour && now.getMinutes() >= switchMin);

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

        let html = `<div id="timetableScrollContainer" style="display: flex; overflow-x: auto; width: 100%; scroll-snap-type: x mandatory; scroll-behavior: smooth; gap: 20px; padding-bottom: 5px;">`;
        html += buildTable(todayString, "今日", todayArray);
        html += buildTable(tomorrowString, "明日", tomorrowArray);
        html += `</div>`;
        
        html += `
        <div style="display: flex; justify-content: center; gap: 8px; margin-top: 8px;">
            <div id="dot-today" style="width: 7px; height: 7px; border-radius: 50%; background: ${!isAfterSwitch ? `var(--darkColor${suffix})` : `var(--accentLightTint${suffix})`}; transition: 0.3s; filter: brightness(0.9);"></div>
            <div id="dot-tomorrow" style="width: 7px; height: 7px; border-radius: 50%; background: ${isAfterSwitch ? `var(--darkColor${suffix})` : `var(--accentLightTint${suffix})`}; transition: 0.3s; filter: brightness(0.9);"></div>
        </div>
        `;
        
        contentArea.innerHTML = html;

        const scrollContainer = document.getElementById("timetableScrollContainer");
        if (scrollContainer) {
            if (isAfterSwitch) {
                scrollContainer.style.scrollBehavior = "auto";
                scrollContainer.scrollLeft = scrollContainer.offsetWidth + 20;
                scrollContainer.style.scrollBehavior = "smooth";
            }
            
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
