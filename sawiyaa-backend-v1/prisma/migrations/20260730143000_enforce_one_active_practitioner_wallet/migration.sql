-- One canonical active wallet per practitioner. Historical closed wallets remain readable.
CREATE UNIQUE INDEX "uq_practitioner_wallet_one_active"
  ON "PractitionerWallet" ("practitionerId")
  WHERE "status" = 'ACTIVE';
