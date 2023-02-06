/// <reference types="cypress" />
import '@testing-library/cypress/add-commands'

// Handles React 18 hydration errors
Cypress.on('uncaught:exception', (err) => {
  // we check if the error is
  if (err.message.includes('Minified React error #418;') || err.message.includes('Minified React error #423;')) {
    return false
  }
})
