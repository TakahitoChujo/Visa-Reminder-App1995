# iOS実機インストール手順（Ad Hoc配布）

**最終更新**: 2026-02-23

---

## 前提条件

- デバイスのUDIDがAd Hocプロビジョニングプロファイルに登録済みであること
- Expoアカウント（toyland）にログイン済みであること

---

## Step 1: ビルドを作成する

```powershell
cd c:\projects\visa-reminder-app\frontend
npx eas-cli build --platform ios --profile preview
```

ビルド完了後、以下のようなURLが表示される：
```
See logs: https://expo.dev/accounts/toyland/projects/residence-reminder/builds/<BUILD_ID>
```

---

## Step 2: iPhoneにインストールする

### 方法A: PCのブラウザ経由（推奨）

1. PCのブラウザで以下を開く：
   ```
   https://expo.dev/accounts/toyland/projects/residence-reminder/builds/<BUILD_ID>
   ```
2. **「Install」** ボタンをクリック → QRコードが表示される
3. iPhoneの **カメラアプリ** でQRコードを読み取る
4. Safariで開いてインストール

### 方法B: iPhoneのSafariで直接アクセス

1. iPhoneの **Safari**（必ずSafari）で以下を入力：
   ```
   https://expo.dev/accounts/toyland/projects/residence-reminder/builds/<BUILD_ID>
   ```
2. **「Install」** ボタンをタップ → インストール開始

> ⚠️ Chrome・LINE内ブラウザ等はNG。必ずSafariを使うこと。

---

## Step 3: アプリを信頼する（初回のみ）

インストール後、起動できない場合は以下を実施：

1. **設定** アプリを開く
2. **一般** → **VPNとデバイス管理**
3. 「開発元のApp」に表示されている名前をタップ
4. **「信頼」** をタップ

これでアプリが起動できるようになる。

---

## 最新ビルド一覧

| 日付 | プロファイル | Build ID | buildNumber | 備考 |
|------|------------|----------|-------------|------|
| 2026-02-23 | preview | 97c7ba45-f4b9-449c-9580-695bb5c2d0f3 | 11 | チェック修正・表示変更 |
| 2026-02-23 | production | f7e15bd4-932a-47b6-b3a5-75e18aafac96 | 12 | 旧ビルド |
| 2026-02-23 | production | 6112b6b5-7611-4943-8f7a-818b767dd9a9 | 13 | チェックリスト充実・申請書テンプレート・共有機能 ✅ App Store申請済み |

---

## トラブルシューティング

| 症状 | 対処 |
|------|------|
| Install ボタンが押せない | Safariを使っているか確認 |
| インストール後に起動できない | Step 3の「信頼」設定を実施 |
| 「このデバイスには対応していません」エラー | UDIDがプロビジョニングプロファイルに未登録 → 再ビルドが必要 |
| `eas` コマンドが見つからない | `npx eas-cli` を使う |
| `eas build:run` が止まる | WindowsはiOS向け `build:run` 非対応 → Safari経由でインストール |
