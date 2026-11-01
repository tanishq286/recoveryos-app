/**
 * TEST FIXTURES, for the API's end-to-end suite only.
 *
 * Synthetic people, folios, leads and cases so the tests can exercise every
 * flow. They are never part of the seed and this script refuses to touch any
 * database whose name does not end in "_test". The folios are created by
 * pushing fixture IEPF-4 and IEPF-2 statements through the real ingestion
 * pipeline (ingestStatement), so the tests cover the parser too.
 */
import {
  holdingValuePaise,
  DEFAULT_SUCCESS_FEE_BPS,
  associateCommission,
  netRealization,
} from "@recoveryos/shared";

import { createPrismaClient, ingestStatement, keysFromEnv } from "../index.js";

const url = process.env.DATABASE_URL ?? "";
if (!/_test(\?|$)/.test(url)) {
  console.error(
    "Refusing to load test fixtures: DATABASE_URL must point at a database whose name ends in _test.",
  );
  process.exit(1);
}

const prisma = createPrismaClient(url);
const keys = keysFromEnv();
const CLAIMANT_FIRST = [
  "Asha",
  "Vikram",
  "Sunil",
  "Meena",
  "Rohit",
  "Neeta",
  "Kiran",
  "Arvind",
  "Pooja",
  "Manish",
];

const IEPF4_HEADER =
  "Investor First Name,Investor Middle Name,Investor Last Name,Father/Husband First Name,Father/Husband Middle Name,Father/Husband Last Name,Address,Country,State,District,Pin Code,Folio Number,DP Id-Client Id-Account Number,Investment Type,Amount Transferred,Number of Shares,Proposed Date of Transfer to IEPF";
type Row = [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
];

// first, middle, last, father, state, district, pin, folio, investment type, amount, shares, date
const iepf4: Row[] = [
  [
    "Ramesh",
    "Kumar",
    "Agarwal",
    "Om Prakash Agarwal",
    "Delhi",
    "New Delhi",
    "110001",
    "RIL0012345621",
    "Shares",
    "0",
    "",
    800,
    "23-Oct-2019",
  ],
  [
    "Ramesh",
    "K",
    "Agrawal",
    "Om Prakash Agrawal",
    "Delhi",
    "New Delhi",
    "110001",
    "TIT0004418873",
    "Shares",
    "0",
    "",
    2000,
    "15-Sep-2018",
  ],
  [
    "Venkatesh",
    "",
    "Rao",
    "Srinivas Rao",
    "Telangana",
    "Hyderabad",
    "500001",
    "TCS0000771234",
    "Shares",
    "0",
    "",
    400,
    "02-Nov-2017",
  ],
  [
    "Debashish",
    "",
    "Chowdhury",
    "Subhash Chaudhary",
    "West Bengal",
    "Kolkata",
    "700001",
    "SBI0034455661",
    "Shares",
    "0",
    "",
    3000,
    "18-Sep-2019",
  ],
  [
    "Kusum",
    "",
    "Agarwal",
    "Bhaskar Agarwal",
    "Delhi",
    "Dwarka",
    "110075",
    "RIL0055538649",
    "Shares",
    "0",
    "",
    800,
    "23-Oct-2019",
  ],
  [
    "Krishna",
    "",
    "Agarwal",
    "Girish Goel",
    "Delhi",
    "New Delhi",
    "110001",
    "WIP0031188279",
    "Shares",
    "0",
    "",
    1200,
    "12-Nov-2020",
  ],
  [
    "Mukesh",
    "Chand",
    "Aggarwal",
    "Prabhakar Mathur",
    "Delhi",
    "New Delhi",
    "110001",
    "BAF0007710043",
    "Shares",
    "0",
    "",
    50,
    "06-Dec-2021",
  ],
  [
    "Prakash",
    "",
    "Nair",
    "Raman Nair",
    "Kerala",
    "Ernakulam",
    "682001",
    "HUL0002299111",
    "Shares",
    "0",
    "",
    500,
    "10-Oct-2018",
  ],
  [
    "Lakshmi",
    "",
    "Iyer",
    "Raman Iyer",
    "Tamil Nadu",
    "Chennai",
    "600004",
    "MRF0000014452",
    "Shares",
    "0",
    "",
    5,
    "29-Aug-2020",
  ],
  [
    "Suresh",
    "",
    "Patel",
    "Kanti Patel",
    "Gujarat",
    "Ahmedabad",
    "380009",
    "DAB0011223344",
    "Shares",
    "0",
    "",
    600,
    "14-Oct-2019",
  ],
  [
    "Anita",
    "",
    "Shah",
    "Mahesh Shah",
    "Maharashtra",
    "Mumbai",
    "400001",
    "LTL0099887711",
    "Shares",
    "0",
    "",
    300,
    "21-Nov-2018",
  ],
  [
    "Gopal",
    "",
    "Reddy",
    "Narayan Reddy",
    "Telangana",
    "Hyderabad",
    "500016",
    "TVS0002345671",
    "Shares",
    "0",
    "",
    1000,
    "30-Sep-2019",
  ],
  [
    "Farhan",
    "",
    "Siddiqui",
    "Abdul Siddiqui",
    "",
    "",
    "",
    "BFS0000441231",
    "Shares",
    "0",
    "",
    100,
    "03-Jan-2023",
  ],
];
const iepf2: Row[] = [
  [
    "Kamla",
    "Devi",
    "Aggarwal",
    "Ramesh Kumar Agarwal",
    "Delhi",
    "Rohini",
    "110085",
    "ITC0098812200",
    "Amount for unclaimed and unpaid dividend",
    "3150.00",
    "",
    9000,
    "08-Aug-2026",
  ],
  [
    "Kamla",
    "Devi",
    "Aggarwal",
    "Ramesh Kumar Agarwal",
    "Delhi",
    "Rohini",
    "110085",
    "ITC0098812200",
    "Amount for unclaimed and unpaid dividend",
    "2475.00",
    "",
    9000,
    "08-Aug-2026",
  ],
  [
    "Sushila",
    "",
    "Srivastava",
    "Mohan Shrivastav",
    "Uttar Pradesh",
    "Lucknow",
    "226001",
    "WIP0007654321",
    "Amount for unclaimed and unpaid dividend",
    "1840.50",
    "",
    0,
    "19-Jul-2026",
  ],
];

