/// <reference types="cypress" />
import '@testing-library/cypress/add-commands'

// Handles React 18 hydration errors
// The hydration errors are because Cypress is manipulating the DOM
// See https://github.com/robipop22/dnb-stack/issues/3#issuecomment-1286112365
Cypress.on('uncaught:exception', (err) => {
  // we check if the error is
  if (err.message.includes('Minified React error #418;') || err.message.includes('Minified React error #423;')) {
    return false
  }
})
