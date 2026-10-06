"""Embed reviewed downloadable source files into collapsible documentation blocks."""
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGE = ROOT / 'tutorials/acm-ec2-auto-renewal.html'
SOURCES = ROOT / 'assets/code/acm-renewal'
ENTRIES = [
    ('lambda_function.py', 'Python', '① Lambda：更新イベントの検証・SSM実行・結果確認'),
    ('ssm-document.json', 'JSON', '② SSMドキュメント：EC2上の固定スクリプトを実行'),
    ('deploy_certificate.py', 'Python', '③ EC2：取得・検証・世代切替・reload・切り戻し'),
    ('host-config.json', 'JSON', '④ EC2の設定ファイル'),
    ('lambda-policy.json', 'JSON', '⑤ Lambda実行ロールに追加するIAMポリシー'),
    ('ec2-policy.json', 'JSON', '⑥ EC2インスタンスロールに追加するIAMポリシー'),
]


def build():
    blocks = ['<!-- acm-code:start -->']
    for filename, language, title in ENTRIES:
        source = (SOURCES / filename).read_text(encoding='utf-8')
        blocks.append(f'''      <details class="example-details acm-code-example">
        <summary>{title}を展開</summary>
        <p><a href="../assets/code/acm-renewal/{filename}" download>{filename}をダウンロード</a></p>
        <div class="code"><div class="code-header"><span>{language} · {filename}</span><button class="copy" type="button">Copy</button></div><pre><code>{escape(source)}</code></pre></div>
      </details>''')
    blocks.append('<!-- acm-code:end -->')
    text = PAGE.read_text(encoding='utf-8')
    start = text.index('<!-- acm-code:start -->')
    end = text.index('<!-- acm-code:end -->') + len('<!-- acm-code:end -->')
    PAGE.write_text(text[:start] + '\n'.join(blocks) + text[end:], encoding='utf-8')


if __name__ == '__main__':
    build()
