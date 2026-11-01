/**
 * Seed: the verified company catalogue (packages/shared/src/reference/
 * companies.ts) with its corporate actions, and an optional first
 * administrator. Nothing else.
 *
 * There are no investors, folios, leads, cases or partners here. Investor
 * records come only from real IEPF-2 / IEPF-4 statements
 * (`npm run ingest:iepf`, or the admin importer), and prices only from the
 * market sync in the API. Re-running updates contacts and corporate actions.
 *
 *   SEED_ADMIN_PHONE=98xxxxxxxx SEED_ADMIN_NAME="Your Name" npm run db:seed
 *
 * Without SEED_ADMIN_PHONE, development and test databases get a default
 * administrator on 9000000001 so /admin works out of the box. Production
 * never does: whoever holds that number would receive the admin login code.
 */
import "dotenv/config";
import { normalizeIndianMobile, REFERENCE_COMPANIES } from "@finsol/shared";

import { createPrismaClient } from "../index.js";
import { MARKET_SYNC_SOURCES } from "../market-sources.js";

const prisma = createPrismaClient();

async function seedCompanies() {
  for (const c of REFERENCE_COMPANIES) {
    const contacts = {
      name: c.name,
      cin: c.cin,
      statutoryBasis: c.statutoryBasis,
      isin: c.isin,
      legacyIsins: c.legacyIsins ?? [],
      sector: c.sector,
      tickerNse: c.tickerNse,
      tickerBse: c.tickerBse,
      rtaName: c.rta,
      rtaDisplayName: c.rtaDisplayName,
      rtaAddress: c.rtaAddress,
      rtaEmail: c.rtaEmail,
      rtaPhone: c.rtaPhone,
      rtaWebsite: c.rtaWebsite,
      nodalOfficerName: c.nodalOfficer.name,
      nodalOfficerEmail: c.nodalOfficer.emails.length ? c.nodalOfficer.emails.join(" / ") : null,
      nodalOfficerPhone: c.nodalOfficer.phone,
      nodalOfficeAddress: c.nodalOfficer.address,
      deputyNodalOfficers: c.deputyNodalOfficers,
      irPageUrl: c.irPageUrl,
      contactsSource: c.contactsSource,
      contactsVerifiedAt: new Date(`${c.contactsVerifiedOn}T12:00:00+05:30`),
    };
    const company = await prisma.company.upsert({
      where: { slug: c.slug },
      update: contacts,
      create: { slug: c.slug, ...contacts },
    });
    // Catalogue actions are replaced; dividends written by the market sync stay.
    await prisma.corporateAction.deleteMany({
      where: {
        companyId: company.id,
        OR: [{ source: null }, { source: { notIn: [...MARKET_SYNC_SOURCES] } }],
      },
    });
    await prisma.corporateAction.createMany({
      data: c.actions.map((a) => ({
        companyId: company.id,
        actionType: a.actionType,
        exDate: new Date(a.exDate),
        ratioFrom: a.ratioFrom ?? null,
        ratioTo: a.ratioTo ?? null,
        dividendPerShare: a.dividendPerShare ?? null,
        notes: a.notes ?? null,
        source: a.source ?? null,
      })),
      skipDuplicates: true,
    });
  }
}

export const DEFAULT_ADMIN_PHONE = "9000000001";

async function seedAdmin() {
  const production = process.env.NODE_ENV === "production";
  const raw = process.env.SEED_ADMIN_PHONE || (production ? undefined : DEFAULT_ADMIN_PHONE);
  if (!raw) {
    console.log("No SEED_ADMIN_PHONE set: no administrator created. Set it to sign in to /admin.");
    return;
  }
  const phone = normalizeIndianMobile(raw);
  if (!phone) throw new Error("SEED_ADMIN_PHONE is not a valid Indian mobile number.");
  const name = process.env.SEED_ADMIN_NAME?.trim() || "Finsol Administrator";
  await prisma.user.upsert({
    where: { phone },
    update: { role: "SUPER_ADMIN", isActive: true },
    create: { phone, name, role: "SUPER_ADMIN" },
  });
  console.log(`Administrator ${name} (+91 ••••• •${phone.slice(-4)}) ready.`);
}

async function main() {
  const started = Date.now();
  await seedCompanies();
  await seedAdmin();
  const counts = {
    companies: await prisma.company.count(),
    corporateActions: await prisma.corporateAction.count(),
    folios: await prisma.unclaimedFolio.count(),
    users: await prisma.user.count(),
  };
  console.log(`Seeded in ${Date.now() - started} ms:`, counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
