這個專案是一個 Slack 機器人，它使用 AI 模型來檢測訊息是否包含活動或會議資訊。如果有，它會提取活動詳情並回應使用者。

## 設定

- Node.js 版本最低要 20 以上。 
- slack app 相關的設定，請參考 slack 官方文件。[doc](https://api.slack.com/apps)
- google genai api key，請參考 google 官方文件。[doc](https://aistudio.google.com/app)

1. Clone Repository。
2. 使用 `npm install` 安裝 dependency。
3. 在 `.env` 檔案中設定您的環境變數。您將需要以下內容：
    - `SLACK_SIGNING_SECRET`
    - `SLACK_BOT_TOKEN`
    - `SLACK_BOLT_SERVER_PORT`
    - `LOCAL_MODEL_NAME`
    - `GOOGLE_GENAI_API_KEY`
4. 使用 `genkit start` 運行伺服器。

## 使用方法

一旦伺服器運行，機器人將在 Slack 上監聽訊息。如果訊息包含活動或會議資訊，機器人將回應活動詳情。

## 授權

[MIT](https://choosealicense.com/licenses/mit/)
