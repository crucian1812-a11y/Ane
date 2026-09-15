#!/usr/bin/env python3
"""Убирает дубликаты и раскладывает фотографии в порядок показа.

На вход — строки «дата<TAB>путь», на выход они же, но без повторов
и в нужном порядке. Порядок берётся из photos/order.txt (список имён
файлов, собранный руками), а всё, чего в списке нет, уезжает в конец
по дате съёмки и имени.
"""
import fnmatch
import hashlib
import os
import sys


def digest(path):
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main():
    dated_file, order_file = sys.argv[1], sys.argv[2]

    rows = []
    for line in open(dated_file, encoding="utf-8"):
        line = line.rstrip("\n")
        if not line:
            continue
        taken, path = line.split("\t", 1)
        rows.append((taken, path))

    # один и тот же кадр в архиве нередко лежит дважды
    seen, unique, dropped = {}, [], 0
    for taken, path in rows:
        key = digest(path)
        if key in seen:
            dropped += 1
            continue
        seen[key] = path
        unique.append((taken, path))

    # Строка order.txt — либо имя файла, либо шаблон со звёздочкой.
    # Шаблон нужен для кадров, которые появятся позже: имена заранее
    # неизвестны, а место в ленте у них уже есть.
    names, patterns = {}, []
    if os.path.exists(order_file):
        with open(order_file, encoding="utf-8") as f:
            for i, line in enumerate(f):
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "*" in line or "?" in line:
                    patterns.append((i, line))
                else:
                    names[line] = i

    def rank_of(path):
        base = os.path.basename(path)
        if base in names:
            return names[base]
        for i, pattern in patterns:
            if fnmatch.fnmatch(base.lower(), pattern.lower()):
                return i
        return None

    def key(row):
        taken, path = row
        rank = rank_of(path)
        return (0, rank, "", os.path.basename(path)) if rank is not None else (1, 0, taken, path)

    unique.sort(key=key)

    listed = sum(1 for _, p in unique if rank_of(p) is not None)
    print(f"Повторов выброшено: {dropped}", file=sys.stderr)
    print(f"Из них разложено по order.txt: {listed}, остальных: {len(unique) - listed}", file=sys.stderr)

    out = sys.stdout
    for taken, path in unique:
        out.write(f"{taken}\t{path}\n")


main()
