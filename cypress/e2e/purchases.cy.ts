describe("Purchase requests", () => {
  const productName = () => `Cypress E2E ${Date.now()}`;

  it("staff form hides vendor pricing fields", () => {
    cy.login("staff", "staff123");
    cy.visit("/purchases/new");
    cy.contains("New Purchase Request").should("be.visible");
    cy.contains("you don't need to enter vendor pricing").should("be.visible");
    cy.contains("Unit Price").should("not.exist");
    cy.contains("Vendor Name").should("not.exist");
    cy.contains("Submit Request").should("be.visible");
  });

  it("staff can submit a request without vendor price", () => {
    cy.login("staff", "staff123");
    cy.visit("/purchases/new");

    const name = productName();
    cy.get('input[name="productName"]').type(name);
    cy.get('select[name="category"]').select("Other");
    cy.get('input[name="quantity"]').clear().type("2");
    cy.get('textarea[name="notes"]').type("Cypress staff e2e test");
    cy.contains("button", "Submit Request").click();

    cy.url().should("match", /\/purchases\/\d+$/);
    cy.contains(name).should("be.visible");
    cy.contains("Unit price").should("not.exist");
  });

  it("purchase dept sees optional vendor pricing fields", () => {
    cy.login("purchase", "purchase123");
    cy.visit("/purchases/new");
    cy.contains("Quoted Price (optional)").should("be.visible");
    cy.contains("Vendor & Invoice (optional)").should("be.visible");
    cy.get('input[name="unitPrice"]').should("exist");
    cy.get('input[name="vendorName"]').should("exist");
  });

  it("purchase dept can submit without vendor price", () => {
    cy.login("purchase", "purchase123");
    cy.visit("/purchases/new");

    const name = productName();
    cy.get('input[name="productName"]').type(name);
    cy.get('select[name="category"]').select("Medical Equipment");
    cy.get('input[name="quantity"]').clear().type("1");
    cy.contains("button", "Save & Verify Price").click();

    cy.url().should("match", /\/purchases\/\d+$/);
    cy.contains(name).should("be.visible");
    cy.contains("Quoted Purchase").should("be.visible");
    cy.contains("Unit price").should("be.visible");
    cy.contains("Quoted Purchase").parent().should("contain", "—");
  });

  it("purchase list is searchable after login", () => {
    cy.login("purchase", "purchase123");
    cy.visit("/purchases");
    cy.contains("Purchases").should("be.visible");
    cy.get('input[name="q"]').should("exist");
    cy.contains("button", "Filter").should("be.visible");
  });
});