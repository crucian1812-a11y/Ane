#!/usr/bin/env python3
"""Убирает дубликаты и раскладывает фотографии в порядок показа.

На вход — строки «дата<TAB>путь», на выход они же, но без повторов
и в нужном порядке. Порядок берётся из photos/order.txt (список имён
файлов, собранный руками), а всё, чего в списке нет, уезжает в конец
по дате съёмки и имени.
"""
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

    order = {}
    if os.path.exists(order_file):
        with open(order_file, encoding="utf-8") as f:
            for i, name in enumerate(f):
                name = name.strip()
                if name:
                    order[name] = i

    def key(row):
        taken, path = row
        rank = order.get(os.path.basename(path))
        return (0, rank, "", "") if rank is not None else (1, 0, taken, path)

    unique.sort(key=key)

    listed = sum(1 for _, p in unique if os.path.basename(p) in order)
    print(f"Повторов выброшено: {dropped}", file=sys.stderr)
    print(f"Из них разложено по order.txt: {listed}, остальных: {len(unique) - listed}", file=sys.stderr)

    out = sys.stdout
    for taken, path in unique:
        out.write(f"{taken}\t{path}\n")


main()
