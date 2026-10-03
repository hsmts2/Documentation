"""AWS hosting topology diagrams using unmodified official AWS Architecture Icons.

Icon package: 07312026, https://aws.amazon.com/architecture/icons/
The topology is our design example, not an AWS-published reference architecture.
"""
from pathlib import Path
from html import escape
import base64

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'aws-design'
ICONS = OUT / 'icons'
FILES = {
    'user': 'Res_User_48_Light.svg',
    'cloud': 'AWS-Cloud-logo_32.svg',
    'region': 'Region_32.svg',
    'vpc': 'Virtual-private-cloud-VPC_32.svg',
    'public': 'Public-subnet_32.svg',
    'private': 'Private-subnet_32.svg',
    'igw': 'Res_Amazon-VPC_Internet-Gateway_48.svg',
    'alb': 'Res_Elastic-Load-Balancing_Application-Load-Balancer_48.svg',
    'ec2': 'Arch_Amazon-EC2_64.svg',
    'rds': 'Arch_Amazon-RDS_64.svg',
    'lightsail': 'Arch_Amazon-Lightsail_64.svg',
    'cloudfront': 'Arch_Amazon-CloudFront_64.svg',
    'amplify': 'Arch_AWS-Amplify_64.svg',
    'waf': 'Arch_AWS-WAF_64.svg',
    'acm': 'Arch_AWS-Certificate-Manager_64.svg',
    's3': 'Arch_Amazon-Simple-Storage-Service_64.svg',
    'cloudwatch': 'Arch_Amazon-CloudWatch_64.svg',
    'backup': 'Arch_AWS-Backup_64.svg',
    'route53': 'Arch_Amazon-Route-53_64.svg',
    'cognito': 'Arch_Amazon-Cognito_64.svg',
    'cloudtrail': 'Arch_AWS-CloudTrail_64.svg',
}


class Diagram:
    def __init__(self, title, height=1050):
        self.height = height
        self.parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 {height}" role="img" aria-labelledby="title"><title id="title">{escape(title)}</title>',
            '<defs><marker id="arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M1 1L8 4.5L1 8" fill="none" stroke="#596675" stroke-width="1.4"/></marker></defs>',
            f'<rect width="1600" height="{height}" fill="white"/><g font-family="Arial, Noto Sans CJK JP, Yu Gothic, Meiryo, sans-serif">']
        self.text(36, 50, title, 32, bold=True)

    def text(self, x, y, value, size=21, color='#263445', bold=False, anchor='start'):
        self.parts.append(f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}" font-weight="{700 if bold else 400}" text-anchor="{anchor}">{escape(value)}</text>')

    def box(self, x, y, w, h, label='', color='#8798ac', fill='white', dash=False, icon=None):
        self.parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" stroke="{color}" stroke-width="2"'+(' stroke-dasharray="8 6"' if dash else '')+'/>')
        if icon:
            self.icon(icon, x, y, 36)
        if label:
            self.text(x+(48 if icon else 18), y+28, label, 22, color, True)

    def icon(self, key, x, y, size=64):
        data = base64.b64encode((ICONS / FILES[key]).read_bytes()).decode()
        self.parts.append(f'<image x="{x}" y="{y}" width="{size}" height="{size}" href="data:image/svg+xml;base64,{data}"/>')

    def node(self, key, cx, y, title, subtitle='', size=64):
        self.icon(key, cx-size/2, y, size)
        self.text(cx, y+size+29, title, 22, anchor='middle')
        if subtitle:
            self.text(cx, y+size+56, subtitle, 18, '#536173', anchor='middle')

    def wire(self, points, kind='traffic', arrow=True):
        color = {'traffic':'#596675', 'attach':'#23844b', 'sync':'#ad32c1', 'deploy':'#3974b8'}[kind]
        dash = ' stroke-dasharray="8 6"' if kind in ('attach','deploy') else ''
        end = ' marker-end="url(#arrow)"' if arrow and kind != 'attach' else ''
        self.parts.append(f'<path d="{points}" fill="none" stroke="{color}" stroke-width="2.5"{dash}{end}/>')

    def options(self, items):
        y=self.height-100
        self.height+=320
        self.parts[0]=self.parts[0].replace(f'1600 {self.height-320}',f'1600 {self.height}')
        self.parts[2]=self.parts[2].replace(f'height="{self.height-320}"',f'height="{self.height}"')
        self.box(40,y,1520,306,'追加できるAWSサービス・機能（任意／基本図の対象を抜き出して表示）','#23844b',dash=True)
        for i,(key,target,title,detail) in enumerate(items):
            x=65+i*505
            self.box(x,y+54,480,228,color='#23844b',fill='#f8fcf9',dash=True)
            self.text(x+240,y+84,target,21,anchor='middle')
            self.wire(f'M{x+240} {y+95}V{y+120}','attach',False)
            self.node(key,x+240,y+125,title,detail,size=48)

    def finish(self, name, notes, extended=True):
        y = self.height-66
        self.wire(f'M40 {y-7}H100')
        self.text(115,y,'通信経路',18)
        if extended:
            self.wire(f'M255 {y-7}H315','attach',False)
            self.text(330,y,'緑破線：任意の追加・関連付け',18)
        for i,note in enumerate(notes):
            self.text(40,y+30+i*24,note,17,'#536173')
        self.parts.append('</g></svg>')
        (OUT/f'hosting-{name}.svg').write_text('\n'.join(self.parts),encoding='utf-8')


