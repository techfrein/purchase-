describe("Authentication", () => {
  it("redirects unauthenticated users to login", () => {
    cy.visit("/purchases");
    cy.url().should("include", "/login");
  });

  it("shows login page with hospital branding", () => {
    cy.visit("/login");
    cy.contains("Sign In").should("be.visible");
    cy.contains("Purchase Verification Portal").should("exist");
  });

  it("rejects invalid credentials", () => {
    cy.visit("/login");
    cy.get('input[autocomplete="username"]').type("nobody");
    cy.get('input[autocomplete="current-password"]').type("wrongpass");
    cy.contains("button", "Sign In").click();
    cy.contains(/invalid|failed|incorrect/i).should("be.visible");
    cy.url().should("include", "/login");
  });

  it("logs in as staff and reaches dashboard", () => {
    cy.login("staff", "staff123");
    cy.contains("Welcome to").should("be.visible");
    cy.contains("Recent Purchases").should("be.visible");
  });

  it("logs out and returns to login", () => {
    cy.login("staff", "staff123");
    cy.contains("button", "Sign Out").click();
    cy.url().should("include", "/login");
  });
});