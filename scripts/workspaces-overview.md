# 全体構築・運用順序

## 概要

| 項目 | 内容 |
|---|---|
| 目的 | Managed AD、AD Connector、WorkSpacesと運用機能を、依存関係に沿って構築・確認します。 |
| 対象 | 閉域VDI基盤の構成例と、各サービスの構築・運用検証手順です。 |
| 設定値 | ページ内の値は検証例です。実作業では対象環境の承認済みパラメータへ置き換えます。 |

## 仕様

### 構成・動作

Managed ADが認証とDNSを提供し、AD Connectorを介してWorkSpacesを利用します。管理用EC2からユーザー、OU、権限委任、GPOを管理します。パッチ適用、コスト最適化、監視通知は、それぞれの管理対象と実行権限を確認して導入します。

### 管理範囲

AWS管理のドメインコントローラーとGPO、お客様が管理するEC2・OU・GPOを区別します。ドメインコントローラー用SG、管理用EC2のSG、AD ConnectorのSGは、それぞれDirectory ID、VPC、関連リソースを照合します。

## 前提条件

- VPCとサブネットのCIDR、異なる2つのAZ、接続経路、DNS、IAM権限を決定していること。
- VPCピアリングで使用するCIDRが重複せず、両方向のルートと必要な通信を設計していること。
- 作業対象のアカウント、リージョン、リソース、作業時間帯と切り戻し方法を確認していること。

## 構築作業

### 認証・ネットワークの準備

