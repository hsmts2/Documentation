"""Build the AWS design notes; edit this source before regenerating HTML."""
from pathlib import Path
from html import escape
import re
import json
import sys

ROOT = Path(__file__).resolve().parent.parent
PAGES = [
    ('aws-design', 'AWS基本設計・アーキテクチャ', '業務要件から構成を選び、判断理由・リスク・受入条件を残すための設計例をまとめる'),
    ('aws-design-compute', 'コンピューティング設計', 'EC2、ECS、Lightsail、Amplify、S3とCloudFrontを、実行方式と運用責任から選定する'),
    ('aws-design-database', 'データベース設計', 'アプリケーション互換性を起点に、DBの可用性・性能・復旧方式を決める'),
    ('aws-design-storage', 'ストレージ設計', 'ブロック・ファイル・オブジェクトの違いから保存先を選び、性能と復旧を設計する'),
    ('aws-design-os', 'OS・ミドルウェア設計', 'OSの標準機能とミドルウェアの提供バージョンを確認し、互換性・保守期限・定期処理・ログ保存を設計する'),
    ('aws-design-observability', 'ログ・監視・可用性設計', 'SLAと業務の稼働目標を区別し、ログ収集・障害検知・復旧確認までを設計する'),
    ('aws-design-governance', '命名規則・タグ設計', '名前とタグの役割を分け、識別・費用配賦・権限制御・例外管理のルールを決める'),
]

PUBLISHED = {'aws-design-compute', 'aws-design-governance'}

def p(s): return '<p>' + s + '</p>\n'
def h(i,s): return f'<h2 id="{i}">{s}</h2>\n'
# Keep verification references in the editable source, without displaying them.
def source(url,label): return ''
def table(headers,rows):
    return '<p class="design-table-hint">表は横にスクロールして確認できる</p><div class="table-scroll" tabindex="0" role="region" aria-label="比較表：横スクロール対応"><table><thead><tr>' + ''.join(f'<th>{x}</th>' for x in headers) + '</tr></thead><tbody>\n' + '\n'.join('<tr>'+''.join(f'<td>{x}</td>' for x in row)+'</tr>' for row in rows) + '</tbody></table></div>\n'
def code(s,prompt=None):
    attr=f' data-prompt="{prompt}"' if prompt else ''
    label='root shell' if prompt=='#' else 'shell' if prompt else '設定例'
    return f'<div class="code"{attr}><div class="code-header"><span>{label}</span><button class="copy" type="button">Copy</button></div><pre><code>{escape(s)}</code></pre></div>\n'
def fig(name,caption): return f'<figure><figcaption>{caption}／図を選択すると拡大表示できる</figcaption><a href="../assets/aws-design/{name}.svg"><img src="../assets/aws-design/{name}.svg" alt="{caption}" loading="lazy"></a></figure>\n'
def note(s): return '<div class="callout callout-info"><strong>ℹ️ 情報</strong>'+p(s)+'</div>\n'

def package_catalog():
    data=json.loads((ROOT/'scripts/data/al2023-packages-2023.12.20260817.json').read_text(encoding='utf-8'))
    out=p('掲載対象：Amazon Linux 2023、標準リポジトリの固定リリース <code>'+data['release']+'</code>／対象：x86_64・aarch64／確認日：'+data['checked']+'<br>主なパッケージを抜粋する／別のreleaseverで選ばれるバージョン、AMIへの標準インストール有無は別に確認する')
    for n,group in enumerate(data['groups']):
        out+=f'<h3 id="package-group-{n}">{group["name"]}</h3>'
        if n==3:
            out+=p('リポジトリや一覧に残るパッケージでも、サポート終了済みの系列は新規採用候補から外す／稼働中の場合は互換性とデータ移行を検証して切り替える')
        out+=table(['パッケージ名','Version-Release','AL2023でのサポート終了'],[(f'<code>{r["package"]}</code>',f'<code>{r["version_release"]}</code>',r['support_end']) for r in group['packages']])
    return out

bodies={}
bodies['aws-design'] = (
h('requirements','要件から設計判断へつなげる')+
p('本シリーズは架空の業務要件に対する設計例であり、実案件での導入実績や負荷試験の結果を示すものではない<br>仕様の確認日：2026年10月3日／数値目標・保持期間・構成案は案件ごとの合意と検証で確定する')+
table(['確認する要件','基本設計で決めること','詳細設計・検証へ渡すこと'],[
('利用者と処理','公開サイトか社内業務か、静的配信か動的処理かを決める','認証・画面・API・外部接続の一覧を作成する'),
('可用性と復旧','業務時間、SLI、SLO、障害別のRTO・RPOを合意する','切替試験と復元試験の判定基準を定める'),
('性能と費用','通常・ピークの負荷、応答時間、月額上限と運用工数を整理する','インスタンス、IOPS、スケール条件を測定して決める'),
('統制と運用','責任分界、ネットワーク境界、アクセス・暗号化・監査方針を決める','CIDR、SGルール、IAMポリシー、KMS設定を具体化する')])+
p('命名方針や全体構成は基本設計に含められるが、テンプレート作成とWBS更新は設計作業を支える準備・管理活動に当たる<br>基本設計と詳細設計の境界は契約によって異なるため、成果物とレビュー観点を先に合意する')+
h('patterns','代表的な構成と採用条件')+
fig('static','構成A：静的コンテンツはCloudFrontから非公開のS3バケットへ配信経路を限定する')+
p('企業の案内サイトや静的ドキュメントでは、サーバー側の処理が不要であればS3とCloudFrontを候補にする<br>フォーム、認証、検索、CMS編集機能は別の処理として設計し、静的配信だけで満たせる範囲を明確にする')+
source('https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html','CloudFrontによるS3オリジンへのアクセス制限')+
fig('web','構成B：ALBと2つのAZに分散したEC2、RDS for MySQLのMulti-AZ DBインスタンスを組み合わせる')+
p('既存のPHPアプリケーションやOS設定への依存が大きいシステムでは、EC2を候補にする<br>図は論理構成であり、DB待機系への接続はRDSが切り替える／アプリケーションはエンドポイントへの再接続を実装する')+
p('Webサーバーを複数にする場合は、アップロード・セッション・バッチの状態を各サーバーのローカルディスクへ閉じ込めない<br>共有ファイルはEFS、オブジェクト対応の保存処理はS3など、アプリケーションの対応状況に合わせて外部化する')+
fig('containers','構成C：ALBから複数AZのECSサービスへ接続し、Fargateタスクの永続データを外部へ保存する')+
p('コンテナ化と継続的なリリースが前提なら、ECSとFargateを候補にする<br>各AZへ必要数のタスクを配置し、1つのAZを失っても残存側が必要な負荷を処理できるかを検証する')+
source('https://docs.aws.amazon.com/AmazonECS/latest/developerguide/Welcome.html','Amazon ECSの概要と実行基盤')+
h('decision','判断を残す設計記録の例')+
table(['項目','例：WordPressを使う企業サイト'],[
('前提','既存プラグインを継続し、PHPとMySQL互換DBを使う／運用チームはLinux運用に対応する'),
('採用案','ALB＋EC2の複数AZ構成＋RDS for MySQL Multi-AZを候補にする'),
('他案との比較','静的配信では編集・PHP実行を直接代替できない／ECSはコンテナ運用とデプロイの整備が必要になる'),
('残るリスク','共有ストレージの遅延、プラグイン互換性、二重バッチ、DB再接続を検証する'),
('受入条件','AZ相当の停止試験、アップロード整合性、バックアップ復元、管理者認証とロールバックを確認する')])+
h('review','設計レビューで説明できる成果物')+
p('構成図に加え、採用・不採用の理由、通信一覧、障害シナリオ、概算費用、運用分担、未決事項を残す<br>費用はコンピュートだけでなく、ALB・NAT・ログ・バックアップ・転送・監視・サポートと運用工数を含めて見積もる')+
table(['レビュー項目','説明できる状態'],[
('セキュリティ','公開経路と管理経路を分け、最小権限、秘密情報の保存先、暗号鍵の管理者を説明できる'),
('運用引継ぎ','検知から一次対応、エスカレーション、復旧判定まで担当を示せる'),
('根拠と検証','公式仕様と設計上の仮定を分け、未確認の事項に検証方法と完了条件を付けられる')])
)

