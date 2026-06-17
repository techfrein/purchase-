describe("Navigation", () => {
  it("staff can navigate main menu items", () => {
    cy.login("staff", "staff123");

    cy.contains("a", "Purchases").click();
    cy.url().should("include", "/purchases");
    cy.contains("h1", "Purchases").should("be.visible");

    cy.contains("a", "New Request").click();
    cy.url().should("include", "/purchases/new");

    cy.contains("a", "Reports").click();
    cy.url().should("include", "/reports");
    cy.contains("h1", "Reports").should("be.visible");
  });

  it("admin sees administration menu", () => {
    cy.login("admin", "admin123");
    cy.contains("Admin").should("be.visible");
    cy.contains("a", "Users").click();
    cy.url().should("include", "/admin/users");
    cy.contains("h1", "Users").should("be.visible");
  });

  it("staff does not see admin menu", () => {
    cy.login("staff", "staff123");
    cy.contains("a", "Users").should("not.exist");
    cy.contains("a", "Settings").should("not.exist");
  });
});