declare global {
  namespace Cypress {
    interface Chainable {
      login(username: string, password: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add("login", (username: string, password: string) => {
  cy.visit("/login");
  cy.get('input[autocomplete="username"]').clear().type(username);
  cy.get('input[autocomplete="current-password"]').clear().type(password, { log: false });
  cy.contains("button", "Sign In").click();
  cy.url().should("eq", Cypress.config().baseUrl + "/");
});

export {};