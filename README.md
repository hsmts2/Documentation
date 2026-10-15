# Documentation

AWS基盤、OS、IaC、運用に関する技術ドキュメントとプロフィール資料を掲載しています。

## 公開URL

https://hsmts2.github.io/Documentation/

## 公開方法

- GitHub Pagesの公開元はGitHub Actions
- `main`へのpushで`.github/workflows/pages.yml`を実行
- 配信対象はルートと`tutorials`のHTML、`.nojekyll`、`assets`内の公開用ファイル
- 作業用スクリプト、一時ファイル、編集用PowerPointはWebサイトに配信しない
- Cloudflare側の公開URLと自動ビルドは停止したまま維持

## 掲載内容

- プロフィール資料：職務経歴書
- 技術ドキュメント：Terraform、AWS、OS・ミドルウェア、リファレンス
- PoC：マルチVPC・閉域VDI基盤の構築と運用手順

## 執筆ルール

- 表記、見出し、情報パネルのルールは [CONTRIBUTING.md](CONTRIBUTING.md) を参照
- WorkSpaces技術移管ページは承認済み原稿の敬体・句点を維持し、一括整形の対象から除外
- 公開HTMLの参照先と重複IDは `python scripts/audit-public-pages.py` で確認
- ナビゲーションとページ内リンクは `powershell -File scripts/check-page-links.ps1` で確認
- 通常記事の文体は `powershell -File scripts/check-writing-style.ps1` で確認

## AWS設計シリーズ

- 公開対象：コンピューティング設計、命名規則・タグ設計
- 入口：[`tutorials/aws-design-compute.html`](tutorials/aws-design-compute.html)
- その他5ページは公開停止用HTMLとし、本文は`scripts/build-aws-design.py`に保持する。再公開時は同ファイルの`PUBLISHED`と一覧・ホームの設定を更新する
- 構成・コンピューティング・DB・ストレージ・AL2023・ログ／監視／可用性・命名／タグの7ページ
- 設計例と公式仕様を整理した資料であり、実機試験済みの構成や実案件の実績を示すものではない
- 本文とSVG構成図の編集元：`scripts/build-aws-design.py`
- 再生成：`python scripts/build-aws-design.py` → `pwsh -File scripts/sync-page-list.ps1` → `pwsh -File scripts/sync-home-groups.ps1`
- 日本語を含むUTF-8のPowerShellスクリプトはPowerShell 7（`pwsh`）で実行する
