import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { LEGAL_DATES } from "@/config/legal";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "terms" });

  return {
    title: `${t("title")} - Team Insights`,
    description: t("sections.description.content"),
  };
}

/**
 * Terms of Service Page
 *
 * Displays the terms of service for Team Insights.
 * Outlines user responsibilities, disclaimers, and legal terms.
 *
 * Features:
 * - Comprehensive legal terms
 * - Numbered sections for easy reference
 * - Clear disclaimers and limitations
 * - Bilingual support (EN/JA)
 * - SEO-friendly metadata
 * - Last updated date managed in src/config/legal.ts
 */
export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "terms" });

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("lastUpdated", { date: LEGAL_DATES.TERMS_OF_SERVICE })}
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          {/* 1. Acceptance of Terms */}
          <section>
            <h2 className="text-2xl font-bold mb-4">
              {t("sections.acceptance.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t("sections.acceptance.content")}
            </p>
          </section>

          {/* 2. Service Description */}
          <section>
            <h2 className="text-2xl font-bold mb-4">
              {t("sections.description.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t("sections.description.content")}
            </p>
          </section>

          {/* 3. Account Requirements */}
          <section>
            <h2 className="text-2xl font-bold mb-4">
              {t("sections.accountRequirements.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t("sections.accountRequirements.content")}
            </p>
          </section>

          {/* 4. Acceptable Use */}
          <section>
            <h2 className="text-2xl font-bold mb-4">
              {t("sections.acceptableUse.title")}
            </h2>
            <p className="text-muted-foreground mb-4">
              {t("sections.acceptableUse.intro")}
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              {[0, 1, 2, 3, 4, 5, 6].map((index) => (
                <li key={index} className="leading-relaxed">
                  {t(`sections.acceptableUse.items.${index}`)}
                </li>
              ))}
            </ul>
          </section>

          {/* 5. Intellectual Property */}
          <section>
            <h2 className="text-2xl font-bold mb-4">
              {t("sections.intellectualProperty.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t("sections.intellectualProperty.content")}
            </p>
          </section>

          {/* 6. Disclaimers */}
          <section>
            <h2 className="text-2xl font-bold mb-4">
              {t("sections.disclaimers.title")}
            </h2>
            <p className="text-muted-foreground mb-4 font-semibold uppercase">
              {t("sections.disclaimers.intro")}
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4">
              {[0, 1, 2, 3, 4].map((index) => (
                <li key={index} className="leading-relaxed">
                  {t(`sections.disclaimers.items.${index}`)}
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground italic">
              {t("sections.disclaimers.note")}
            </p>
          </section>

          {/* 7. Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-bold mb-4">
              {t("sections.limitations.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed font-semibold uppercase">
              {t("sections.limitations.content")}
            </p>
          </section>

          {/* 8. Service Interruptions */}
          <section>
            <h2 className="text-2xl font-bold mb-4">
              {t("sections.serviceInterruptions.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t("sections.serviceInterruptions.content")}
            </p>
          </section>

          {/* 9. Data and Privacy */}
          <section>
            <h2 className="text-2xl font-bold mb-4">
              {t("sections.dataAndPrivacy.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t("sections.dataAndPrivacy.content")}
            </p>
          </section>

          {/* 10. Termination */}
          <section>
            <h2 className="text-2xl font-bold mb-4">
              {t("sections.termination.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t("sections.termination.content")}
            </p>
          </section>

          {/* 11. Governing Law */}
          <section>
            <h2 className="text-2xl font-bold mb-4">
              {t("sections.governingLaw.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t("sections.governingLaw.content")}
            </p>
          </section>

          {/* 12. Changes to Terms */}
          <section>
            <h2 className="text-2xl font-bold mb-4">
              {t("sections.changes.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t("sections.changes.content")}
            </p>
          </section>

          {/* 13. Contact */}
          <section>
            <h2 className="text-2xl font-bold mb-4">
              {t("sections.contact.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t("sections.contact.content")}{" "}
              <a
                href="https://github.com/nakai95/team-insights/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                GitHub Issues
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
