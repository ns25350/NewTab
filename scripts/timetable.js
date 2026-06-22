document.addEventListener("DOMContentLoaded", () => {
    const contentArea = document.getElementById("timetableContent");

    // あなたのFirebase Realtime DatabaseのURL
    const FIREBASE_URL = "https://johou7-275be-default-rtdb.firebaseio.com/timetable.json"; 

    if (contentArea) {
        fetchTimetableFromFirebase();
    }

    async function fetchTimetableFromFirebase() {
        try {
            const response = await fetch(FIREBASE_URL);
            if (!response.ok) throw new Error("Firebaseからのデータ取得に失敗しました");
            
            const data = await response.json();
            
            if (!data || !data.schedule) {
                contentArea.innerHTML = `
                    <p style='color:orange; font-size:14px; margin:0; text-align:center;'>時間割データがありません。</p>
                    <p style='font-size:11px; margin:4px 0 0 0; text-align:center;'>GASを実行してデータを送信してください。</p>
                `;
                return;
            }
            
            renderTimetable(data);
        } catch (error) {
            console.error("時間割取得エラー:", error);
            contentArea.innerHTML = `<p style='color:red; font-size:13px; margin:0; text-align:center;'>時間割の取得に失敗しました。<br><small>${error.message}</small></p>`;
        }
    }

    // 現在選択されているテーマカラー（blue, red, green等）を自動で判別する関数
    function getThemeSuffix() {
        const colors = ["blue", "red", "yellow", "green", "cyan", "pink", "orange", "purple", "silver", "brown", "peach", "dark"];
        
        const activeClasses = [...document.body.classList, ...document.documentElement.classList];
        for (const color of colors) {
            if (activeClasses.includes(color) || 
                document.documentElement.getAttribute("data-theme") === color || 
                document.body.getAttribute("data-theme") === color) {
                return `-${color}`;
            }
        }
        
        const saved = localStorage.getItem("theme") || localStorage.getItem("color") || localStorage.getItem("theme-color");
        if (saved && colors.includes(saved.toLowerCase())) {
            return `-${saved.toLowerCase()}`;
        }
        
        return "-blue";
    }

    // 表を作成して表示する関数
    function renderTimetable(data) {
        const suffix = getThemeSuffix();
        
        // 💡 外枠（コンテナ）を取得してスタイルを適用
        const container = document.getElementById("timetableCenterContainer");
        if (container) {
            container.style.background = `var(--accentLightTint${suffix})`;
            container.style.color = `var(--textColorDark${suffix})`;
            container.style.boxShadow = "none"; // 💡 影を完全に無くします
        }

        // 今日の日付の計算
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        const date = today.getDate();
        const shortDay = data.day.replace("曜", "");
        const dateString = `${year}年${month}月${date}日（${shortDay}）`;

        // タイトル部分
        let html = `<p style="font-weight: bold; margin-bottom: 12px; font-size: 15px; text-align: center; color: var(--textColorDark${suffix});">${dateString} の時間割</p>`;
        
        html += "<div style='overflow-x: auto; width: 100%; -webkit-overflow-scrolling: touch;'>";
        html += `<table style='display: table !important; width: 100% !important; border-collapse: collapse !important; font-size: 13px !important; text-align: center !important; table-layout: fixed !important;'>`;
        
        // 1行目（1限〜7限のラベル）：背景は「darkColor」、文字は「whitishColor」
        html += `<tr style='display: table-row !important; background: var(--darkColor${suffix}) !important; color: var(--whitishColor${suffix}) !important;'>`;
        data.schedule.forEach((_, index) => {
            html += `<th style='display: table-cell !important; border: 1px solid var(--accentLightTint${suffix}) !important; padding: 8px !important; font-weight: bold !important; min-width: 45px !important;'>${index + 1}限</th>`;
        });
        html += "</tr>";

        // 2行目（教科名）：背景は「whitishColor」、文字は「textColorDark」
        html += `<tr style='display: table-row !important; background: var(--whitishColor${suffix}) !important; color: var(--textColorDark${suffix}) !important;'>`;
        data.schedule.forEach((subject) => {
            html += `<td style='display: table-cell !important; border: 1px solid var(--accentLightTint${suffix}) !important; padding: 8px !important; word-break: break-all !important; white-space: normal !important; vertical-align: middle !important; font-weight: 500 !important;'>${subject || "―"}</td>`;
        });
        html += "</tr>";
        
        html += "</table></div>";
        contentArea.innerHTML = html;
    }
});