bodies['aws-design-compute']=(
h('selection','ホスティングは処理方式と運用要件で選ぶ')+
table(['候補','採用しやすい条件','決定前の確認'],[
('S3＋CloudFront','HTML・CSS・JavaScriptなどの静的配信が中心になる','PHPやDB処理は実行しない／API、認証、更新・キャッシュ無効化を別途設計する'),
('Amplify Hosting','対応するフロントエンドのビルド・配信を一体化したい','SSRのフレームワーク・バージョン・機能制約、ビルド権限、秘密情報を確認する'),
('Lightsail','定型的なWeb構成で、運用規模とプランを絞りたい','必要なネットワーク・統制・監視・バックアップと拡張方法が要件に合うか確認する'),
('EC2','OS・ミドルウェア設定、常駐エージェント、既存ソフトの条件がある','OS保守、パッチ、脆弱性対応、障害交換と構成管理を利用者が設計する'),
('ECS＋Fargate','コンテナ化済みのアプリケーションを運用し、ホスト管理を減らしたい','対応するタスク設定、CPU・メモリ、永続化、デプロイ・復旧手順を確認する'),
('ECS＋EC2','コンテナを使いながらホストやインスタンスの選択を制御したい','ECSの管理に加え、EC2の容量・パッチ・スケーリングを設計する')])+
source('https://docs.aws.amazon.com/amplify/latest/userguide/welcome.html','Amplify Hostingの対象と機能')+
source('https://docs.aws.amazon.com/lightsail/latest/userguide/what-is-amazon-lightsail.html','Amazon Lightsailの概要')+
source('https://docs.aws.amazon.com/AmazonECS/latest/developerguide/Welcome.html','ECSと実行基盤の選択肢')+
h('hosting-diagrams','ホスティング別の構成図とWAFの関連付け先')+
p('<a href="#hosting-ec2">EC2の構成図</a> ／ <a href="#hosting-lightsail">Lightsailの構成図</a> ／ <a href="#hosting-amplify">Amplifyの構成図</a> ／ <a href="#hosting-s3">S3＋CloudFrontの構成図</a>')+
p('各方式に基本構成と拡張構成を掲載する／拡張図の緑の破線・点線枠は要件に応じて追加するサービスと関連付けを示す<br>拡張図の下段は基本図の対象を抜き出した連携図であり、すべての追加サービスを同時に採用する必要はない')+
table(['構成要素','AWS WAFの直接関連付け','追加する構成'],[
('EC2インスタンス','対象外','前段のALBまたはCloudFrontへ関連付ける'),
('ALB','対応する','ALBと同じリージョンのWeb ACLを使用する'),
('NLB／Classic Load Balancer','対象外','ALBと区別する／WAFはTCP・UDP全般の保護には使わない'),
('Lightsailインスタンス／Lightsailロードバランサー','対象外','通常のCloudFrontディストリビューションを前段へ追加する構成を検討する'),
('Amplify Hosting','対応する','AmplifyアプリへWAFを直接統合する／Global（CloudFront）のWeb ACLを使用する'),
('S3バケット','対象外','前段のCloudFrontへ関連付ける'),
('CloudFront','対応する','Global（CloudFront）のWeb ACLを使用する')])+
source('https://docs.aws.amazon.com/waf/latest/developerguide/how-aws-waf-works-resources.html','AWS WAFで保護できるリソース')+
h('hosting-ec2','EC2：ALBで受けて、複数AZへ振り分ける')+
fig('hosting-ec2-basic','EC2の基本構成：ALB・EC2・RDSを2つのAZへ配置する')+
fig('hosting-ec2','EC2の拡張構成：WAF・監視・バックアップ・DNSを追加する')+
table(['追加要件','組み合わせるサービス','採用時に決めること'],[
('Web攻撃の検査','AWS WAF → ALB','ルール・例外・レート制御を決める／NLBへ直接関連付ける構成には流用しない'),
('メトリクス・OSログ監視','CloudWatch','EC2のメモリ・OSログはエージェント等を設定する／RDSのログ出力も別途有効化する'),
('復旧・世代保持','AWS Backup','EC2・RDSを保護対象へ登録し、RPO・保持期間・復元試験を決める'),
('独自ドメイン','Route 53 ＋ ACM','ALBへのAliasと、同一リージョンのTLS証明書を設定する')])+
p('HTTPSの入口をALBに集約し、EC2のセキュリティグループではALBからのアプリケーション通信だけを許可する<br>EC2へ直接アクセスできる別経路を残すと、その経路はALBのWAFによる検査を受けない')+
p('図はALBへWAFを関連付ける例を示す／CloudFrontを追加する場合は、CloudFront側へWAFを関連付ける案も比較する<br>ALBとCloudFrontの両方へ追加する場合は、検査の目的・ルールの重複・費用を整理する')+
h('hosting-lightsail','Lightsail：CloudFrontを前段へ追加する')+
fig('hosting-lightsail-basic','Lightsailの基本構成：単一インスタンスへHTTPS接続する')+
fig('hosting-lightsail','Lightsailの拡張構成：CloudFrontとWAF・ログ保存・復旧機能を追加する')+
p('LightsailでもWAFによる検査を追加できる／この構成ではLightsailへ直接関連付けず、前段の通常のCloudFrontへWAFを関連付ける<br>WAFが必要ならCloudFrontと組み合わせて追加し、キャッシュだけが必要ならWAFなしでもCloudFrontを利用できる')+
table(['追加要件','組み合わせるサービス・機能','採用時に決めること'],[
('Web攻撃の検査・エッジ配信','CloudFront ＋ AWS WAF','カスタムオリジン・TLS・キャッシュ除外・オリジン直アクセス制限を設定する'),
('アクセス記録の保存','CloudFront標準ログ → S3','配信データとログ用バケットを分け、配信権限・保持期間・ログ費用を決める'),
('単一サーバーの復旧','Lightsail自動スナップショット','Linux／Unixインスタンスが対象／日次7世代から新規インスタンスへ復元する／HAの代替にはしない'),
('独自ドメイン','Route 53 ＋ ACM','CloudFront向け証明書はus-east-1で用意し、Lightsail側の証明書も別に用意する')])+
p('この図はLightsailのCDNディストリビューションではなく、CloudFront側で作成する通常のディストリビューションを使う<br>Lightsailインスタンスをカスタムオリジンとし、HTTPS接続に使うDNS名とサーバー証明書を用意する')+
p('オリジンへの直接アクセスを制限するため、CloudFrontで付与する秘密のカスタムヘッダーをWebサーバーで検証し、通信元の制限も検討する<br>ヘッダー値は閲覧用HTMLへ埋め込まず、更新方法とログへの出力抑止を決める／ログイン・管理画面などはキャッシュ対象から外す')+
p('図のLightsailは1台の構成例であり、CloudFrontやWAFの追加だけではオリジン障害への冗長化にはならない')+
source('https://aws.amazon.com/blogs/compute/integrating-aws-waf-with-your-amazon-lightsail-instance/','AWS公式：LightsailとWAFの構成')+
source('https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/add-origin-custom-headers.html','CloudFrontのオリジン用カスタムヘッダー')+
source('https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-faq-snapshots.html','Lightsail自動スナップショットの対象と保持')+
h('hosting-amplify','Amplify Hosting：アプリへWAFを直接統合する')+
fig('hosting-amplify-basic','Amplifyの基本構成：配信・SSRとビルドの領域を分ける')+
fig('hosting-amplify','Amplifyの拡張構成：WAF・ユーザー認証・SSRログ・DNSを追加する')+
table(['追加要件','組み合わせるサービス','採用時に決めること'],[
('Web攻撃の検査','AWS WAF → Amplifyアプリ','GlobalのWeb ACLを関連付け、ブランチへの適用範囲と統合費用を確認する'),
('ユーザー認証','Amazon Cognito','アプリへログイン・トークン検証・権限制御を実装する／WAFはログイン認証の代わりにはならない'),
('SSRの障害調査','CloudWatch Logs','対応するSSR実行環境・ログ出力・IAMサービスロール・保存期間を設定する'),
('独自ドメイン','Route 53 ＋ Amplifyカスタムドメイン','DNS検証・証明書・ブランチとサブドメインの対応を設定する')])+
p('Amplify HostingはAWS WAFとの直接統合に対応するため、WAFを使うためだけに利用者管理のALBを追加する必要はない<br>Amplifyアプリへ関連付けるWeb ACLはGlobal（CloudFront）用を使用する')+
p('同じAmplifyアプリのブランチに対するWAFの適用範囲を確認する／別URLで提供するAPIは、そのAPI側でも保護を設計する<br>ビルド・デプロイ経路と利用者からのアクセス経路は別に扱い、WAF費用とAmplify側の統合費用を見積もる')+
source('https://docs.aws.amazon.com/amplify/latest/userguide/WAF-integration.html','Amplify HostingのWAF直接統合')+
source('https://docs.aws.amazon.com/amplify/latest/userguide/server-side-rendering-amplify.html','Amplify SSRのCloudWatch Logs設定')+
h('hosting-s3','S3＋CloudFront：バケットを非公開にして配信する')+
fig('hosting-s3-basic','S3＋CloudFrontの基本構成：OACで非公開バケットから配信する')+
fig('hosting-s3','S3＋CloudFrontの拡張構成：WAF・アクセスログ・オブジェクト操作監査を追加する')+
table(['追加要件','組み合わせるサービス・機能','採用時に決めること'],[
('Web攻撃の検査','AWS WAF → CloudFront','WAFは任意／S3への直接関連付けはしない／OACとバケットの非公開化は基本構成にも含める'),
('アクセス記録の保存','CloudFront標準ログ → S3','ログ用バケット・配信権限・保持期間を決める／全リクエストの完全な記録は保証されない'),
('オブジェクト操作の監査','CloudTrailデータイベント','対象バケット・読取り／書込み・記録先・追加料金を決める／CloudFrontのキャッシュヒットはS3の読取りにならない'),
('独自ドメイン','Route 53 ＋ ACM','Aliasとus-east-1の証明書を設定する'),
('誤更新・誤削除からの復旧','S3バージョニング ＋ ライフサイクル','旧版の復元・保持期限・削除権限・非現行バージョンの費用を決める')])+
source('https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/AccessLogs.html','CloudFront標準ログ')+
source('https://docs.aws.amazon.com/AmazonS3/latest/userguide/cloudtrail-logging-s3-info.html','S3のCloudTrailデータイベント')+
p('S3バケットへWAFを直接関連付けず、CloudFrontを閲覧の入口にする<br>OACとバケットポリシーで対象ディストリビューションからのアクセスを許可し、S3の公開アクセスをブロックする')+
p('この構成ではS3のWebサイトエンドポイントを使用しない／通常のS3バケットオリジンを使用する<br>OACはオリジンへのアクセス制御、WAFはWebリクエストの検査を担当し、役割が異なる')

)