def ec2(extended=True):
    d=Diagram('EC2 + ALB ｜ '+('拡張構成：WAF・監視・バックアップ' if extended else '基本構成：2AZのWeb基盤'),1240)
    d.box(40,215,1520,910,'AWS Cloud','#263445',icon='cloud')
    d.box(70,265,1460,820,'Region：東京（ap-northeast-1）','#147d97',dash=True,icon='region')
    d.box(100,330,1100,710,'VPC：10.20.0.0/16','#8c4fff',icon='vpc')
    for x,az,octet in [(130,'Availability Zone A',0),(680,'Availability Zone B',1)]:
        d.box(x,415,490,595,az,'#5394d7',dash=True)
        d.box(x+15,465,460,145,'Public subnet','#7ca322','#f1f7e9',icon='public')
        d.box(x+15,640,460,160,'Private app','#00a4a6','#eaf7f8',icon='private')
        d.box(x+15,840,460,145,'Private DB','#00a4a6','#eaf7f8',icon='private')
        for y,net in [(493,octet),(668,octet+10),(868,octet+20)]:
            d.text(x+462,y,f'10.20.{net}.0/24',18,anchor='end')
    d.node('user',650,92,'利用者')
    d.wire('M650 188V297')
    d.text(668,204,'HTTPS',18)
    d.node('igw',650,298,'Internet Gateway',size=58)
    d.wire('M650 393V502')
    # One logical ALB spans two enabled public subnets, not two independent ALBs.
    d.box(300,510,700,86,fill='#ffffff',color='#8c4fff')
    d.icon('alb',614,520,64)
    d.text(594,541,'Application Load',20,anchor='end')
    d.text(594,568,'Balancer',20,anchor='end')
    d.text(700,548,'HTTPS : 443',20)
    d.text(700,577,'両AZの公開サブネットを使用',17)
    d.wire('M650 596V622H375V682')
    d.wire('M650 622H925V682')
    d.node('ec2',375,682,'EC2 / Web・アプリ',size=54)
    d.node('ec2',925,682,'EC2 / Web・アプリ',size=54)
    d.text(375,790,'受信：ALBのSGからのみ',17,anchor='middle')
    d.text(925,790,'受信：ALBのSGからのみ',17,anchor='middle')
    d.wire('M375 802V879')
    d.wire('M925 802V822H375')
    d.text(650,816,'同じDBエンドポイントへ接続',17,anchor='middle')
    d.node('rds',375,880,'RDS for MySQL / Primary',size=50)
    d.node('rds',925,880,'RDS / Standby',size=50)
    d.wire('M410 906H885','sync')
    d.text(650,896,'Multi-AZ 同期レプリケーション',17,'#ad32c1',anchor='middle')
    if extended:
        d.box(1215,458,305,209,color='#23844b',dash=True)
        d.node('waf',1360,490,'AWS WAF（任意）','Regional Web ACL（同一Region）')
        d.wire('M1324 522H1000','attach',False)
        d.text(1360,639,'ALBへ関連付け',21,'#23844b',True,'middle')
    d.node('acm',1360,750,'AWS Certificate Manager','ALBのTLS証明書')
    if extended:
        d.text(1230,964,'EC2へWAFを直接関連付けない',18)
        d.options([('cloudwatch','EC2 / RDS','CloudWatch','OSログ・メモリはエージェント等を設定'),('backup','EC2 / RDS','AWS Backup','保護対象・保持期間・復元試験を設計'),('route53','利用者のDNS問い合わせ','Route 53','ALBへのAliasレコードを設定')])
    d.finish('ec2' if extended else 'ec2-basic',['構成例：管理・外向き通信・共有ファイルの経路は省略／Standbyは通常の読取りには使用しない'],extended)


