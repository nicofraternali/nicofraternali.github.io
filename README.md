# nicofraternali.github.io

Personal blog, built with [Jekyll](https://jekyllrb.com) and deployed to GitHub Pages
by the workflow in `.github/workflows/pages.yml`.

## Run locally

Needs Ruby 3.1+ and Node.js (jektex renders LaTeX at build time through KaTeX).

```bash
bundle install
bundle exec jekyll serve --livereload --port 4001
```

## Writing

- Posts go in `_posts/` as `YYYY-MM-DD-slug.md`.
- Images and media go in `assets/images/`.
- Math uses kramdown notation: `$$...$$` inside a paragraph is inline,
  `$$...$$` as its own paragraph is display math. Single `$` is plain text.
- Numbered figures: `{% include figure.html src="/assets/images/x.png" alt="..." caption="..." width="..." height="..." %}`.
  Figures and display equations are numbered automatically per post.

## Design

Custom theme, no external theme or scripts. One palette ("ámbar fósforo", see
`_sass/_tokens.scss`), IBM Plex Mono self-hosted in `assets/fonts/`.

The footer draws real satellites (listed in `_data/satellites.yml`) propagated live
with SGP4. Their TLEs come from CelesTrak: `ruby scripts/fetch_tle.rb` refreshes
`_data/tle.json`, and the deploy workflow runs it on every build and twice a day.
