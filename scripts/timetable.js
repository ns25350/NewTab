document.addEventListener("DOMContentLoaded", () => {
    const toggleButton = document.getElementById("timetableToggleCont");
    const container = document.getElementById("timetableContainer");
    const contentArea = document.getElementById("timetableContent");

    // 1. GAS（Google Apps Script）で「ウェブアプリとしてデプロイ」したURLに差し替えてください
    const GAS_API_URL = "https://script.google.com/a/macros/isk.ed.jp/s/AKfycbyCnh63cv6b-BGXrCdHufYbXO5ALM99clAzxMkoUOWnSuc5GxneXd9NU2iWy3v45cPi/exec";

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
            
            const response = await fetch(GAS_API_URL, {
                method: "GET",
                credentials: "include" // 💡組織内認証を通すためにこれが必要になります
            });
            if (!response.ok) throw new Error("ネットワークエラーが発生しました");
            
            const data = await response.json(); // GAS側からJSONで返ってくる想定
            
            // 4. 取得したデータをテーブル形式（HTML）に組み立てる
            renderTimetable(data);
        } catch (error) {
            console.error("時間割の取得に失敗:", error);
            contentArea.innerHTML = "<p style='color:red;'>時間割の取得に失敗しました。</p>";
        }
    }

    // 5. HTMLを生成して画面に映す関数（1限〜7限の縦並び表示）
    function renderTimetable(data) {
        if (data.error) {
            contentArea.innerHTML = `<p style='color:orange;'>${data.error}</p>`;
            return;
        }

        let html = `<p style="font-weight: bold; margin-bottom: 8px;">本日（${data.day}）の時間割</p>`;
        html += "<table style='width:100%; border-collapse: collapse; margin-top:5px;'>";
        
        // ヘッダー
        html += "<tr><th style='border:1px solid #ccc; padding:6px; width:25%;'>時限</th><th style='border:1px solid #ccc; padding:6px;'>授業内容</th></tr>";

        // 1時間目〜7時間目のデータをループで回す
        data.schedule.forEach((subject, index) => {
            html += `<tr>
                <td style='border:1px solid #ccc; padding:6px; text-align:center; font-weight:bold;'>${index + 1}限</td>
                <td style='border:1px solid #ccc; padding:6px;'>${subject}</td>
            </tr>`;
        });
        
        html += "</table>";
        
        contentArea.innerHTML = html;
    }
});