def edge_base(title, height=1050, extended=True):
    d=Diagram(title,height)
    d.box(220,120,1340,790,'AWS Cloud','#263445',icon='cloud')
    d.box(255,200,590,640,'グローバル／エッジサービス','#8798ac',dash=True)
    d.node('user',110,408,'利用者')
    d.wire('M145 440H481')
    d.text(315,425,'HTTPS',19,anchor='middle')
    d.node('cloudfront',515,408,'Amazon CloudFront','利用者が管理するディストリビューション')
    if extended:
        d.box(330,240,370,150,color='#23844b',dash=True)
        d.node('waf',515,258,'AWS WAF（任意）','Global（CloudFront）Web ACL')
        d.wire('M515 385V408','attach',False)
        d.box(290,620,510,193,color='#23844b',dash=True)
        d.node('acm',515,658,'AWS Certificate Manager','独自ドメイン用証明書：us-east-1')
        d.wire('M515 650V550','attach',False)
    else:
        d.text(515,669,'CloudFront標準ドメインでHTTPS配信',20,anchor='middle')
        d.text(515,706,'WAFは含めない',20,anchor='middle')
    return d


def lightsail():
    d=edge_base('Lightsail + CloudFront ｜ 拡張構成：WAF・ログ・復旧')
    d.box(890,200,625,640,'Region：東京','#147d97',dash=True,icon='region')
    d.box(925,290,555,490,'Amazon Lightsail の管理領域','#ed8a23')
    d.box(960,358,485,367,'Availability Zone A','#5394d7',dash=True)
    d.node('lightsail',1170,408,'Lightsail インスタンス','固定IP + オリジン用DNS名')
    d.box(1000,565,405,119,'Webサーバー／アプリケーション','#8798ac','#f7f8fa')
    d.text(1020,623,'TLS証明書・カスタムヘッダー検証',19)
    d.text(1020,655,'管理・ログイン画面はキャッシュ除外',18)
    d.wire('M551 440H1133')
    d.text(905,422,'HTTPS',18,anchor='middle')
    d.text(905,468,'カスタムオリジン',17,anchor='middle')
    d.text(1200,815,'利用者管理のVPC・サブネットは描かない',18,anchor='middle')
    d.options([('s3','CloudFrontのアクセス記録','S3 ログバケット','配信用データと分離して保持'),('lightsail','Lightsail Linux / Unix インスタンス','Lightsail 自動スナップショット','復旧用の新規インスタンスを作成'),('route53','利用者のDNS問い合わせ','Route 53','CloudFrontへのAliasレコードを設定')])
    d.finish('lightsail',['通常のCloudFrontを使用／Lightsail CDNとは別構成／オリジンは1台のため冗長化なし', '直接アクセスの制限はオリジン側で実施／DBとバックアップの配置は別途設計'])


def s3(extended=True):
    d=edge_base('S3 + CloudFront ｜ '+('拡張構成：WAF・ログ・操作監査' if extended else '基本構成：非公開バケットから配信'),extended=extended)
    d.box(890,200,625,640,'Region：東京','#147d97',dash=True,icon='region')
    d.box(950,335,500,350,'Amazon S3：VPCの外側','#7ca322','#f7faef')
    d.node('s3',1200,408,'S3 バケット（非公開）','HTML / CSS / JavaScript / 画像')
    d.text(1200,596,'Block Public Access：有効',22,anchor='middle')
    d.text(1200,633,'通常のS3バケットオリジン',20,anchor='middle')
    d.wire('M551 440H1165')
    d.text(858,408,'HTTPS + OAC署名',19,anchor='middle')
    d.text(859,475,'オリジンへのアクセス',17,anchor='middle')
    d.box(950,715,500,86,fill='#f7f8fa')
    d.text(1200,748,'バケットポリシーで',21,anchor='middle')
    d.text(1200,780,'対象CloudFrontからのみ読取りを許可',21,anchor='middle')
    if extended:
        d.options([('s3','CloudFrontのアクセス記録','S3 ログバケット','配信用バケットと分離'),('cloudtrail','S3オブジェクト操作','CloudTrail データイベント','記録対象・費用・保存先を設定'),('route53','利用者のDNS問い合わせ','Route 53','CloudFrontへのAliasレコードを設定')])
    d.finish('s3' if extended else 's3-basic',['OACはCloudFrontのオリジンアクセス設定／独立した中継サーバーではない', 'S3 Webサイトエンドポイントは使用しない'],extended)


