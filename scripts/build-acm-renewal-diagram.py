"""Original Documentation layout, authored independently of the reference image.

Matches the downloadable example: EC2 retrieves secrets; Lambda orchestrates.
Sources: https://docs.aws.amazon.com/acm/latest/userguide/supported-events.html
https://docs.aws.amazon.com/acm/latest/userguide/managed-renewal.html
https://docs.aws.amazon.com/acm/latest/userguide/dns-validation.html
"""
from pathlib import Path
from build_hosting_architectures import Diagram, FILES

FILES.update({
    'eventbridge': 'Arch_Amazon-EventBridge_64.svg',
    'lambda': 'Arch_AWS-Lambda_64.svg',
    'secrets': 'Arch_AWS-Secrets-Manager_64.svg',
    'runcommand': 'Res_AWS-Systems-Manager_Run-Command_48.svg',
})


def build():
    d = Diagram('zexample.com ｜ 証明書更新の自動化', 1220)
    d.text(36, 85, 'DNS管理 ／ 実行制御 ／ ホストでの安全な反映', 23, '#536173')
    d.text(1545, 48, 'Documentation', 20, '#536173', anchor='end')
    d.box(36, 110, 1528, 1020, 'AWS Cloud', '#263445', icon='cloud')
    d.box(65, 170, 1470, 160, '01  DNS管理', '#63758a', '#f7f9fc')
    d.icon('route53', 96, 232, 64)
    d.text(180, 250, 'Amazon Route 53', 24, bold=True)
    d.text(180, 288, 'Public hosted zone：zexample.com', 21)
    d.text(735, 240, '検証用CNAMEを保持 → ACMの発行・更新に使用', 22, '#23774b')
    d.text(735, 278, '公開用レコード → Webサイトの名前解決に使用', 22, '#23774b')
    d.box(65, 375, 1470, 725, 'Region', '#147d97', dash=True, icon='region')
    d.box(96, 432, 655, 628, '02  更新制御', '#63758a', '#f7f9fc')
    d.box(1010, 432, 494, 628, 'VPC', '#8c4fff', icon='vpc')
    d.box(1034, 492, 446, 541, 'Public subnet', '#7ca322', '#f7faef', icon='public')
    d.text(1060, 567, '03  ホストでの証明書反映', 24, bold=True)
    d.node('acm', 280, 526, 'AWS Certificate Manager', '更新済み証明書を保持')
    d.node('eventbridge', 595, 526, 'Amazon EventBridge', 'RENEWAL ＋ 対象ARN')
    d.node('lambda', 595, 745, 'AWS Lambda', '固定のEC2・Documentを指定')
    d.node('runcommand', 280, 745, 'AWS Systems Manager', 'Run Command')
    d.wire('M316 558H555')
    d.text(438, 518, '更新通知', 19, anchor='middle')
    d.wire('M595 655V735')
    d.text(612, 699, '起動', 19)
    d.wire('M555 777H322')
    d.text(438, 734, '実行・結果確認', 19, anchor='middle')
    d.wire('M280 871V1020H978V675H1070')
    d.text(610, 1006, '固定スクリプトを起動（秘密情報は渡さない）', 20, anchor='middle')
    d.wire('M280 330V515', 'attach', False)
    d.text(304, 409, 'DNS検証', 18, '#23774b')
    d.icon('ec2', 1080, 638, 64)
    d.text(1165, 664, 'Amazon EC2', 24, bold=True)
    d.text(1165, 700, 'NGINX / Apache', 21)
    d.text(1060, 763, '① シークレット・証明書を取得', 22)
    d.text(1060, 810, '② 鍵・期限・ホスト名を検証', 22)
    d.text(1060, 857, '③ 世代を切替 → 構文確認', 22)
    d.text(1060, 904, '④ reload → TLS証明書照合', 22)
    d.text(1060, 969, '失敗時：旧世代へ復帰・再確認', 20, '#536173')
    # Request paths use separate routing corridors, not the event pipeline
    d.wire('M1435 636V410H815V488H280V515', 'deploy')
    d.text(830, 472, '証明書の取得', 18, '#3974b8')
    d.node('secrets', 860, 850, 'Secrets Manager', 'パスフレーズ', size=56)
    d.wire('M1034 878H901', 'deploy')
    d.text(871, 826, 'EC2から直接取得', 18, '#3974b8', anchor='middle')
    d.wire('M45 1171H105')
    d.text(120, 1178, '実線：イベント・実行制御', 18)
    d.wire('M520 1171H580', 'deploy')
    d.text(595, 1178, '青破線：取得APIの呼出し', 18)
    d.wire('M1020 1171H1080', 'attach', False)
    d.text(1095, 1178, '緑破線：DNS検証', 18)
    d.parts.append('</g></svg>')
    target = Path(__file__).resolve().parent.parent / 'assets/aws-design/acm-ec2-auto-renewal.svg'
    target.write_text('\n'.join(d.parts), encoding='utf-8')
    print(target)


if __name__ == '__main__':
    build()
