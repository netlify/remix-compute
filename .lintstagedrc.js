module.exports = {
  '*.{json,yml}': ['prettier --write'],
  '*.md': ['prettier --write --prose-wrap always'],
  '*.{ts,js,cjs}': ['prettier --write', 'eslint --fix', 'vitest run related --passWithNoTests'],
}
