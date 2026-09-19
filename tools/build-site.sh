#!/usr/bin/env bash
# Build the GitHub Pages site into _site/.
#
# The landing page (index.html) is the inventory: every card with a
# data-game="<folder>" attribute is published, and nothing else is. To
# publish a game, add its card; to keep a game off the site, leave it off.
#
# Each card's <time> is stamped with the date of the last commit that
# touched the game's folder. docs/ and test/ don't count: they don't change
# what players get.
#
# Run locally to refresh the dates before committing; the publish workflow
# runs it again on every push to main.
set -euo pipefail
cd "$(dirname "$0")/.."

games=$(grep -o 'data-game="[^"]*"' index.html | cut -d'"' -f2)

for g in $games; do
  [ -f "$g/index.html" ] || { echo "error: $g/index.html not found" >&2; exit 1; }
  iso=$(git log -1 --format=%cs -- "$g" ":!$g/docs" ":!$g/test")
  human=$(git log -1 --date=format:'%d %B %Y' --format=%cd -- "$g" ":!$g/docs" ":!$g/test")
  G="$g" ISO="$iso" HUMAN="$human" perl -0777 -pi -e \
    's|(data-game="\Q$ENV{G}\E".*?<time datetime=")[^"]*(">)[^<]*(</time>)|${1}$ENV{ISO}${2}Published $ENV{HUMAN}${3}|s' \
    index.html
  echo "$g: published $human"
done

rm -rf _site
mkdir _site
cp index.html _site/
for g in $games; do cp -R "$g" "_site/$g"; done
echo "_site/ built with: $(echo $games | tr '\n' ' ')"
