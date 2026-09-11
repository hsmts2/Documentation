from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
from collections import Counter
class Page(HTMLParser):
 def __init__(self,s):
  super().__init__(); self.ids=[];self.refs=[];self.text=[];self.imgs=[];self.feed(s)
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id' in a:self.ids.append(a['id'])
  if tag=='a' and 'href' in a:self.refs.append(a['href'])
  if tag=='img':self.refs.append(a['src']);self.imgs.append(a)
 def handle_data(self,data): self.text.append(data)
r=Path(__file__).resolve().parents[1]; pages=list((r/'tutorials').glob('workspaces-*.html')); errors=[]
cache={p.resolve():Page(p.read_text('utf-8-sig')) for p in pages}
for p in pages:
 doc=cache[p.resolve()];errors += [f'{p.name} duplicate {i}' for i,n in Counter(doc.ids).items() if n>1]
 for ref in doc.refs:
  u=urlsplit(ref)
  if u.scheme or u.netloc:continue
  target=(p.parent/unquote(u.path)).resolve() if u.path else p.resolve()
  if not target.exists():errors.append(f'{p.name} missing: {u.path}')
  elif u.fragment and target.suffix=='.html':
   if target not in cache:cache[target]=Page(target.read_text('utf-8-sig'))
   if unquote(u.fragment) not in cache[target].ids:errors.append(f'{p.name} anchor: {u.path}#{u.fragment}')
 text=' '.join(doc.text)
 bad=[v for v in ['画像内の番号','Confluence目次','根拠ではありません','ありませんだった','ad.datumidea.jp','skyarch-pid','p-pm','ibm-as'] if v in text]
 print(p.name,'images',len(doc.imgs)-1,'bad',bad)
 if bad:errors.append(f'{p.name}: {bad}')
print('\n'.join(errors));print('ERRORS',len(errors));raise SystemExit(1 if errors else 0)

