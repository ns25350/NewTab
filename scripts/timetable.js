document.addEventListener("DOMContentLoaded", () => {
    const toggleButton = document.getElementById("timetableToggleCont");
    const container = document.getElementById("timetableContainer");
    const contentArea = document.getElementById("timetableContent");

    // 1. GAS（Google Apps Script）で「ウェブアプリとしてデプロイ」したURLに差し替えてください
    const GAS_API_URL = "https://script.google.com/macros/s/XXXXX/exec";

    // 2. ボタンをクリックしたら時間割の表示/非表示を切り替える
    toggleButton.addEventListener("click", () => {
        if (container.style.display === "none") {
            container.style.display = "block";
            fetchTimetable(); // 開いたときに最新データを取得
        } else {
            container.style.display = "none";
        }
    });

    // 3. GASのAPIから時間割を取得する関数
    async function fetchTimetable() {
        try {
            contentArea.innerHTML = "<p>データを取得中...</p>";
            
            const response = await fetch(GAS_API_URL);
            if (!response.ok) throw new Error("ネットワークエラーが発生しました");
            
            const data = await response.json(); // GAS側からJSONで返ってくる想定
            
            // 4. 取得したデータをテーブル形式（HTML）に組み立てる
            renderTimetable(data);
        } catch (error) {
            console.error("時間割の取得に失敗:", error);
            contentArea.innerHTML = "<p style='color:red;'>時間割の取得に失敗しました。</p>";
        }
    }

    // 5. HTMLを生成して画面に映す関数
    function renderTimetable(data) {
        // 例: GASから { "Monday": ["国語", "数学", ...], "Tuesday": [...] } のような形式で来ると仮定
        let html = "<table style='width:100%; border-collapse: collapse; margin-top:10px;'>";
        
        // 曜日のヘッダー
        html += "<tr><th style='border:1px solid #ccc; padding:8px;'>曜日</th><th style='border:1px solid #ccc; padding:8px;'>授業内容</th></tr>";

        for (const day in data) {
            const subjects = data[day].join(", "); // 配列をカンマ区切りの文字列にする
            html += `<tr>
                <td style='border:1px solid #ccc; padding:8px; font-weight:bold;'>${day}</td>
                <td style='border:1px solid #ccc; padding:8px;'>${subjects}</td>
            </tr>`;
        }
        html += "</table>";
        
        contentArea.innerHTML = html;
    }
});
