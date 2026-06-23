document.addEventListener("DOMContentLoaded", () => {
    const contentArea = document.getElementById("timetableContent");
    const container = document.getElementById("timetableCenterContainer");
    
    const ttCheckbox = document.getElementById("timetableCheckbox");
    const ttClassField = document.getElementById("timetableClassField");
    
    const customSelectButton = document.getElementById("customSelectButton");
    const customSelectValue = document.getElementById("customSelectValue");
    const customSelectDropdown = document.getElementById("customSelectDropdown");
    const customSelectArrow = document.getElementById("customSelectArrow");

    const FIREBASE_URL = "https://johou7-275be-default-rtdb.firebaseio.com/timetable.json"; 
    let globalTimetableData = null; 

    const isEnabled = localStorage.getItem("timetableEnabled") !== "false"; 
    const savedClass = localStorage.getItem("timetableClass") || "101";     

    if(ttCheckbox) ttCheckbox.checked = isEnabled;
    if(customSelectValue) customSelectValue.innerText = savedClass;
    if(ttClassField) ttClassField.style.display = isEnabled ? "flex" : "none";
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

    // 💡 ドロップダウンリストのテーマカラーを更新する関数
    function updateDropdownTheme() {
        if (!customSelectDropdown) return;
        const suffix = getThemeSuffix();
        
        // 背景色をテーマの明るい色、文字色を濃い色に動的設定
        customSelectDropdown.style.background = `var(--accentLightTint${suffix})`;
        customSelectDropdown.style.color = `var(--textColorDark${suffix})`;
        
        // ダークテーマのみ見えにくくなるのを防ぐため影や枠を微調整
        if (suffix === "-dark") {
            customSelectDropdown.style.border = "1px solid rgba(255, 255, 255, 0.15)";
            customSelectDropdown.style.boxShadow = "0 -4px 25px rgba(0,0,0,0.5)";
        } else {
            customSelectDropdown.style.border = "1px solid rgba(0, 0, 0, 0.1)";
            customSelectDropdown.style.boxShadow = "0 -4px 20px rgba(0,0,0,0.15)";
        }

        // 子要素（各クラスのアイテム）の文字色も統一
        const items = customSelectDropdown.querySelectorAll(".dropdown-item");
        items.forEach(item => {
            item.style.color = `var(--textColorDark${suffix})`;
        });
    }

    if (customSelectDropdown) {
        classList.forEach(cls => {
            const item = document.createElement("div");
            item.innerText = cls;
            item.className = "dropdown-item"; // テーマ適用のためのクラス
            item.style.cssText = "padding: 10px 16px; cursor: pointer; font-size: 14px; transition: background 0.2s, color 0.2s;";
            
            // ホバー時の背景（少し半透明のグレー等でブレンド）
            item.onmouseover = () => item.style.background = "rgba(128, 128, 128, 0.15)";
            item.onmouseout = () => item.style.background = "transparent";
            
            item.addEventListener("click", () => {
                customSelectValue.innerText = cls;
                localStorage.setItem("timetableClass", cls);
                
                customSelectDropdown.style.display = "none";
                customSelectArrow.style.transform = "rotate(0deg)";
                
                if (globalTimetableData) {
                    renderTimetable(globalTimetableData, cls);
                }
            });
            customSelectDropdown.appendChild(item);
        });
        // 最初期化時の色合わせ
        updateDropdownTheme();
    }

    if (customSelectButton) {
        customSelectButton.addEventListener("click", (e) => {
            e.stopPropagation();
            const isOpen = customSelectDropdown.style.display === "block";
            
            if (!isOpen) {
                // 💡 開く直前に最新のテーマカラーを読み込んで適用する
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
            if (container) container.style.display = checked ? "block" : "none";
            
            if (checked && !globalTimetableData) {
                fetchTimetableFromFirebase();
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
            
            if (!globalTimetableData || !globalTimetableData.schedules) {
                contentArea.innerHTML = `<p style='color:orange; font-size:14px; margin:0; text-align:center;'>時間割データがありません。GASを実行してください。</p>`;
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

        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        const date = today.getDate();
        const shortDay = data.day ? data.day.replace("曜", "") : "―";
        const dateString = `${year}年${month}月${date}日（${shortDay}）`;

        const searchClass = targetClass.replace("/", "_");
        const scheduleArray = data.schedules[searchClass] || [];

        let html = `<p style="font-weight: bold; margin-bottom: 12px; font-size: 15px; text-align: center; color: var(--textColorDark${suffix});">${dateString} ${targetClass}の時間割</p>`;
        
        html += "<div style='overflow-x: auto; width: 100%; -webkit-overflow-scrolling: touch;'>";
        html += `<table style='display: table !important; width: 100% !important; border-collapse: collapse !important; font-size: 13px !important; text-align: center !important; table-layout: fixed !important;'>`;
        
        html += `<tr style='display: table-row !important; background: var(--darkColor${suffix}) !important; color: var(--whitishColor${suffix}) !important;'>`;
        for (let i = 0; i < 7; i++) {
            html += `<th style='display: table-cell !important; border: 1px solid var(--accentLightTint${suffix}) !important; padding: 8px !important; font-weight: bold !important; min-width: 45px !important;'>${i + 1}限</th>`;
        }
        html += "</tr>";

        html += `<tr style='display: table-row !important; background: var(--whitishColor${suffix}) !important; color: var(--textColorDark${suffix}) !important;'>`;
        for (let i = 0; i < 7; i++) {
            const subject = scheduleArray[i] || "―";
            html += `<td style='display: table-cell !important; border: 1px solid var(--accentLightTint${suffix}) !important; padding: 8px !important; word-break: break-all !important; white-space: normal !important; vertical-align: middle !important; font-weight: 500 !important;'>${subject}</td>`;
        }
        html += "</tr>";
        
        html += "</table></div>";
        contentArea.innerHTML = html;
    }
});
