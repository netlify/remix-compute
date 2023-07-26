describe('Demo Store Smoke Test', () => {
  it('Should load the demo store', () => {
    cy.visit('/')
    cy.findByRole('heading', { name: /Hydrogen/i }).should('exist')
    // Using \s here because there is an &nbsp; in the text and checking for that doesn't work
    cy.findByRole('heading', { name: /All Mountain All\sSeason/i }).should('exist')
    cy.findByRole('link', { name: /Collections/i }).should('exist')
    cy.findByRole('link', { name: /Products/i }).should('exist')
    cy.findByRole('link', { name: /Journal/i }).should('exist')
  })

  it('Should load a product collection', () => {
    Cypress.on('uncaught:exception', (err) => {
      // returning false here prevents Cypress from
      // failing the test
      console.log('Cypress detected uncaught exception: ', err)
      return false
    })

    cy.visit('/collections')
    cy.findByRole('heading', { name: /Freestyle Collection/i }).should('exist')
    // forcing the click as another element is covering the image in the DOM
    cy.findByRole('img', {
      name: /A snowboarder stands atop a snowy mountain holding his snowboard with the back facing the camera. The snowboard artwork reads Hydrogen, in a script font/i,
    }).click({ force: true })
    cy.findByRole('heading', { name: /Freestyle Collection/i }).should('exist')
  })

  it('Should load a product page', () => {
    cy.visit('/products/')
    cy.findByRole('link', { name: /The Hydrogen Snowboard/i }).click()
    cy.findByRole('heading', { name: /The Hydrogen Snowboard/i }).should('exist')
  })

  it('Should load a journal', () => {
    cy.visit('/journal')
    cy.findByRole('heading', { name: /The Best Places for Backcountry Snowboarding/i }).click()
    cy.findByRole('heading', { name: /The Best Places for Backcountry Snowboarding/i }).should('exist')
    cy.findAllByRole('img', { name: /Model sits on a red brick wall in front of the ocean/i }).should('exist')
  })
})
