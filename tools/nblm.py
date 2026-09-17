#!/usr/bin/env python3
"""NotebookLM 連携ヘルパー。

使い方:
  python3 tools/nblm.py export   # NotebookLM に投入するテキストを書き出す
  python3 tools/nblm.py index    # docs/context/INDEX.md を再生成する
  python3 tools/nblm.py check    # 要約が元ファイルより古ければ非ゼロ終了

標準ライブラリのみで動く。依存パッケージなし。
"""

from __future__ import annotations

import hashlib
import re
import sys
from datetime import date
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCES = ROOT / "docs" / "notebooklm" / "sources"
SUMMARIES = ROOT / "docs" / "notebooklm" / "summaries"
INDEX_MD = ROOT / "docs" / "context" / "INDEX.md"

# NotebookLM に投入する対象。(リポジトリ内の相対パス, 書き出し名)
EXPORT_TARGETS = [("index.html", "index.html.txt")]

# 日本語混在テキストのざっくりトークン概算(1トークン≒1.7文字)
CHARS_PER_TOKEN = 1.7


def est_tokens(text: str) -> int:
    return int(len(text) / CHARS_PER_TOKEN)


def sha256_of(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


# --------------------------------------------------------------------------
# export: HTML から本文テキストを抜き出して NotebookLM 投入用に書き出す
# --------------------------------------------------------------------------

class TextExtractor(HTMLParser):
    """script/style/svg を捨てて、見出しに印を付けながら本文を拾う。"""

    SKIP = {"script", "style", "svg", "noscript"}
    HEADINGS = {"h1", "h2", "h3", "h4"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self._skip_depth = 0
        self._heading: str | None = None

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP:
            self._skip_depth += 1
        elif tag in self.HEADINGS:
            self._heading = tag
            self.parts.append("\n\n" + "#" * int(tag[1]) + " ")
        elif tag in {"p", "li", "tr", "div", "section", "br"}:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in self.SKIP and self._skip_depth:
            self._skip_depth -= 1
        elif tag in self.HEADINGS:
            self._heading = None
            self.parts.append("\n")

    def handle_data(self, data):
        if self._skip_depth:
            return
        text = data.strip()
        if text:
            self.parts.append(text if self._heading else text + " ")

    def text(self) -> str:
        raw = "".join(self.parts)
        raw = re.sub(r"[ \t]+", " ", raw)
        raw = re.sub(r" *\n *", "\n", raw)
        raw = re.sub(r"\n{3,}", "\n\n", raw)
        return raw.strip() + "\n"


def cmd_export() -> int:
    SOURCES.mkdir(parents=True, exist_ok=True)
    for rel, out_name in EXPORT_TARGETS:
        src = ROOT / rel
        if not src.exists():
            print(f"skip: {rel} が見つかりません")
            continue
        parser = TextExtractor()
        parser.feed(src.read_text(encoding="utf-8"))
        body = parser.text()
        header = (
            f"# NotebookLM 投入用テキスト\n"
            f"# 出典: {rel}\n"
            f"# sha256: {sha256_of(src)}\n"
            f"# 書き出し日: {date.today().isoformat()}\n\n"
        )
        out = SOURCES / out_name
        out.write_text(header + body, encoding="utf-8")
        before, after = src.stat().st_size, len(body.encode("utf-8"))
        print(
            f"{rel} -> {out.relative_to(ROOT)} "
            f"({before:,}B -> {after:,}B / 概算 {est_tokens(body):,} tokens)"
        )
    print("\nこのファイルを NotebookLM にアップロードしてください。")
    print("PDF はそのまま NotebookLM にアップロードできます(変換不要)。")
    return 0


# --------------------------------------------------------------------------
# index: セクションマップと要約カタログを生成する
# --------------------------------------------------------------------------

class SectionMapper(HTMLParser):
    """section/main/footer の id と h1-h3 の行番号を拾う。"""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.marks: list[tuple[int, str, str]] = []  # (行, 種別, ラベル)
        self._heading_line: int | None = None
        self._heading_buf: list[str] = []

    def handle_starttag(self, tag, attrs):
        attrd = dict(attrs)
        line = self.getpos()[0]
        if tag in {"section", "main", "header", "footer"} and attrd.get("id"):
            self.marks.append((line, "block", f'#{attrd["id"]}'))
        elif tag in {"h1", "h2", "h3"}:
            self._heading_line = line
            self._heading_buf = []

    def handle_endtag(self, tag):
        if tag in {"h1", "h2", "h3"} and self._heading_line is not None:
            label = " ".join("".join(self._heading_buf).split())
            if label:
                self.marks.append((self._heading_line, "heading", label))
            self._heading_line = None

    def handle_data(self, data):
        if self._heading_line is not None:
            self._heading_buf.append(data)


def parse_frontmatter(path: Path) -> dict[str, str]:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---"):
        return {}
    _, _, rest = text.partition("---\n")
    block, _, _ = rest.partition("\n---")
    meta = {}
    for line in block.splitlines():
        key, sep, value = line.partition(":")
        if sep:
            meta[key.strip()] = value.strip()
    return meta


def summary_rows() -> tuple[list[str], list[str]]:
    """(表の行, 警告メッセージ) を返す。"""
    rows, warnings = [], []
    files = sorted(p for p in SUMMARIES.glob("*.md") if not p.name.startswith("_"))
    for path in files:
        meta = parse_frontmatter(path)
        title = meta.get("title", path.stem)
        source = meta.get("source", "-")
        updated = meta.get("updated", "-")
        recorded = meta.get("source_sha", "")
        status = "✅ 最新"
        src_path = ROOT / source if source != "-" else None
        if src_path and src_path.exists():
            current = sha256_of(src_path)
            if not recorded:
                status = "⚠️ sha 未記録"
                warnings.append(f"{path.name}: source_sha が空です")
            elif recorded != current:
                status = "🔴 要更新"
                warnings.append(
                    f"{path.name}: {source} が更新済み。NotebookLM で要約し直してください"
                )
        elif source != "-":
            status = "⚠️ 出典なし"
            warnings.append(f"{path.name}: source `{source}` が存在しません")
        rel = path.relative_to(ROOT)
        tokens = est_tokens(path.read_text(encoding="utf-8"))
        rows.append(f"| [{title}]({rel}) | `{source}` | {updated} | 約{tokens:,} | {status} |")
    return rows, warnings


def cmd_index() -> int:
    INDEX_MD.parent.mkdir(parents=True, exist_ok=True)
    html_path = ROOT / "index.html"

    lines = [
        "# コンテキスト索引(自動生成)",
        "",
        "> `python3 tools/nblm.py index` で再生成されます。手で編集しないでください。",
        f"> 最終生成: {date.today().isoformat()}",
        "",
        "**Claude Code へ: まずこのファイルを読み、必要な範囲だけを `sed -n 'A,Bp'` で開いてください。**",
        "大きなファイルを丸ごと読むのは禁止です(下の「読んではいけないファイル」参照)。",
        "",
        "## 1. NotebookLM 要約カタログ",
        "",
        "リポジトリの内容を知りたいときは、まずここの要約を読む。",
        "",
        "| 要約 | 出典 | 更新日 | 概算トークン | 鮮度 |",
        "| --- | --- | --- | --- | --- |",
    ]

    rows, warnings = summary_rows()
    lines.extend(rows or ["| _(まだありません)_ | - | - | - | - |"])
    lines += [
        "",
        "「🔴 要更新」は出典ファイルが要約後に変更されたという意味です。",
        "その要約は古い可能性があるので、NotebookLM で作り直してください",
        "(手順: `docs/notebooklm/README.md`)。",
        "",
        "## 2. 読んではいけないファイル(全文読み込み禁止)",
        "",
        "| ファイル | サイズ | 概算トークン | 代わりにすること |",
        "| --- | --- | --- | --- |",
    ]

    big_files = []
    for path in sorted(ROOT.rglob("*")):
        if not path.is_file() or ".git" in path.parts:
            continue
        size = path.stat().st_size
        if size < 20_000:
            continue
        rel = path.relative_to(ROOT)
        if path.suffix.lower() == ".pdf":
            tokens = "不明(バイナリ)"
            advice = "NotebookLM にアップロードして要約を読む"
        else:
            tokens = f"約{est_tokens(path.read_text(encoding='utf-8', errors='ignore')):,}"
            advice = "下のセクションマップで行範囲を絞って `sed -n`"
        big_files.append(f"| `{rel}` | {size:,}B | {tokens} | {advice} |")
    lines.extend(big_files or ["| _(なし)_ | - | - | - |"])

    if html_path.exists():
        mapper = SectionMapper()
        mapper.feed(html_path.read_text(encoding="utf-8"))
        total = len(html_path.read_text(encoding="utf-8").splitlines())
        marks = sorted(mapper.marks)
        lines += [
            "",
            "## 3. index.html セクションマップ",
            "",
            f"全 {total} 行。編集したい箇所の行範囲だけを開くこと。",
            "",
            "ブロック(`#id`)の範囲は配下の見出しを含むため、見出しの行と重なります。",
            "まずブロック単位で開き、大きすぎる場合だけ見出し単位に絞ってください。",
            "",
            "| 行範囲 | 行数 | 種別 | ラベル | 読み込みコマンド |",
            "| --- | --- | --- | --- | --- |",
        ]
        block_starts = [m[0] for m in marks if m[1] == "block"]
        for i, (line_no, kind, label) in enumerate(marks):
            if kind == "block":
                # 次のブロックの直前まで(配下の見出しを含む)
                later = [s for s in block_starts if s > line_no]
                end = later[0] - 1 if later else total
            else:
                end = marks[i + 1][0] - 1 if i + 1 < len(marks) else total
            kind_ja = "ブロック" if kind == "block" else "見出し"
            cmd = f"`sed -n \'{line_no},{end}p\' index.html`"
            lines.append(
                f"| {line_no}-{end} | {end - line_no + 1} | {kind_ja} | {label} | {cmd} |"
            )

    lines += [
        "",
        "## 4. 小さいファイル(そのまま読んでよい)",
        "",
    ]
    for path in sorted(ROOT.rglob("*")):
        if not path.is_file() or ".git" in path.parts:
            continue
        size = path.stat().st_size
        if 0 < size < 20_000 and path.suffix in {".xml", ".txt", ".md", ".json", ".yml", ".yaml"}:
            lines.append(f"- `{path.relative_to(ROOT)}` ({size:,}B)")
    lines.append("")

    INDEX_MD.write_text("\n".join(lines), encoding="utf-8")
    print(f"生成: {INDEX_MD.relative_to(ROOT)}")
    for warning in warnings:
        print(f"  ⚠️  {warning}")
    return 0


def cmd_check() -> int:
    _, warnings = summary_rows()
    if not warnings:
        print("✅ すべての要約が最新です")
        return 0
    for warning in warnings:
        print(f"⚠️  {warning}")
    return 1


COMMANDS = {"export": cmd_export, "index": cmd_index, "check": cmd_check}


def main() -> int:
    if len(sys.argv) != 2 or sys.argv[1] not in COMMANDS:
        print(__doc__)
        return 2
    return COMMANDS[sys.argv[1]]()


if __name__ == "__main__":
    raise SystemExit(main())