function csv(rows: Row[], header = IEPF4_HEADER) {
  const lines = rows.map(
    ([f, m, l, father, state, district, pin, folio, type, amount, _dp, shares, date]) => {
      const [ff, ...fl] = father.split(" ");
      const country = state ? "India" : "United Arab Emirates";
      return [
        f,
        m,
        l,
        ff,
        "",
        fl.join(" "),
        `${district || "Dubai"} address`,
        country,
        state,
        district,
        pin,
        folio,
        "",
        type,
        amount,
        shares || "",
        date,
      ]
        .map((v) => `"${v}"`)
        .join(",");
    },
  );
  return Buffer.from(
    ["Statement of shares transferred to the IEPF Authority (test fixture)", header, ...lines].join(
      "\n",
    ),
  );
}

/** Live prices are never faked in the seed; tests pin known prices with a labelled source. */
const TEST_PRICES: Record<string, number> = {
  "reliance-industries-limited": 1167.4,
  "tata-consultancy-services-limited": 2478,
  "titan-company-limited": 3800,
  "itc-limited": 265,
  "wipro-limited": 190.1,
  "state-bank-of-india": 971.9,
};

async function seedFolios() {
  for (const [slug, price] of Object.entries(TEST_PRICES)) {
    await prisma.company.update({
      where: { slug },
      data: { currentMarketPrice: price, priceUpdatedAt: new Date(), priceSource: "Test fixture" },
    });
  }
  const bySlug = new Map(
    (await prisma.company.findMany({ select: { id: true, slug: true } })).map((c) => [
      c.slug,
      c.id,
    ]),
  );
  const companyFor: Record<string, string> = {
    RIL: "reliance-industries-limited",
    TIT: "titan-company-limited",
    TCS: "tata-consultancy-services-limited",
    SBI: "state-bank-of-india",
    WIP: "wipro-limited",
    BAF: "bajaj-finance-limited",
    HUL: "hindustan-unilever-limited",
    MRF: "mrf-limited",
    DAB: "dabur-india-limited",
    LTL: "larsen-and-toubro-limited",
    TVS: "tvs-motor-company-limited",
    BFS: "bajaj-finserv-limited",
    ITC: "itc-limited",
  };
  const groups = new Map<string, { four: Row[]; two: Row[] }>();
  for (const [list, kind] of [
    [iepf4, "four"],
    [iepf2, "two"],
  ] as const) {
    for (const r of list) {
      const slug = companyFor[r[7].slice(0, 3)]!;
      const g = groups.get(slug) ?? { four: [], two: [] };
      g[kind].push(r);
      groups.set(slug, g);
    }
  }
  for (const [slug, g] of groups) {
    if (g.four.length)
      await ingestStatement(
        prisma,
        keys,
        { buffer: csv(g.four), fileName: `${slug}-iepf4.csv` },
        { companyId: bySlug.get(slug)!, form: "IEPF_4" },
      );
    if (g.two.length)
      await ingestStatement(
        prisma,
        keys,
        { buffer: csv(g.two), fileName: `${slug}-iepf2.csv` },
        { companyId: bySlug.get(slug)!, form: "IEPF_2" },
      );
  }
}

