import { Controller, Get, NotFoundException, Param, Query } from "@nestjs/common";
import { RTA_LABELS } from "@recoveryos/shared";
import { z } from "zod";

import { Public } from "../../common/auth/decorators.js";
import { PrismaService } from "../../common/prisma.service.js";
import { isoDate, isoTime, num, numOrNull } from "../../common/serialize.js";

const listSchema = z.object({ q: z.string().trim().max(80).optional() });

@Controller("companies")
export class CompaniesController {
  constructor(private readonly prisma: PrismaService) {}

  /** Every company, for the SEO index, sitemaps and the calculator picker. */
  @Public()
  @Get()
  async list(@Query({ schema: listSchema }) query: z.infer<typeof listSchema>) {
    const companies = await this.prisma.client.company.findMany({
      where: query.q ? { name: { contains: query.q, mode: "insensitive" } } : undefined,
      orderBy: { name: "asc" },
      include: { _count: { select: { folios: true } } },
    });
    return companies.map((c) => ({
      slug: c.slug,
      name: c.name,
      sector: c.sector,
      tickerNse: c.tickerNse,
      rtaName: c.rtaName,
      rtaLabel: c.rtaDisplayName ?? RTA_LABELS[c.rtaName],
      currentMarketPrice: numOrNull(c.currentMarketPrice),
      priceUpdatedAt: isoTime(c.priceUpdatedAt),
      folioCount: c._count.folios,
      updatedAt: isoTime(c.updatedAt),
    }));
  }

  /** One company with its registrar, nodal officer, corporate actions and what our records hold. */
  @Public()
  @Get(":slug")
  async get(@Param("slug", { schema: z.string().regex(/^[a-z0-9-]{2,120}$/) }) slug: string) {
    const db = this.prisma.client;
    const c = await db.company.findUnique({
      where: { slug },
      include: { corporateActions: { orderBy: { exDate: "asc" } } },
    });
    if (!c) throw new NotFoundException("No company with that name in our records.");
    const custody = await db.unclaimedFolio.groupBy({
      by: ["custodyStatus"],
      where: { companyId: c.id },
      _count: { _all: true },
      _sum: { postActionShares: true, unclaimedDividendAmount: true },
    });
    return {
      slug: c.slug,
      name: c.name,
      cin: c.cin,
      statutoryBasis: c.statutoryBasis,
      isin: c.isin,
      sector: c.sector,
      tickerNse: c.tickerNse,
      tickerBse: c.tickerBse,
      currentMarketPrice: numOrNull(c.currentMarketPrice),
      priceUpdatedAt: isoTime(c.priceUpdatedAt),
      priceSource: c.priceSource,
      rta: {
        name: c.rtaName,
        label: c.rtaDisplayName ?? RTA_LABELS[c.rtaName],
        address: c.rtaAddress,
        email: c.rtaEmail,
        phone: c.rtaPhone,
        website: c.rtaWebsite,
      },
      nodalOfficer: {
        name: c.nodalOfficerName,
        emails: c.nodalOfficerEmail
          ? c.nodalOfficerEmail
              .split("/")
              .map((e) => e.trim())
              .filter(Boolean)
          : [],
        phone: c.nodalOfficerPhone,
        address: c.nodalOfficeAddress,
        deputies: (c.deputyNodalOfficers as { name: string; email: string | null }[] | null) ?? [],
      },
      contacts: { source: c.contactsSource, verifiedAt: isoTime(c.contactsVerifiedAt) },
      irPageUrl: c.irPageUrl,
      corporateActions: c.corporateActions.map((a) => ({
        actionType: a.actionType,
        exDate: isoDate(a.exDate)!,
        ratioFrom: numOrNull(a.ratioFrom),
        ratioTo: numOrNull(a.ratioTo),
        dividendPerShare: numOrNull(a.dividendPerShare),
        notes: a.notes,
        source: a.source,
      })),
      records: custody.map((g) => ({
        custodyStatus: g.custodyStatus,
        folios: g._count._all,
        shares: g._sum.postActionShares ?? 0,
        dividendRupees: num(g._sum.unclaimedDividendAmount),
      })),
    };
  }
}
