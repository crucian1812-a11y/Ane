#!/usr/bin/env bash
# Распаковывает архивы из _release/, отбирает фотографии и делает две версии:
#   photos/web/NNNN.jpg    — до 1600px, для слайдшоу и лайтбокса
#   photos/thumbs/NNNN.jpg — 500x500, для сетки
# Оригиналы на сайт не попадают: они тяжёлые и не нужны.
set -euo pipefail

SRC=${1:-_release}
RAW=_raw
OUT=photos

MAGICK=$(command -v magick || command -v convert || true)
if [ -z "$MAGICK" ]; then
  echo "Нет ImageMagick — без него превью не сделать." >&2
  exit 1
fi

rm -rf "$RAW" "$OUT/web" "$OUT/thumbs"
mkdir -p "$RAW" "$OUT/web" "$OUT/thumbs"

shopt -s nullglob nocaseglob

for f in "$SRC"/*; do
  case "${f,,}" in
    *.7z)          echo "Распаковываю $f"; 7z x -y -bso0 -bsp0 -o"$RAW" "$f" ;;
    *.zip)         echo "Распаковываю $f"; unzip -q -o "$f" -d "$RAW" ;;
    *.tar.gz|*.tgz) echo "Распаковываю $f"; tar -xzf "$f" -C "$RAW" ;;
    *.tar)         echo "Распаковываю $f"; tar -xf "$f" -C "$RAW" ;;
    *.jpg|*.jpeg|*.png|*.webp|*.heic) cp "$f" "$RAW/" ;;
    *) echo "Пропускаю $f" ;;
  esac
done

shopt -u nocaseglob

# Отбираем картинки. Мимо идут стикеры, кружочки, аватарки и прочий мусор
# телеграм-экспорта, а также всё мельче 25 КБ — это иконки и превью.
find "$RAW" -type f \
  \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' -o -iname '*.heic' -o -iname '*.avif' \) \
  -size +25k \
  -not -path '*/stickers/*' \
  -not -path '*/voice_messages/*' \
  -not -path '*/video_files/*' \
  -not -path '*/round_video_messages/*' \
  -not -path '*/profile_pictures/*' \
  -not -path '*/__MACOSX/*' \
  -not -name '._*' \
  | sort -V > /tmp/photo-list.txt

TOTAL=$(wc -l < /tmp/photo-list.txt)
echo "Нашёл фотографий: $TOTAL"
if [ "$TOTAL" -eq 0 ]; then
  echo "Внутри архива фотографий не оказалось. Вот что там лежит:"
  find "$RAW" -type f | head -40
  exit 0
fi

# Соответствие «номер → исходный путь», пригодится для подписей
: > "$OUT/index.tsv"
n=0
while IFS= read -r src; do
  n=$((n + 1))
  printf '%04d\t%s\n' "$n" "${src#$RAW/}" >> "$OUT/index.tsv"
  printf '%s\t%04d\n' "$src" "$n"
done < /tmp/photo-list.txt > /tmp/photo-jobs.tsv

export MAGICK OUT

resize_one() {
  local src="${1%%$'\t'*}"
  local num="${1##*$'\t'}"
  "$MAGICK" "$src" -auto-orient -resize '1600x1600>' -quality 82 -strip "$OUT/web/$num.jpg" 2>/dev/null || return 0
  "$MAGICK" "$src" -auto-orient -thumbnail '500x500^' -gravity center -extent 500x500 -quality 78 -strip "$OUT/thumbs/$num.jpg" 2>/dev/null || true
}
export -f resize_one

parallel_jobs=$(nproc 2>/dev/null || echo 2)
< /tmp/photo-jobs.tsv xargs -d '\n' -P "$parallel_jobs" -I{} bash -c 'resize_one "$@"' _ {}

rm -rf "$RAW"
echo "Готово: $(find "$OUT/web" -name '*.jpg' | wc -l) фото, $(du -sh "$OUT" | cut -f1)"