const PEOPLE = {
  admin: { phone: "+919000000001", name: "Platform Admin", role: "SUPER_ADMIN" },
  analyst1: { phone: "+919000000002", name: "Priya Raman", role: "VALUATION_ANALYST" },
  analyst2: { phone: "+919000000003", name: "Arjun Mehta", role: "VALUATION_ANALYST" },
  legal: { phone: "+919000000004", name: "Kavita Iyer", role: "LEGAL_OPS_EXEC" },
  investor1: { phone: "+919000000011", name: "Sunita Sharma", role: "INVESTOR" },
  investor2: { phone: "+919000000012", name: "Venkatesh Rao", role: "INVESTOR" },
  investor3: { phone: "+919000000013", name: "Anil Bansal", role: "INVESTOR" },
} as const;

const ASSOCIATES = [
  {
    phone: "+919000000021",
    name: "Meera Joshi",
    firmName: "Joshi & Kulkarni, Chartered Accountants",
    profession: "CA",
    state: "MAHARASHTRA",
    city: "Pune",
    code: "MEERA-PUN",
    verified: true,
  },
  {
    phone: "+919000000022",
    name: "Rahul Verma",
    firmName: "Verma Corporate Advisors",
    profession: "CS",
    state: "DELHI",
    city: "New Delhi",
    code: "RAHUL-DEL",
    verified: true,
  },
  {
    phone: "+919000000023",
    name: "Lakshmi Nair",
    firmName: "Nair Law Chambers",
    profession: "ADVOCATE",
    state: "KERALA",
    city: "Kochi",
    code: "LAKSH-KOC",
    verified: true,
  },
  {
    phone: "+919000000024",
    name: "Suresh Patel",
    firmName: "Patel Wealth Partners",
    profession: "WEALTH_ADVISOR",
    state: "GUJARAT",
    city: "Ahmedabad",
    code: "SURES-AHM",
    verified: true,
  },
  {
    phone: "+919000000025",
    name: "Debasish Ghosh",
    firmName: "Independent (retired banker)",
    profession: "EX_BANKER",
    state: "WEST_BENGAL",
    city: "Kolkata",
    code: "DEBAS-KOL",
    verified: false,
  },
] as const;

async function seedPeople() {
  const users: Record<keyof typeof PEOPLE, string> = {} as never;
  for (const [key, p] of Object.entries(PEOPLE) as [
    keyof typeof PEOPLE,
    (typeof PEOPLE)[keyof typeof PEOPLE],
  ][]) {
    const u = await prisma.user.upsert({ where: { phone: p.phone }, update: {}, create: { ...p } });
    users[key] = u.id;
  }
  const associates: string[] = [];
  for (const a of ASSOCIATES) {
    const u = await prisma.user.upsert({
      where: { phone: a.phone },
      update: {},
      create: { phone: a.phone, name: a.name, role: "ASSOCIATE_PARTNER" },
    });
    const assoc = await prisma.associate.upsert({
      where: { userId: u.id },
      update: {},
      create: {
        userId: u.id,
        firmName: a.firmName,
        profession: a.profession,
        state: a.state,
        city: a.city,
        referralCode: a.code,
        isVerified: a.verified,
        bio: `${a.name} helps families in ${a.city} trace and recover old shareholdings.`,
      },
    });
    associates.push(assoc.id);
  }
  return { users, associates };
}

