describe('Smoke Test', () => {
  it('Should load the demo site', () => {
    cy.visit('/')
    cy.findByRole('heading', { name: /Welcome to Remix/i }).should('exist')
    cy.findByRole('link', { name: /15m Quickstart Blog Tutorial/i }).should('exist')
    cy.findByRole('link', { name: /Deep Dive Jokes App Tutorial/i }).should('exist')
    cy.findByRole('link', { name: /Remix Docs/i }).should('exist')
  })
})
