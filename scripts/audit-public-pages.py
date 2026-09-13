"""Check structural and local-reference integrity of published HTML pages."""

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parent.parent
PAGES = sorted(ROOT.glob("*.html")) + sorted((ROOT / "tutorials").glob("*.html"))


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title_parts = []
        self.in_title = False
        self.h1_count = 0
        self.description = None
        self.redirect = False
        self.ids = {}
        self.references = []
        self.errors = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        line = self.getpos()[0]
        if tag == "title":
            self.in_title = True
        elif tag == "h1":
            self.h1_count += 1
        elif tag == "meta":
            if attributes.get("name") == "description":
                self.description = attributes.get("content")
            if attributes.get("http-equiv", "").lower() == "refresh":
                self.redirect = True

        identifier = attributes.get("id")
        if identifier:
            if identifier in self.ids:
                self.errors.append(f"{line}: duplicate id '{identifier}' (first at {self.ids[identifier]})")
            self.ids[identifier] = line

        if tag == "img" and "alt" not in attributes:
            self.errors.append(f"{line}: image missing alt attribute")

        for attribute in ("href", "src"):
            value = attributes.get(attribute)
            if value and ((tag == "a" and attribute == "href") or
                          (tag in ("img", "script", "link") and attribute in attributes)):
                self.references.append((line, value))

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title_parts.append(data)


def resolve_reference(page, reference):
    url = urlsplit(reference)
    if url.scheme in ("http", "https", "mailto", "tel", "data") or url.netloc:
        return None, None
    if url.scheme:
        return "unsupported URL scheme", None
    if url.path.startswith("/"):
        target = ROOT / unquote(url.path.lstrip("/"))
    else:
        target = page.parent / unquote(url.path) if url.path else page
    target = target.resolve()
    if not target.is_relative_to(ROOT):
        return "reference leaves published directory", None
    if target.is_dir():
        target /= "index.html"
    return target, unquote(url.fragment)


def main():
    parsed = {}
    issues = []
    for page in PAGES:
        parser = PageParser()
        parser.feed(page.read_text(encoding="utf-8"))
        parsed[page] = parser
        relative = page.relative_to(ROOT)
        issues.extend(f"{relative}:{error}" for error in parser.errors)
        if not parser.redirect:
            if not "".join(parser.title_parts).strip():
                issues.append(f"{relative}: missing page title")
            if parser.h1_count != 1:
                issues.append(f"{relative}: expected one h1, found {parser.h1_count}")
            if page.parent == ROOT / "tutorials" and not parser.description:
                issues.append(f"{relative}: missing meta description")

    for page, parser in parsed.items():
        relative = page.relative_to(ROOT)
        for line, reference in parser.references:
            target, fragment = resolve_reference(page, reference)
            if target is None:
                continue
            if isinstance(target, str):
                issues.append(f"{relative}:{line}: {target}: {reference}")
            elif not target.is_file():
                issues.append(f"{relative}:{line}: missing local target: {reference}")
            elif fragment and target.suffix.lower() == ".html":
                target_parser = parsed.get(target)
                if target_parser and fragment not in target_parser.ids:
                    issues.append(f"{relative}:{line}: missing target id: {reference}")

    print(f"Audited {len(PAGES)} public HTML pages")
    for issue in issues:
        print(issue)
    print(f"Issues: {len(issues)}")
    return 1 if issues else 0


if __name__ == "__main__":
    raise SystemExit(main())