def amplify(extended=True):
    d=Diagram('Amplify Hosting ｜ '+('拡張構成：WAF・認証・SSRログ' if extended else '基本構成：マネージド配信とビルド'),1050)
    d.box(220,120,1340,790,'AWS Cloud','#263445',icon='cloud')
    d.box(270,230,740,585,'Amplify Hosting：AWS管理の配信・実行基盤','#dd344c')
    d.node('user',110,408,'利用者')
    d.wire('M145 440H398')
    d.text(290,421,'HTTPS',19,anchor='middle')
    d.node('amplify',435,408,'Amplify アプリ','カスタムドメイン／TLS')
    d.box(660,340,300,150,'静的コンテンツ','#8798ac','#f7f8fa')
    d.text(680,405,'HTML / CSS / JavaScript',19)
    d.text(680,448,'マネージド配信',19)
    d.box(660,560,300,150,'対応SSRランタイム','#8798ac','#f7f8fa')
    d.text(680,625,'対応するフレームワーク',19)
    d.text(680,668,'サーバー側でレンダリング',19)
    d.wire('M470 440H605V405H658')
    d.wire('M605 440V625H658')
    d.text(628,757,'アプリの実行方式に応じて利用',20,anchor='middle')
    if extended:
        d.box(1080,238,425,220,color='#23844b',dash=True)
        d.node('waf',1260,265,'AWS WAF（任意）','Global（CloudFront）Web ACL')
        d.wire('M1225 297H1050V300H435V408','attach',False)
        d.text(1240,429,'Amplifyアプリへ直接統合',21,'#23844b',True,'middle')
    d.box(1090,535,405,272,'ビルド・デプロイ領域','#3974b8','#f4f8fc')
    d.text(1292,614,'Gitリポジトリ連携',23,anchor='middle')
    d.text(1292,680,'Amplify のビルド・デプロイ',22,anchor='middle')
    d.wire('M1292 631V654','deploy')
    d.wire('M1090 686H1030V788H435V560','deploy')
    d.text(1270,767,'青破線：公開・更新の経路',18,'#3974b8',anchor='middle')
    if extended:
        d.options([('cloudwatch','対応するSSRアプリ','CloudWatch Logs','IAMサービスロール・ログ出力を設定'),('cognito','アプリのユーザーログイン','Amazon Cognito','アプリ実装・トークン検証が必要'),('route53','利用者のDNS問い合わせ','Route 53','Amplifyのカスタムドメインと連携')])
    d.finish('amplify' if extended else 'amplify-basic',['利用者管理のVPC・サブネット・ALBは配置しない／別URLのAPIやバックエンドは別途保護'],extended)


def lightsail_basic():
    d=Diagram('Lightsail ｜ 基本構成：インスタンスへ直接HTTPS接続',950)
    d.box(300,160,1240,630,'AWS Cloud','#263445',icon='cloud')
    d.box(600,240,890,490,'Region：東京 / Lightsail の管理領域','#147d97',dash=True,icon='region')
    d.box(780,315,650,345,'Availability Zone A','#5394d7',dash=True)
    d.node('user',130,360,'利用者')
    d.node('lightsail',1100,360,'Lightsail インスタンス','Webサーバー / アプリケーション')
    d.wire('M168 392H1063')
    d.text(540,371,'HTTPS：固定IPに対応するDNS名',21,anchor='middle')
    d.text(1100,550,'サーバー側にTLS証明書を設定',22,anchor='middle')
    d.text(1100,600,'WAF / CloudFront は含めない',21,anchor='middle')
    d.finish('lightsail-basic',['単一インスタンスの構成例／冗長化・DB・バックアップは要件に合わせて追加'],False)


def build():
    ec2(False)
    lightsail_basic()
    amplify(False)
    s3(False)
    ec2()
    lightsail()
    amplify()
    s3()


if __name__ == '__main__':
    build()
