import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { LEGAL_DATES } from "@/config/legal";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });

  return {
    title: `${t("title")} - Team Insights`,
    description: t("sections.overview.content"),
  };
}

/**
 * Privacy Policy Page
 *
 * Displays the privacy policy for Team Insights.
 * Explains data collection, usage, and user rights.
 *
 * Features:
 * - Comprehensive privacy information
 * - Structured sections with headings
 * - Easy to scan and read
 * - Bilingual support (EN/JA)
 * - SEO-friendly metadata
 * - Last updated date managed in src/config/legal.ts
 */
export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("lastUpdated", { date: LEGAL_DATES.PRIVACY_POLICY })}
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          {/* Overview */}
          <section>
            <h2 className="text-2xl font-bold mb-4">
              {t("sections.overview.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t("sections.overview.content")}
            </p>
          </section>

          {/* Information Collection */}
          <section>
            <h2 className="text-2xl font-bold mb-4">
              {t("sections.informationCollection.title")}
            </h2>
            <p className="text-muted-foreground mb-4">
              {t("sections.informationCollection.intro")}
            </p>

            <div className="space-y-4 pl-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  {t("sections.informationCollection.items.github.title")}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {t("sections.informationCollection.items.github.content")}
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">
                  {t("sections.informationCollection.items.repository.title")}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {t("sections.informationCollection.items.repository.content")}
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">
                  {t("sections.informationCollection.items.oauth.title")}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {t("sections.informationCollection.items.oauth.content")}
                </p>
              </div>
            </div>
          </section>

          {/* Data Usage */}
          <section>
            <h2 className="text-2xl font-bold mb-4">
              {t("sections.dataUsage.title")}
            </h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              {[0, 1, 2, 3].map((index) => (
                <li key={index} className="leading-relaxed">
                  {t(`sections.dataUsage.items.${index}`)}
                </li>
              ))}
            </ul>
          </section>

          {/* Cookies and Tracking */}
          <section>
            <h2 className="text-2xl font-bold mb-4">
              {t("sections.cookies.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t("sections.cookies.content")}
            </p>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl font-bold mb-4">
              {t("sections.dataSecurity.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t("sections.dataSecurity.content")}
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-bold mb-4">
              {t("sections.dataRetention.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t("sections.dataRetention.content")}
            </p>
          </section>

          {/* Third-Party Services */}
          <section>
            <h2 className="text-2xl font-bold mb-4">
              {t("sections.thirdPartyServices.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t("sections.thirdPartyServices.content")}
            </p>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-bold mb-4">
              {t("sections.yourRights.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t("sections.yourRights.content")}
            </p>
          </section>

          {/* Changes to Privacy Policy */}
          <section>
            <h2 className="text-2xl font-bold mb-4">
              {t("sections.changes.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t("sections.changes.content")}
            </p>
          </section>

          {/* Contact */}
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
