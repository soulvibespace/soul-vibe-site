#!/usr/bin/env python3
"""Добавляет ?v=<хеш содержимого> к локальным .js и .css во всех HTML в dist/.

Зачем: Safari на iPhone иногда берёт старые i18n.js / style.css из памяти,
а HTML — новый. Тогда на странице видны ключи вида vb_h1 вместо текста.
С версией в адресе браузер обязан загрузить файл заново после каждого изменения.
"""
import hashlib
import pathlib
import re
import sys

root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "dist").resolve()
pat = re.compile(r'(\b(?:src|href)=")([^"?#:]+\.(?:js|css))(")')
cache = {}


def version(path):
    if path not in cache:
        cache[path] = hashlib.md5(path.read_bytes()).hexdigest()[:10] if path.is_file() else None
    return cache[path]


changed = 0
for html in root.rglob("*.html"):
    text = html.read_text(encoding="utf-8")

    def repl(m):
        global changed
        ref = m.group(2)
        if ref.startswith("//"):
            return m.group(0)
        target = (root / ref.lstrip("/")) if ref.startswith("/") else (html.parent / ref)
        v = version(target.resolve())
        if not v:
            return m.group(0)
        changed += 1
        return f"{m.group(1)}{ref}?v={v}{m.group(3)}"

    new = pat.sub(repl, text)
    if new != text:
        html.write_text(new, encoding="utf-8")
print(f"версии файлов: {changed} ссылок")
