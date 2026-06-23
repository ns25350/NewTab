document.addEventListener("DOMContentLoaded", () => {
    const contentArea = document.getElementById("timetableContent");
    const container = document.getElementById("timetableCenterContainer");
    
    // 設定画面の要素
    const ttCheckbox = document.getElementById("timetableCheckbox");
    const ttClassField = document.getElementById("timetableClassField");
    const ttSelect = document.getElementById("timetableClassSelect");

    const FIREBASE_URL = "https://johou7-275be-default-rtdb.firebaseio.com/timetable.json"; 
    let globalTimetableData = null; // Firebaseのデータを一時保存する変数

    // 💡 ローカルストレージから設定を読み込む
    const isEnabled = localStorage.getItem("timetableEnabled") !== "false"; // デフォルトはON
    const savedClass = localStorage.getItem("timetableClass") || "101";     // デフォルトは101

    // 初期状態をUIに反映
    if(ttCheckbox) ttCheckbox.checked = isEnabled;
    if(ttSelect) ttSelect.value = savedClass;
    if(ttClassField) ttClassField.style.display = isEnabled ? "flex" : "none";
    if(container) container.style.display = isEnabled ? "block" : "none";

    // 💡 設定スイッチを切り替えた時の処理
    if(ttCheckbox) {
        ttCheckbox.addEventListener("change", (e) => {
            const checked = e.target.checked;
            localStorage.setItem("timetableEnabled", checked);
            ttClassField.style.display = checked ? "flex" : "none";
            if (container) container.style.display = checked ? "block" : "none";
            
            // ONにした時にデータがまだ無ければ取得
            if (checked && !globalTimetableData) {
                fetchTimetableFromFirebase();
            }
        });
    }

    // 💡 クラス選択を変更した時の処理
    if(ttSelect) {
        ttSelect.addEventListener("change", (e) => {
            const selectedClass = e.target.value;
            localStorage.setItem("timetableClass", selectedClass);
            // 既にデータ取得済みなら、すぐ再描画する
            if (globalTimetableData) {
                renderTimetable(globalTimetableData, selectedClass);
            }
        });
    }

    // ONなら最初にデータを取得
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
            
            // 現在選択されているクラスで描画
            const currentClass = localStorage.getItem("timetableClass") || "101";
            renderTimetable(globalTimetableData, currentClass);
        } catch (error) {
            console.error("時間割取得エラー:", error);
            if(contentArea) contentArea.innerHTML = `<p style='color:red; font-size:13px; margin:0; text-align:center;'>時間割の取得に失敗しました。<br><small>${error.message}</small></p>`;
        }
    }

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

    // 💡 表を描画する関数（クラスを引数に追加）
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

        // 選んだクラスの配列を取得（無ければ空にする）
        const scheduleArray = data.schedules[targetClass] || [];

        let html = `<p style="font-weight: bold; margin-bottom: 12px; font-size: 15px; text-align: center; color: var(--textColorDark${suffix});">${dateString} ${targetClass}の時間割</p>`;
        
        html += "<div style='overflow-x: auto; width: 100%; -webkit-overflow-scrolling: touch;'>";
        html += `<table style='display: table !important; width: 100% !important; border-collapse: collapse !important; font-size: 13px !important; text-align: center !important; table-layout: fixed !important;'>`;
        
        // 1行目：1限〜7限
        html += `<tr style='display: table-row !important; background: var(--darkColor${suffix}) !important; color: var(--whitishColor${suffix}) !important;'>`;
        for (let i = 0; i < 7; i++) {
            html += `<th style='display: table-cell !important; border: 1px solid var(--accentLightTint${suffix}) !important; padding: 8px !important; font-weight: bold !important; min-width: 45px !important;'>${i + 1}限</th>`;
        }
        html += "</tr>";

        // 2行目：教科名
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