bodies['aws-design-database']=(
h('compatibility','DB製品より先にアプリケーション互換性を確認する')+
p('WordPressの標準的なDB要件はMySQLまたはMariaDBであり、Aurora PostgreSQLをそのまま対応DBとして選定しない<br>PostgreSQLを使う独自の互換対応を検討する場合は、対応層・プラグイン制約・更新時の検証・障害時の保守責任を別途説明する')+
source('https://wordpress.org/about/requirements/','WordPress公式要件')+
table(['候補','判断の順序'],[
('RDS for MySQL／MariaDB','アプリケーションの対応エンジン・バージョン・文字コード・照合順序を確認する'),
('Aurora MySQL-Compatible','MySQL互換を前提に、利用するSQL・プラグイン・接続ドライバーを検証する'),
('RDS for PostgreSQL／Aurora PostgreSQL-Compatible','PostgreSQL対応アプリケーションを対象とし、拡張機能とバージョンの対応を確認する'),
('EC2上のDB','マネージドDBで満たせないOS権限や製品条件がある場合に、保守と復旧の負担を含めて比較する')])+
source('https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/CHAP_AuroraOverview.html','Auroraのエンジンと互換性')+
h('availability','Multi-AZ・読取り分散・バックアップを分ける')+
table(['機能','目的','混同しやすい点'],[
('RDS Multi-AZ DBインスタンス','待機系へ切り替えて可用性を高める','待機系は読取りトラフィックを処理しない'),
('RDS Multi-AZ DBクラスター','2つの読取り可能な待機系を持つ構成を利用する','2台構成のDBインスタンス方式とは要件と構成が異なる'),
('リードレプリカ','読取り処理を分散する','レプリケーション遅延と書込み先を考慮する'),
('バックアップ／PITR','誤削除や障害前の状態へデータを復元する','冗長構成だけでは論理的な誤更新から保護できない')])+
source('https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.html','RDSの2種類のMulti-AZ構成')+
source('https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html','RDSリードレプリカ')+
source('https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.html','RDS自動バックアップ')+
h('recovery','RTO・RPOを復旧手順へ落とす')+
p('RTOは復旧までの目標時間、RPOは許容するデータ損失の時点を表す<br>インスタンス障害、AZ障害、誤更新、リージョン障害では復旧方法が違うため、1つの数値だけで全障害を説明しない')+
table(['設計項目','決める内容'],[
('復元対象','DB本体だけでなく、ユーザー投稿ファイル・秘密情報・設定・暗号鍵を対象にする'),
('復元先','別DBとして復元する場所、接続先の切替、DNSや接続プールの更新を決める'),
('整合性','DBの復元時点とファイルの復元時点が違う場合の業務上の扱いを決める'),
('試験','検知・判断・復元・接続切替・業務確認の合計時間を測定する')])+
h('capacity','性能・セキュリティ・変更管理')+
p('接続数、遅いSQL、ロック、メモリ、ストレージ遅延、増加率を確認し、アプリケーション側の接続プールと合わせてサイズを決める<br>DBを非公開サブネットへ配置し、アプリケーションからの必要な通信だけを許可する設計を基本案にする')+
p('自動バックアップの保持期間、メンテナンス時間帯、エンジン更新、削除保護、最終スナップショット、暗号鍵への復旧用権限を設計項目に含める<br>パスワードを設計書やソースコードへ埋め込まず、秘密情報の取得・更新とアプリケーションの再接続を検証する')+
h('review','設計レビューの確認事項')+
p('「Multi-AZだから無停止」と説明せず、切替時の接続切断と再試行、二重実行、処理途中のトランザクションを確認する<br>エンジンのサポート期限と更新方法を示し、データ復元後に業務が再開できることを受入条件にする')
)

