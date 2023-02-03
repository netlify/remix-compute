module.exports = {
  '*.{json,yml,md}': ['prettier --write'],
  '*.{ts,js,cjs}': ['prettier --write', 'eslint --fix', 'vitest run related --passWithNoTests'],
}