async function folioFor(name: string) {
  return prisma.unclaimedFolio.findFirstOrThrow({
    where: { investorFullName: name },
    include: { company: true },
  });
}

function estimatePaise(f: {
  postActionShares: number;
  unclaimedDividendAmount: unknown;
  company: { currentMarketPrice: unknown };
}) {
  return (
    holdingValuePaise(f.postActionShares, Number(f.company.currentMarketPrice ?? 0)) +
    Math.round(Number(f.unclaimedDividendAmount) * 100)
  );
}

async function seedCasesAndLeads(people: Awaited<ReturnType<typeof seedPeople>>) {
  if (await prisma.recoveryCase.count()) return;
  const { users, associates } = people;
  const day = (n: number) => new Date(Date.UTC(2026, 9, 29) - n * 86_400_000);

  const ril = await folioFor("Ramesh Kumar Agarwal");
  const tcs = await folioFor("Venkatesh Rao");
  const titan = await folioFor("Ramesh K Agrawal");
  const itc = await folioFor("Kamla Devi Aggarwal");

  // Case 1: Check (step 3), mandate not yet signed, some KYC in.
  const c1 = await prisma.recoveryCase.create({
    data: {
      caseCode: "RC-2026-1001",
      clientUserId: users.investor1,
      associateId: associates[1],
      companyId: ril.companyId,
      folioId: ril.id,
      scenarioType: "DECEASED_TRANSMISSION",
      recoverStep: 3,
      rtaEntitlementStatus: "REQUESTED",
      createdAt: day(21),
    },
  });
  // Case 2: Employ (step 6): signed, IEPF-5 filed, nodal verification under way.
  const c2 = await prisma.recoveryCase.create({
    data: {
      caseCode: "RC-2026-1002",
      clientUserId: users.investor2,
      companyId: tcs.companyId,
      folioId: tcs.id,
      scenarioType: "STANDARD_IEPF5",
      recoverStep: 6,
      agreedSuccessFeePct: 10,
      esignStatus: "SIGNED",
      esignSignedAt: day(40),
      esignMandateUrl: "seed://mandates/RC-2026-1002.pdf",
      rtaEntitlementStatus: "DONE",
      mcaIepf5Srn: "T00418273",
      nodalVerificationStatus: "IN_PROGRESS",
      createdAt: day(75),
    },
  });
  // Case 3: Verify (step 5), waiting for the client's Aadhaar eSign.
  const c3 = await prisma.recoveryCase.create({
    data: {
      caseCode: "RC-2026-1003",
      clientUserId: users.investor3,
      associateId: associates[3],
      companyId: titan.companyId,
      folioId: titan.id,
      scenarioType: "NRI_RECOVERY",
      recoverStep: 5,
      agreedSuccessFeePct: 12,
      rtaEntitlementStatus: "DONE",
      createdAt: day(30),
    },
  });
  // Case 4: Realize (step 7), credited; the fee and the associate's share are on the ledger.
  const credited = estimatePaise(itc);
  const c4 = await prisma.recoveryCase.create({
    data: {
      caseCode: "RC-2026-1004",
      clientUserId: users.investor1,
      associateId: associates[0],
      companyId: itc.companyId,
      folioId: itc.id,
      folioReleasedAt: day(150),
      scenarioType: "DUPLICATE_LOC",
      recoverStep: 7,
      agreedSuccessFeePct: 10,
      esignStatus: "SIGNED",
      esignSignedAt: day(160),
      esignMandateUrl: "seed://mandates/RC-2026-1004.pdf",
      rtaEntitlementStatus: "DONE",
      mcaIepf5Srn: "T00377120",
      nodalVerificationStatus: "DONE",
      dematCreditStatus: "DONE",
      creditedValuePaise: BigInt(credited),
      createdAt: day(190),
    },
  });

  const docs: { caseId: string; docType: string; status: string; comment?: string }[] = [
    { caseId: c1.id, docType: "PAN", status: "VERIFIED" },
    { caseId: c1.id, docType: "AADHAAR", status: "UPLOADED" },
    { caseId: c1.id, docType: "DEATH_CERTIFICATE", status: "UPLOADED" },
    {
      caseId: c1.id,
      docType: "CANCELLED_CHEQUE",
      status: "REJECTED",
      comment: "The cheque is in another person's name. Please send one for your own account.",
    },
    { caseId: c2.id, docType: "PAN", status: "VERIFIED" },
    { caseId: c2.id, docType: "AADHAAR", status: "VERIFIED" },
    { caseId: c2.id, docType: "CML_COPY", status: "VERIFIED" },
    { caseId: c2.id, docType: "CANCELLED_CHEQUE", status: "VERIFIED" },
    { caseId: c2.id, docType: "ISR1_ISR2_KYC", status: "VERIFIED" },
    { caseId: c2.id, docType: "ORIGINAL_CERT_OR_FIR", status: "VERIFIED" },
    { caseId: c2.id, docType: "INDEMNITY_BOND", status: "VERIFIED" },
    { caseId: c2.id, docType: "IEPF5_ACKNOWLEDGEMENT", status: "VERIFIED" },
    { caseId: c3.id, docType: "PAN", status: "UPLOADED" },
  ];
  for (const d of docs) {
    await prisma.caseDocument.create({
      data: {
        caseId: d.caseId,
        docType: d.docType as never,
        status: d.status as never,
        s3Url: d.status === "PENDING" ? null : `seed://documents/${d.docType.toLowerCase()}.pdf`,
        fileName: `${d.docType.toLowerCase()}.pdf`,
        mimeType: "application/pdf",
        reviewerComment: d.comment ?? null,
        reviewerId: d.status === "VERIFIED" || d.status === "REJECTED" ? users.legal : null,
        uploadedAt: day(10),
        reviewedAt: d.status === "VERIFIED" || d.status === "REJECTED" ? day(8) : null,
      },
    });
  }

  const events: [string, number, string, string][] = [
    [c1.id, 21, "created", "Case opened from a search lead."],
    [c1.id, 20, "step", "Ring up done. Holder confirmed as the claimant's late father."],
    [c1.id, 14, "step", "Evaluation done: shares after four bonuses, dividends on record."],
    [c1.id, 12, "rta", "Entitlement letter requested from the registrar."],
    [c2.id, 75, "created", "Case opened from a search lead."],
    [c2.id, 40, "esign", "Mandate signed with Aadhaar eSign."],
    [c2.id, 31, "srn", "IEPF-5 filed. SRN T00418273 recorded."],
    [c2.id, 18, "nodal", "Signed pack delivered to the company's nodal officer."],
    [c3.id, 30, "created", "Case opened from an associate referral."],
    [c3.id, 6, "offer", "Scope of work and 12% fee sent for signature."],
    [c4.id, 190, "created", "Case opened from a search lead."],
    [c4.id, 9, "credit", "Shares credited to the client's demat account."],
  ];
  for (const [caseId, ago, kind, message] of events) {
    await prisma.caseEvent.create({
      data: { caseId, kind, message, createdAt: day(ago), actorId: users.analyst1 },
    });
  }

  // Commission ledger: 30% of the fee on the credited case, part paid out.
  const fee = netRealization(credited, DEFAULT_SUCCESS_FEE_BPS).feePaise;
  const commission = associateCommission(fee);
  const payout = Math.floor(commission / 2);
  await prisma.commissionLedgerEntry.createMany({
    data: [
      {
        associateId: associates[0]!,
        caseId: c4.id,
        entryType: "ACCRUAL",
        amountPaise: BigInt(commission),
        description: "30% of the success fee on RC-2026-1004",
        occurredAt: day(8),
      },
      {
        associateId: associates[0]!,
        caseId: c4.id,
        entryType: "PAYOUT",
        amountPaise: BigInt(-payout),
        description: "Payout to registered bank account",
        occurredAt: day(2),
      },
    ],
  });
  await prisma.associate.update({
    where: { id: associates[0]! },
    data: { totalReferredCases: 1, totalPayoutInr: payout / 100 },
  });
  for (const id of [associates[1]!, associates[3]!]) {
    await prisma.associate.update({ where: { id }, data: { totalReferredCases: 1 } });
  }

  // Leads across the CRM board.
  const leadFolios = await prisma.unclaimedFolio.findMany({
    take: 14,
    where: {
      custodyStatus: "IEPF_AUTHORITY",
      investorFullName: { notIn: [ril, tcs, titan, itc].map((f) => f.investorFullName) },
    },
    orderBy: { fullNameNorm: "asc" },
    include: { company: true },
  });
  const stages = [
    "NEW_SEARCH_LEAD",
    "NEW_SEARCH_LEAD",
    "NEW_SEARCH_LEAD",
    "RING_UP_DONE",
    "RING_UP_DONE",
    "EVALUATION_IN_PROGRESS",
    "EVALUATION_IN_PROGRESS",
    "FEASIBILITY_CHECKED",
    "OFFER_SENT",
    "OFFER_SENT",
  ] as const;
  const relationships = ["SELF", "SON_DAUGHTER", "SPOUSE", "LEGAL_HEIR", "ADVISOR"] as const;
  for (let i = 0; i < stages.length; i++) {
    const f = leadFolios[i]!;
    await prisma.leadInquiry.create({
      data: {
        claimantName: `${CLAIMANT_FIRST[i % CLAIMANT_FIRST.length]} ${f.investorLastName ?? f.investorFirstName}`,
        phone: `+9190000001${String(i).padStart(2, "0")}`,
        phoneOtpVerified: true,
        email: null,
        relationshipToHolder: relationships[i % relationships.length]!,
        physicalCertStatus: (["AVAILABLE", "LOST", "PARTIAL"] as const)[i % 3]!,
        matchedFolioIds: [f.id],
        unlockedAt: day(i + 1),
        assignedAnalystId:
          stages[i] === "NEW_SEARCH_LEAD" && i === 0
            ? null
            : i % 2
              ? users.analyst1
              : users.analyst2,
        crmStage: stages[i],
        searchContext: { last: f.lastNameNorm, state: f.state },
        estimatedValuePaise: BigInt(estimatePaise(f)),
        associateId: i === 4 ? associates[2] : null,
        createdAt: day(i + 1),
      },
    });
  }
  // The four cases came from converted leads.
  for (const [c, f, name] of [
    [c1, ril, "Sunita Sharma"],
    [c2, tcs, "Venkatesh Rao"],
    [c3, titan, "Anil Bansal"],
    [c4, itc, "Sunita Sharma"],
  ] as const) {
    await prisma.leadInquiry.create({
      data: {
        claimantName: name,
        phone:
          c.clientUserId === users.investor1
            ? PEOPLE.investor1.phone
            : c.clientUserId === users.investor2
              ? PEOPLE.investor2.phone
              : PEOPLE.investor3.phone,
        phoneOtpVerified: true,
        relationshipToHolder: c === c1 ? "SON_DAUGHTER" : "SELF",
        physicalCertStatus: c === c4 ? "LOST" : "AVAILABLE",
        matchedFolioIds: [f.id],
        unlockedAt: c.createdAt,
        assignedAnalystId: users.analyst1,
        crmStage: "CONVERTED_TO_CASE",
        estimatedValuePaise: BigInt(estimatePaise(f)),
        associateId: c.associateId,
        convertedCaseId: c.id,
        createdAt: c.createdAt,
      },
    });
  }
}

async function main() {
  await seedFolios();
  const people = await seedPeople();
  await seedCasesAndLeads(people);
  console.log("Test fixtures loaded:", {
    folios: await prisma.unclaimedFolio.count(),
    users: await prisma.user.count(),
    leads: await prisma.leadInquiry.count(),
    cases: await prisma.recoveryCase.count(),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