bodies['aws-design-storage']=(
h('types','保存方式から選ぶ')+
table(['方式','候補と用途','採用前の注意'],[
('ブロック','EBS：EC2のOS、アプリケーション、DB用ボリュームに使う','AZに属する／容量・IOPS・スループット・インスタンス側の上限を合わせて考える'),
('共有ファイル','EFS：Linuxから複数ホストで共有するファイルに使う','NFSの遅延、権限、同時更新、マウント経路を検証する'),
('オブジェクト','S3：配信元、画像、バックアップ、ログ保管に使う','アプリケーションのAPI対応とオブジェクト単位の操作を前提にする'),
('一時ストレージ','EC2インスタンスストア：再生成できる一時データに使う','停止・終了などでデータを失うため、唯一の永続保存先にしない')])+
source('https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Storage.html','EC2のストレージ選択肢')+
source('https://docs.aws.amazon.com/efs/latest/ug/whatisefs.html','EFSのプロトコルとファイルシステム種別')+
h('shared','Webサーバーを増やすときの保存先')+
p('WordPressを複数台にした場合、各EC2のローカルディスクへアップロードを保存すると、接続先によって表示できる画像が変わる<br>EFSで共有する案と、対応プラグインなどでS3へ保存する案を比較し、更新・削除・画像変換・バックアップが成立することを確認する')+
p('S3をファイルシステムのようにマウントする方式でも、一般的なPOSIXファイルシステムと同じ操作をすべて利用できるとは限らない<br>既存アプリケーションのrename・ロック・追記などの要件を確認し、API対応とマウント方式を区別する')+
source('https://docs.aws.amazon.com/AmazonS3/latest/userguide/mountpoint.html','Mountpoint for Amazon S3の対象と制限')+
h('performance','容量だけで性能を決めない')+
table(['見る値','判断'],[
('容量と増加率','データ本体にログ・一時ファイル・更新用の余裕を加え、枯渇予測を設計する'),
('IOPSとスループット','小さいランダムI/Oと大きい連続I/Oを分け、実処理で計測する'),
('遅延と同時実行','バックアップ、バッチ、DB書込みの重複時も応答目標を満たすか確認する'),
('ホスト側の上限','EBS性能を増やしてもEC2側がボトルネックにならないか確認する')])+
source('https://docs.aws.amazon.com/ebs/latest/userguide/ebs-performance.html','EBSの性能と考慮点')+
h('protection','耐久性と可用性を別に設計する')+
p('耐久性はデータを失いにくい性質、可用性は必要なときに利用できる性質を表す<br>複数AZへの保存、誤削除への保護、別アカウントへの保管、リージョン障害からの復旧は、それぞれ対象のリスクを明確にする')+
p('EFS RegionalとOne ZoneではAZ障害に対する性質が異なるため、料金だけで比較しない<br>EBSの終了時削除設定、スナップショットの保持、暗号鍵の利用権限も復旧設計に含める')+
source('https://docs.aws.amazon.com/efs/latest/ug/whatisefs.html','EFS RegionalとOne Zoneの違い')+
table(['設計項目','例として決める内容'],[
('S3','公開範囲、暗号化、バージョニング、ライフサイクル、削除権限を決める'),
('バックアップ','世代・期間・保存先・復元順序を決め、復元可能なことを試験する'),
('保管クラス','取り出し時間・最小保存期間・取出し費用が復旧要件に合うか確認する'),
('終了時の扱い','リソース削除とデータ廃棄を分け、承認・保持義務・復元不能化の条件を決める')])+
source('https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html','S3ストレージクラスの比較')
)