| 順序 | 作業 | 次へ進む条件 | 手順 |
|---|---|---|---|
| 1 | Managed ADを作成 | アクティブ、DNS IP、Directory ID、2サブネットを確認 | [① Managed AD構築](workspaces-managed-ad.html#managedAdBuild) |
| 2 | ユーザー・グループを準備 | 利用ユーザーと所属グループを確認 | [② ユーザー・グループ管理](workspaces-managed-ad.html#managedAdUsers) |
| 3 | 管理用EC2を起動・接続 | ドメイン参加とAD管理ツールの利用を確認 | [③ 管理用EC2](workspaces-management-ec2.html#managementEc2) |
| 4 | サービスアカウント、OU、権限委任を準備 | Connectorsの所属と対象OUのACLを確認 | [④ サービスアカウント・権限委任](workspaces-ad-connector.html#connectorDelegation) |
| 5 | VPCピアリング・ルート・DC用SGを設定 | SG変更後に2台のDNS／DCへの名前解決と通信を確認 | [⑤ ネットワークとAD Connector](workspaces-ad-connector.html#connectorBuild) |
| 6 | AD Connectorを作成 | アクティブ、接続先ドメイン、2サブネットを確認 | [⑤ AD Connector作成](workspaces-ad-connector.html#connectorBuild) |

### WorkSpaces・OU・GPO

| 順序 | 作業 | 次へ進む条件 | 手順 |
|---|---|---|---|
| 7 | AD ConnectorをWorkSpacesへ登録 | ディレクトリ登録とWorkSpaces用サブネットを確認 | [⑥ ディレクトリ登録](workspaces-provisioning-gpo.html#workspacesBuild) |
| 8 | ターゲットOUを設定 | 既存OUとConnectorsへの委任を照合し、DNを保存 | [⑦ ターゲットOU](workspaces-provisioning-gpo.html#workspacesOu) |
| 9 | パイロットWorkSpaceを作成・接続 | AVAILABLE、OU所属、クライアント接続を確認 | [⑥ WorkSpaces構築・接続](workspaces-provisioning-gpo.html#workspacesBuild) |
| 10 | GPOを作成・リンク | 管理テンプレート、GPO設定、対象OUのリンクを確認 | [⑧ GPO設定](workspaces-provisioning-gpo.html#workspacesGpo) |
| 11 | GPO適用と業務動作を確認 | gpupdate、gpresult、対象設定の実動作を確認 | [⑧ GPO適用確認](workspaces-provisioning-gpo.html#workspacesGpo) |

> **情報：OU準備とターゲットOU設定の順序**
>
> OU作成・権限委任は管理用EC2から先に実施できます。WorkSpaces側のターゲットOU設定はディレクトリ登録後、新規WorkSpaceの作成前に実施します。既存のOU・委任は再作成せず、同じ対象と設定内容を確認します。GPO適用確認はGPO作成後に実施します。

### イメージ・展開

| 順序 | 作業 | 次へ進む条件 | 手順 |
|---|---|---|---|
| 12 | 参照WorkSpaceを準備しImage Checkerを実行 | イメージ作成要件を満たし、全項目PASSED | [⑨ イメージ・バンドル](workspaces-image-bundle.html#workspacesImage) |
| 13 | カスタムイメージとバンドルを作成 | Image ID、Bundle ID、コンピュートと容量を確認 | [⑨ 作成・検証](workspaces-image-bundle.html#workspacesImage) |
| 14 | 検証用WorkSpaceで確認 | 接続、アプリ、OU、GPO、容量を確認 | [⑨ バンドル検証](workspaces-image-bundle.html#workspacesImage) |
| 15 | 必要な場合のみ他アカウントへ共有 | 共有先でイメージをコピーし、バンドルを作成・検証 | [⑨ 共有・共有解除](workspaces-image-bundle.html#workspacesImage) |

### 運用機能の構築

| 順序 | 作業 | 次へ進む条件 | 手順 |
|---|---|---|---|
| 16 | Systems Manager環境を構築 | IAM、通信、SSM Agent、マネージドノードを確認 | [⑩ Systems Manager環境構築](workspaces-patch-manager.html#systemsManagerBuild) |
| 17 | Patch Managerを設定 | ベースライン、タグ、対象、時間帯、出力先を確認 | [⑪ Patch Manager設定](workspaces-patch-manager.html#patchSettings) |
| 18 | Scan・Installを実行して確認 | コマンド結果、実際のKB適用、再起動、S3ログを照合 | [⑫ Patch Manager運用](workspaces-patch-manager.html#patchOperations) |
| 19 | Cost Optimizerを構築 | バージョンと設定を確認し、DryRun=Yesで構築 | [⑬ 構築・設定](workspaces-cost-optimizer.html#costOptimizerDeploy) |
| 20 | 初回レポートを確認し、必要に応じDry Run解除 | 対象・除外・しきい値・変更承認を確認 | [⑭ Dry Run解除](workspaces-cost-optimizer.html#costOptimizerSettings)・[⑯ レポート・監視](workspaces-cost-optimizer.html#costOptimizerReports) |
| 21 | 実行時刻の方針を確認 | UTC日内の重複実行を避け、CloudFormationで構成管理 | [⑮ 実行時刻変更方針](workspaces-cost-optimizer.html#costOptimizerSchedule) |
| 22 | CloudWatch・SNSを設定 | 対象メトリクス、しきい値、SNS購読・承認、通知先を確認 | [⑰ EC2・Windows監視／SNS](workspaces-cloudwatch-monitoring.html#cloudWatchEc2)・[⑱ WorkSpaces監視](workspaces-cloudwatch-monitoring.html#cloudWatchWorkSpaces) |

監視・通知は、対象リソースの作成後から並行して準備できます。本番運用へ移る前に、必要な監視と通知試験を完了します。

## 構築後確認

- [ ] Directory ID、DNS IP、VPC、サブネット、往復経路とSGが対象環境の設計と一致している
- [ ] WorkSpacesの接続、OU所属、GPO適用、アプリケーション動作を確認している
- [ ] カスタムバンドルを使用する場合は、そのバンドルから作成したWorkSpaceで検証している
- [ ] Patch Managerの処理成功と、実際に適用された更新・再起動を区別して記録している
- [ ] Cost Optimizerの設定変更と、変更後の実行結果を区別して確認している
- [ ] SNS購読・受信、アラーム履歴、メトリクスの最新時刻を確認している
- [ ] 未検証の項目は未確認として残し、実施担当者と確認時期を決定している
