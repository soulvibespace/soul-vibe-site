#!/usr/bin/env python3
"""Публикация сайта на Netlify напрямую из этой папки.

Загружает файлы через API (без сборки на стороне Netlify), поэтому не зависит от
тарифа и правил про git-контрибьюторов. Источник истины — содержимое репозитория.

Запуск:  bash с api_credentials=["custom-cred:api.netlify.com"]
         python3 deploy.py
"""
import hashlib
import json
import os
import subprocess
import sys

import requests

SITE = "5160c45c-80d9-4a82-9a3d-068717d5fdc2"
API = "https://api.netlify.com/api/v1"
ROOT = os.path.dirname(os.path.abspath(__file__))
# Файлы, которые не должны попадать на сайт
SKIP_NAMES = {"deploy.py", "README.md", ".gitignore", ".DS_Store"}
SKIP_DIRS = {".git", ".github", "node_modules"}


def req(method, url, body=None):
    r = requests.request(method, url, json=body, timeout=180,
                         headers={"Accept": "application/json"})
    r.raise_for_status()
    return r.json() if r.content else {}


def put_file(deploy_id, path, local):
    with open(local, "rb") as f:
        blob = f.read()
    r = requests.put(f"{API}/deploys/{deploy_id}/files{path}", data=blob, timeout=300,
                     headers={"Content-Type": "application/octet-stream"})
    r.raise_for_status()


def sha1(p):
    h = hashlib.sha1()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def collect():
    out = {}
    for base, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for fn in files:
            if fn in SKIP_NAMES:
                continue
            full = os.path.join(base, fn)
            rel = "/" + os.path.relpath(full, ROOT).replace(os.sep, "/")
            out[rel] = (full, sha1(full))
    return out


def main():
    files = collect()
    print(f"файлов к публикации: {len(files)}")
    try:
        commit = subprocess.check_output(["git", "-C", ROOT, "rev-parse", "--short", "HEAD"],
                                         text=True).strip()
        subj = subprocess.check_output(["git", "-C", ROOT, "log", "-1", "--pretty=%s"],
                                       text=True).strip()
        title = f"{commit} {subj}"[:120]
        dirty = subprocess.check_output(["git", "-C", ROOT, "status", "--porcelain"], text=True)
        if dirty.strip():
            print("ВНИМАНИЕ: есть незакоммиченные изменения — сначала закоммить и запушь")
    except Exception:
        title = "manual deploy"

    dep = req("POST", f"{API}/sites/{SITE}/deploys",
              {"files": {p: s for p, (_, s) in files.items()},
               "draft": False, "title": title})
    did = dep["id"]
    need = dep.get("required", [])
    print(f"деплой {did} создан | догрузить файлов: {len(need)}")

    by_sha = {}
    for p, (full, s) in files.items():
        by_sha.setdefault(s, []).append((p, full))
    for s in need:
        for p, full in by_sha.get(s, []):
            put_file(did, p, full)
            print(f"   ↑ {p}")

    import time
    for _ in range(60):
        d = req("GET", f"{API}/deploys/{did}")
        st = d.get("state")
        if st in ("ready", "error"):
            print(f"состояние: {st} {d.get('error_message') or ''}")
            return 0 if st == "ready" else 1
        time.sleep(5)
    print("не дождались готовности")
    return 1


if __name__ == "__main__":
    sys.exit(main())