bodies['aws-design-os']=(
h('middleware','OSとミドルウェアの採用範囲')+
p('OSの標準機能と、追加インストールするWeb・AP・DB・キャッシュ・ランタイムを分けて設計する<br>本ページの提供バージョン表はAmazon Linux 2023を対象とし、他のOSや外部リポジトリのバージョンを混在させない')+
table(['設計項目','確定する内容'],[
('OS・CPU','AMI ID、AL2023リリース、releasever、x86_64／aarch64、サポート期限を記録する'),
('Web・AP','Apache／nginx、PHP-FPM／Tomcatなどの組合せ、モジュール、接続方式、同時処理数を決める'),
('DB・キャッシュ','DBのメジャーバージョン、クライアント互換性、永続化、移行・復元手順を決める'),
('配布元','標準リポジトリ、ベンダー提供リポジトリ、コンテナイメージを区別し、更新責任を決める')])+
h('packages','標準リポジトリから導入できるバージョン')+
package_catalog()+
source('https://docs.aws.amazon.com/linux/al2023/release-notes/all-packages-AL2023.12.html','AL2023の全パッケージ一覧：2023.12.20260817')+
h('repository-check','採用リポジトリで利用可能な版を確認する')+
p('AL2023はリポジトリをリリース単位で固定するため、同じOS名でも導入できる版が異なる<br>次の参照コマンドはパッケージをインストール・更新しない／リポジトリ照会ではローカルのメタデータキャッシュが更新されることがある')+
code('cat /etc/os-release\nuname -m\nrpm -q system-release', '$')+
p('releaseverの上書きファイルと、有効なリポジトリを確認する')+
code('if [ -f /etc/dnf/vars/releasever ]; then cat /etc/dnf/vars/releasever; fi\ndnf repolist --enabled', '$')+
p('現在参照している標準リポジトリamazonlinuxの提供版を照会する／外部リポジトリを一時的に除外する')+
code("dnf --disablerepo='*' --enablerepo=amazonlinux list --showduplicates httpd nginx php8.4-fpm mariadb114-server postgresql17-server valkey", '$')+
p('掲載表と同じ固定リリースを照会する場合は、コマンド単位でreleaseverを指定する／OS全体のリポジトリ固定先は変更しない')+
code("dnf --releasever=2023.12.20260817 --disablerepo='*' --enablerepo=amazonlinux list --showduplicates httpd nginx php8.4-fpm mariadb114-server postgresql17-server valkey", '$')+
p('インストール済みの版と、提供される版は別に記録する／未インストールのパッケージを含むrpm照会は非ゼロで終了する')+
code('rpm -q httpd nginx php8.4-fpm mariadb114-server postgresql17-server valkey', '$')+
source('https://docs.aws.amazon.com/linux/al2023/ug/managing-repos-os-updates.html','AL2023のバージョン固定リポジトリ')+
h('compatibility','インストール前に判断する互換性と保守')+
p('表の値はパッケージのVersion-Releaseであり、上流ソフトウェアのバージョン番号だけでは修正適用状況を判断しない<br>AWSによる修正のバックポート、サポート期限、アドバイザリーと合わせて採用を判断する')+
table(['組み合わせ','設計・試験する項目'],[
('Apache／nginx ＋ PHP-FPM','PHP拡張、Unix socket／TCP、実行ユーザー、タイムアウト、同時処理数を合わせる'),
('Tomcat 9 → 10以降','javaxからjakartaへの移行など、アプリのAPI・Java要件を検証する／版数だけで入替えない'),
('MariaDB／PostgreSQLのメジャー変更','接続ドライバー、SQL、照合順序、バックアップ形式、データ移行と切戻しを検証する'),
('Redis 6 → Valkey','クライアント、コマンド、永続データ、レプリケーションを検証する／サポート終了したRedis 6を新規標準にしない'),
('OSのPython','OS管理用python3を上書きせず、アプリ用ランタイムと仮想環境を分離する')])+
source('https://tomcat.apache.org/migration-10','Tomcat 9から10へのAPI互換性')+
source('https://docs.aws.amazon.com/linux/al2023/ug/python.html','AL2023のシステムPythonと追加ランタイム')+
h('defaults','AL2023の標準と追加できるもの')+
table(['設計対象','標準の考え方','追加・変更する条件'],[
('定期処理','systemd timerを利用する／cronieは標準でインストールされない','既存のcrontab互換が必要ならcronieを追加する'),
('OSログ','systemd journalをjournalctlで参照する／rsyslogは標準でインストールされない','既存のsyslog転送やテキストログ収集が必要ならrsyslogを追加する'),
('アプリケーションログ','stdout／stderrをjournalへ出すか、アプリケーション独自のファイルへ出す','監視製品の入力形式、構造化ログ、保存・転送要件から選ぶ')])+
source('https://docs.aws.amazon.com/linux/al2023/ug/cron.html','AL2023のsystemd timerとcronie')+
source('https://docs.aws.amazon.com/linux/al2023/ug/journald.html','AL2023のjournalとrsyslog')+
p('cronieやrsyslogを追加する場合も、systemdやjournaldを単純に置き換える必要はない<br>cronとtimerによる二重実行、journalとsyslogからの重複転送を防ぐように、各処理とログの経路を1つずつ管理する')+
h('jobs','定期処理の基本設計')+
table(['項目','設計の論点'],[
('実行時刻','時刻・タイムゾーン・時刻同期・許容遅延を決める'),
('停止中の予定','再起動後に実行し直すか、取りこぼしとして通知するかを決める'),
('実行権限','実行ユーザー、作業ディレクトリ、環境変数、必要な秘密情報を決める'),
('失敗と長時間処理','終了コード、タイムアウト、再試行回数、通知、再実行の安全性を決める'),
('重複実行','1台内の排他だけでなく、複数台から同じ業務を実行しない仕組みを決める')])+
p('systemd timerのPersistent=trueはOnCalendarの停止中の実行機会を補う設定であり、取りこぼした全回数を順番に再生する仕組みではない<br>同じserviceが実行中ならtimerはそのserviceを重ねて起動しないが、複数サーバー間の排他は別に設計する')+
source('https://github.com/systemd/systemd/blob/main/man/systemd.timer.xml','systemd公式：timerの動作とPersistent')+
h('inspection','採用AMIの状態を確認する')+
p('カスタムAMIでは追加パッケージや設定が異なるため、OS名だけで標準状態と判断しない<br>次のコマンドは状態確認用であり、パッケージやサービス設定は変更しない')+
code('cat /etc/os-release', '$')+
p('systemdのバージョンと登録済みtimerを確認する')+
code('systemctl --version\nsystemctl list-timers --all', '$')+
p('cronieとrsyslogのインストール有無を確認する／未インストールの場合はrpmが非ゼロで終了する')+
code('rpm -q cronie rsyslog', '$')+
p('OS全体のjournal確認に必要な権限を得る')+
code('sudo -i', '$')+
p('journalの起動履歴と使用容量を確認する')+
code('journalctl --list-boots\njournalctl --disk-usage', '#')+
p('現在の起動以降の警告以上のjournalを確認する')+
code('journalctl -b -p warning --no-pager', '#')+
h('journal','journalの保存と収集を設計する')+
p('journaldのStorage=autoは/var/log/journalの存在などによって永続保存の動作が変わるため、再起動後も残ると決めつけない<br>対象AMIの設定・保存先・容量上限を調べ、実際の再起動試験で保存を確認する')+
source('https://github.com/systemd/systemd/blob/main/man/journald.conf.xml','systemd公式：Storageとjournalの容量管理')+
p('CloudWatch agentのファイル収集に/var/log/journalのバイナリファイルを直接指定する設計は採用しない<br>テキスト収集が必要なら、rsyslogなどで必要なイベントをファイルへ出し、CloudWatch agentへ渡す経路を検証する')+
source('https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-Configuration-File-Details.html','CloudWatch agentのlogs収集設定')+
h('migration','既存運用を移行するときの受入条件')+
p('既存の設定と収集経路を退避し、定期処理の正常・失敗・長時間実行・再起動後の動作を検証してから旧方式を止める<br>ログは同じ試験イベントが想定回数だけ到着すること、ローテーションと転送停止からの復旧、保持期限での削除まで確認する')+
p('systemd上流の説明には対象AMIより新しい機能も含まれるため、実装時には採用したAL2023上のmanとsystemdバージョンを照合する<br>本ページでは実機での設定変更・再起動・復旧試験は実施していない')
)

