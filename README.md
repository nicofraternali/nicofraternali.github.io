# nicofraternali.github.io

Personal blog, built with [Jekyll](https://jekyllrb.com) and deployed to GitHub Pages
by the workflow in `.github/workflows/pages.yml`.

## Run locally

Needs Ruby 3.1+ and Node.js (jektex renders LaTeX at build time through KaTeX).

```bash
bundle install
bundle exec jekyll serve --livereload
```

## Writing

- Posts go in `_posts/` as `YYYY-MM-DD-slug.md`.
- Images and media go in `assets/images/`.
- Math uses kramdown notation: `$$...$$` inside a paragraph is inline,
  `$$...$$` as its own paragraph is display math. Single `$` is plain text.