bodies['aws-design-observability']=(
h('availability','SLA・SLO・実測稼働率を区別する')+
table(['用語','設計での使い方'],[
('SLA','サービス提供者が定義する対象・測定方法・適用条件・補償を確認する'),
('SLO','自分たちの業務サービスが目指す可用性や応答時間の目標を定める'),
('SLI','成功したリクエストの割合など、目標を判定する測定指標を定める'),
('RTO／RPO','障害別の復旧時間と許容するデータ損失を決める')])+
p('AWSサービスのSLAをアプリケーションの稼働率として転記しない<br>OS・アプリケーション・デプロイ・認証・DNS・外部サービスの障害も利用者の体験に影響するため、業務サービスの測定点を別に定める')+
table(['サービスと構成','SLAの水準','適用条件の読み方'],[
('EC2：単一インスタンス','99.5%','Instance-Level SLAの対象と定義を確認する'),
('EC2：複数AZなどの条件を満たす構成','99.99%','Region-Level SLAの配置・同時稼働・利用不能の定義を確認する'),
('RDS：Single DB Instance','99.5%','対象となるDBと利用不能の定義を確認する'),
('RDS：Multi-AZ DB Instance／Cluster','99.95%','対象構成を確認する／Auroraへこの値を流用しない')])+
source('https://aws.amazon.com/compute/sla/','Amazon Compute SLA：単一インスタンスとリージョンの条件')+
source('https://aws.amazon.com/rds/sla/','Amazon RDS SLA：Single DBとMulti-AZの条件')+
p('EC2のRegion-Level SLAは、稼働中のインスタンスを同じリージョンの2つ以上のAZへ同時に配置する条件がある／AZが1つのリージョンでは少なくとも2つのリージョンに配置する<br>AZを増やしただけでアプリケーションの可用性が上がるとは限らず、トラフィックの切替と残存側の処理能力も設計する')+
p('上表は2026年10月3日に確認した水準であり、実測値や無停止の保証を示さない<br>適用除外、申請条件、サービスクレジットは契約本文で確認する／各サービスのSLAを単純に掛け合わせて業務SLAを約束しない')+
h('budget','月間99.9%とRTO 4時間を整合させる')+
p('30日を全時間対象とした時間ベースの目標では、停止許容時間は30×24×60×0.001＝43.2分、すなわち43分12秒になる<br>同じ対象範囲で4時間停止すると約99.444%となり、その月の99.9%目標を満たさない')+
p('RTO 4時間は毎月4時間停止するという意味ではないが、その規模の障害が発生した月にはSLO未達となり得る<br>通常障害の復旧目標を短くするか、災害復旧を別目標にするかを合意し、除外条件を後付けしない')+
table(['設計例の対象','目標の書き方','確認すること'],[
('通常運用','月間SLO 99.9%を仮定する','対象時間・測定間隔・失敗条件・計画停止の扱いを決める'),
('インスタンス／AZ障害','月間停止予算内で復旧できるように切替方式を設計する','検知・切替・再接続・業務確認の合計と複数回障害を評価する'),
('災害復旧','別途RTO 4時間、RPOを合意する','災害の定義とSLO集計への扱いを明文化する')])+
h('logging','ログは取得から廃棄まで設計する')+
table(['ログの種類','主な目的','設計項目'],[
('OS／アプリケーション','障害解析と処理追跡に使う','journalかファイルか、時刻、相関ID、マスキング、保持先を決める'),
('アクセス／認証','利用状況と不正アクセスを調べる','記録項目、取得対象、アクセス権、個人情報の最小化を決める'),
('CloudTrail','AWS API操作の証跡に使う','管理イベントと必要なデータイベントの範囲・保存先・費用を確認する'),
('収集基盤自身','ログ欠損と転送異常を検知する','エージェント停止、送信失敗、滞留、容量枯渇、再送を監視する')])+
source('https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-management-events-with-cloudtrail.html','CloudTrailの管理イベント')+
source('https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-data-events-with-cloudtrail.html','CloudTrailのデータイベント')+
p('保持期間は「すべて永久保存」ではなく、検索可能な期間と長期保管期間を用途ごとに決める<br>例えば検索30日・保管365日は設計上の候補であり、業務・監査・費用の合意後に設定する／ログの閲覧・削除・暗号鍵の権限も分ける')+
h('monitoring','監視項目を対応行動へ結び付ける')+
table(['監視対象','検知したいこと','対応の例'],[
('外形監視','利用者の主要操作が成功しないことを検知する','HTTP 200だけでなくログイン・検索など対象操作を確認する'),
('EC2／OS','基盤障害、メモリ不足、容量不足、プロセス停止を検知する','CloudWatchの標準指標とagentによるOS指標を組み合わせる'),
('DB','接続枯渇、遅延、ロック、容量増加を検知する','アプリケーションの負荷と照合し、待機・切替・増強の判断へつなげる'),
('バッチ','予定時刻までに正常完了していないことを検知する','開始ログだけで正常とせず、完了・期限超過を監視する'),
('Zabbix自身','監視停止、処理キュー滞留、履歴DB障害を検知する','同じ障害で止まらない外部の監視経路から死活を確認する')])+
source('https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Install-CloudWatch-Agent.html','CloudWatch agentによるOSメトリクスとログ収集')+
p('閾値だけでなく、評価期間、連続回数、欠測の扱い、復旧判定、通知先、時間外対応、一次対応手順を1組にする<br>CPU使用率80%などの値は初期候補として扱い、平常時の傾向と業務影響から調整する')+
h('acceptance','検知から復旧までを試験する')+
p('試験用の障害やログを発生させ、収集、アラーム、担当者への通知、復旧、通知解除まで通して確認する<br>監視サーバー停止、エージェント停止、転送先の権限不足も試験に含め、監視できていない状態を正常と表示しない')
)

bodies['aws-design-governance']=(
h('naming','名前は人の識別、IDはリソースの識別に使う')+
p('命名規則は用途・環境・役割を読み取れる範囲に絞り、個人名・IPアドレス・パスワードなど変わりやすい情報や秘密情報を含めない<br>EC2のNameタグ、OSホスト名、DNS名、Terraformの論理名、AWSリソースIDは別の識別子として管理する')+
table(['対象','設計例','例外・注意'],[
('基本パターン','システム－環境－役割－連番の順にする／例：portal-prod-web-01','Auto Scalingの個体へ固定の連番を割り当てる運用は避け、役割と一意なIDを併用する'),
('環境名','dev／stg／prodへ統一する','productionやprdとの混在を避ける'),
('S3バケットなど','サービスの文字数・文字種・一意性の要件に合わせる','共通ルールが使えない場合は短縮規則と識別用サフィックスを記録する'),
('OS・DNS','ホスト名とサービス名を分ける','サーバー交換で利用者向けDNSを変更しない設計を検討する')])+
source('https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Using_Tags.html','EC2のNameタグとタグの性質')+
source('https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html','S3汎用バケットの命名規則')+
h('tags','タグに目的と管理責任を持たせる')+
table(['タグキー例','値の例','用途と運用'],[
('System','portal','システム単位で検索・集計する'),
('Environment','prod','環境を識別し、許可する値を統一する'),
('OwnerTeam','platform','個人の連絡先ではなく担当チームを示す'),
('CostCenter','cc-example','費用配賦の単位を示し、管理台帳と対応させる'),
('DataClassification','internal','データ分類を示す／タグだけで暗号化やアクセス制限は適用されない'),
('BackupPolicy','daily','バックアップ方針を示す／バックアップ選択ルールとの連携を確認する'),
('ManagedBy','terraform','変更管理の起点を示す')])+
p('上表はこのシリーズの設計例であり、AWS共通の必須タグではない<br>大文字・小文字、許容値、必須と任意、付与者、変更承認、未付与時の対応をタグ辞書として管理する')+
source('https://docs.aws.amazon.com/whitepapers/latest/tagging-best-practices/tagging-best-practices.html','AWSリソースのタグ付けベストプラクティス')+
h('enforcement','タグを付けるだけでは統制にならない')+
p('タグキーと値では大文字・小文字を区別し、AWS予約のaws:プレフィックスを利用者の独自タグに使わない<br>タグは参照できるAPIや画面が多いため、機密情報を格納しない')+
source('https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Using_Tags.html','タグ制約と機密情報の注意')+
p('費用配賦に使うユーザー定義タグはBilling側での有効化も確認する<br>すべての費用が自動的にタグ別へ配賦されると想定せず、対象リソース・対応サービス・反映後の明細を確認する')+
source('https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/activating-tags.html','ユーザー定義コスト配分タグの有効化')+
p('タグベースのアクセス制御を使う場合は、タグの変更権限も管理する<br>Environment=prodを書き換えられる利用者が制限を回避できないように、IAM条件・対応アクション・タグ作成と変更の権限を検証する')+
source('https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction_attribute-based-access-control.html','IAMの属性ベースアクセス制御')+
h('exceptions','例外と自動生成リソースの扱い')+
table(['場面','管理方法'],[
('名前の長さや文字種が合わない','承認した短縮名と元の名称を対応表に残す'),
('AWSが自動生成する名前','サービスの仕様を優先し、追跡用のタグや親リソースとの関連で識別する'),
('タグが伝播しない子リソース','EBS・スナップショットなどの付与結果を個別に確認する'),
('既存環境への導入','名前変更による再作成や参照切れを調べ、タグから段階的に導入する')])+
h('acceptance','レビューで確認すること')+
p('IaCの入力検査とデプロイ後の棚卸しを組み合わせ、必須タグ・値の揺れ・未管理リソースを確認する<br>例外には理由・責任者・見直し期限を残し、命名規則のためだけに本番リソースを再作成しない')
)

def diagram(name, title, rows):
    height=110+len(rows)*112
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 {height}" role="img" aria-labelledby="title"><title id="title">{escape(title)}</title><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#52647c"/></marker></defs><rect width="880" height="{height}" rx="16" fill="#f3f6fa"/><g font-family="sans-serif" text-anchor="middle" fill="#182b45"><text x="440" y="37" font-size="20" font-weight="700">{escape(title)}</text>'
    for i,row in enumerate(rows):
        y=65+i*112
        n=len(row); w=(800-20*(n-1))/n
        if i:
            prev=len(rows[i-1]); pw=(800-20*(prev-1))/prev
            starts=[40+k*(pw+20)+pw/2 for k in range(prev)]
            ends=[40+k*(w+20)+w/2 for k in range(n)]
            for start in starts:
                for end in ends:
                    svg+=f'<path d="M{start} {y-32}L{end} {y-7}" stroke="#52647c" stroke-width="2" marker-end="url(#arrow)"/>'
        for j,(label,detail) in enumerate(row):
            x=40+j*(w+20)
            svg+=f'<rect x="{x}" y="{y}" width="{w}" height="80" rx="10" fill="white" stroke="#849bb7"/><text x="{x+w/2}" y="{y+31}" font-size="18" font-weight="700">{escape(label)}</text><text x="{x+w/2}" y="{y+57}" font-size="14">{escape(detail)}</text>'
    svg+='</g></svg>'
    target=ROOT/'assets'/'aws-design'/f'{name}.svg'; target.parent.mkdir(exist_ok=True); target.write_text(svg,encoding='utf-8')

def web_diagram():
    svg='''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 680" role="img" aria-labelledby="title"><title id="title">2つのAZへ分散したEC2とRDS for MySQLの論理構成</title>
<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#52647c"/></marker></defs>
<rect width="960" height="680" rx="16" fill="#f3f6fa"/>
<g font-family="sans-serif" fill="#182b45" text-anchor="middle">
<text x="480" y="33" font-size="22" font-weight="700">動的Web：2つのAZへ分散する構成例</text>
<text x="480" y="67" font-size="17">利用者／インターネット</text>
<rect x="30" y="100" width="900" height="480" rx="12" fill="#e9eff6" stroke="#849bb7"/>
<text x="75" y="126" font-size="16" font-weight="700">VPC</text>
<rect x="55" y="195" width="410" height="355" rx="10" fill="#f6f9fc" stroke="#849bb7" stroke-dasharray="6 4"/>
<rect x="495" y="195" width="410" height="355" rx="10" fill="#f6f9fc" stroke="#849bb7" stroke-dasharray="6 4"/>
<text x="260" y="225" font-size="18" font-weight="700">AZ A</text><text x="700" y="225" font-size="18" font-weight="700">AZ B</text>
<rect x="200" y="132" width="560" height="52" rx="8" fill="white" stroke="#849bb7"/>
<text x="480" y="155" font-size="18" font-weight="700">ALB：HTTPS／ヘルスチェック</text><text x="480" y="174" font-size="13">2つのAZのパブリックサブネットを使用</text>
<rect x="85" y="255" width="350" height="65" rx="8" fill="white" stroke="#849bb7"/><rect x="525" y="255" width="350" height="65" rx="8" fill="white" stroke="#849bb7"/>
<text x="260" y="282" font-size="18" font-weight="700">EC2：Webアプリケーション</text><text x="260" y="306" font-size="14">アプリ用の非公開サブネット</text>
<text x="700" y="282" font-size="18" font-weight="700">EC2：Webアプリケーション</text><text x="700" y="306" font-size="14">アプリ用の非公開サブネット</text>
<rect x="185" y="355" width="590" height="42" rx="8" fill="white" stroke="#849bb7"/><text x="480" y="382" font-size="16">DBエンドポイント：両方のWebサーバーが同じ接続先を使用</text>
<rect x="85" y="440" width="350" height="80" rx="8" fill="white" stroke="#849bb7"/><rect x="525" y="440" width="350" height="80" rx="8" fill="white" stroke="#849bb7"/>
<text x="260" y="469" font-size="18" font-weight="700">RDS for MySQL：Primary</text><text x="260" y="496" font-size="14">DB用の非公開サブネット</text>
<text x="700" y="469" font-size="18" font-weight="700">RDS：Standby</text><text x="700" y="496" font-size="14">別AZ／通常の読取り不可</text>
<text x="480" y="608" font-size="15">実線：通常の接続経路／点線：同期レプリケーション</text>
<text x="480" y="636" font-size="15">切替後は同じDBエンドポイントへ再接続／共有ファイル・セッションは別途外部化</text>
<text x="480" y="659" font-size="13">論理構成図：管理経路・外向き通信・共有ストレージの配置は省略</text></g>
<g fill="none" stroke="#52647c" stroke-width="2" marker-end="url(#arrow)">
<path d="M480 77V126"/><path d="M310 184L260 248"/><path d="M650 184L700 248"/>
<path d="M260 320V348"/><path d="M700 320V348"/><path d="M260 397V433"/>
<path d="M435 480H518" stroke-dasharray="5 4"/></g></svg>'''
    (ROOT/'assets'/'aws-design'/'web.svg').write_text(svg,encoding='utf-8')

def hosting_diagrams():
    import runpy
    runpy.run_path(str(ROOT/'scripts'/'build_hosting_architectures.py'), run_name='__main__')


def main():
    shell=(ROOT/'tutorials'/'amazon-rds-blue-green.html').read_text(encoding='utf-8')
    prefix=shell.split('    <main class="content')[0]
    prefix=re.sub(r'<a class="active" aria-current="page"', '<a', prefix)
    for slug,title,lead in PAGES:
        if slug not in PUBLISHED:
            page = '<!DOCTYPE html>\n<html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="robots" content="noindex, nofollow"><title>公開停止中 | Documentation</title><link rel="stylesheet" href="../assets/styles.css"></head><body><main class="content"><h1>公開停止中</h1><p>このページは現在公開していない</p><p><a href="../">Homeへ戻る</a></p></main></body></html>\n'
            (ROOT/'tutorials'/f'{slug}.html').write_text(page,encoding='utf-8')
            continue
        head=re.sub(r'<title>.*?</title>',f'<title>{title} | Documentation</title>',prefix)
        head=re.sub(r'<meta name="description" content="[^"]*">',f'<meta name="description" content="{lead}">',head)
        head=head.replace('</head>','  <link rel="stylesheet" href="../assets/aws-design/design.css">\n</head>')
        head=head.replace(f'<a href="{slug}.html">',f'<a class="active" aria-current="page" href="{slug}.html">')
        body=bodies[slug]
        toc=''.join(f'<a href="#{i}">{t}</a>\n' for i,t in re.findall(r'<h2 id="([^"]+)">(.*?)</h2>',body))
        related='<nav class="design-series" aria-label="AWS設計シリーズ"><p><strong>AWS設計シリーズ</strong></p><ul>'+''.join(f'<li><a href="{s}.html"'+(' aria-current="page"' if s==slug else '')+f'>{t}</a></li>' for s,t,_ in PAGES if s in PUBLISHED)+'</ul></nav>'
        page=head+f'<main class="content aws-design-guide"><nav class="breadcrumb" aria-label="Breadcrumb"><a href="../">Home</a><span>AWS設計</span></nav><h1>{title}</h1><p class="lead">{lead}</p>'+body+related+'</main><aside class="toc" aria-label="Table of contents"><h2>ページ内</h2>'+toc+'</aside></div><script src="../assets/app.js?v=20261003-mobile-nav"></script></body></html>\n'
        (ROOT/'tutorials'/f'{slug}.html').write_text(page,encoding='utf-8')
    if '--pages-only' in sys.argv:
        return
    diagram('static','静的配信：公開入口と保存先を分離',[[('利用者','HTTPS')],[('CloudFront','TLS・キャッシュ・アクセス制御')],[('S3：通常のバケットオリジン','OACでアクセスを限定／公開アクセスをブロック')]])
    diagram('containers','コンテナWeb：ホスト運用をFargateへ委ねる',[[('利用者 → ALB','HTTPS／ヘルスチェック')],[('AZ A：Fargateタスク','ECSサービスが配置・更新を管理'),('AZ B：Fargateタスク','ECSサービスが配置・更新を管理')],[('DB・オブジェクト・ログの外部保存','タスクの交換後も必要なデータを保持する')]])
    web_diagram()
    hosting_diagrams()

if __name__=='__main__': main()
