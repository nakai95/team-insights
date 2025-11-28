import { Result, ok, err } from "@/lib/result";
import { Email } from "@/domain/value-objects/Email";
import { ImplementationActivity } from "@/domain/value-objects/ImplementationActivity";
import { ReviewActivity } from "@/domain/value-objects/ReviewActivity";
import { ActivitySnapshot } from "@/domain/value-objects/ActivitySnapshot";

export class Contributor {
  private constructor(
    public readonly id: string,
    public readonly primaryEmail: Email,
    public readonly mergedEmails: Email[],
    public readonly displayName: string,
    public readonly implementationActivity: ImplementationActivity,
    public readonly reviewActivity: ReviewActivity,
    public readonly activityTimeline: ActivitySnapshot[],
  ) {}

  static create(params: {
    id: string;
    primaryEmail: Email;
    mergedEmails: Email[];
    displayName: string;
    implementationActivity: ImplementationActivity;
    reviewActivity: ReviewActivity;
    activityTimeline: ActivitySnapshot[];
  }): Result<Contributor> {
    // Validate ID
    if (!params.id || params.id.trim().length === 0) {
      return err(new Error("Contributor ID cannot be empty"));
    }

    // Validate display name
    if (!params.displayName || params.displayName.trim().length === 0) {
      return err(new Error("Display name cannot be empty"));
    }

    // Business rule: Merged emails must not duplicate primary email
    const primaryEmailValue = params.primaryEmail.value;
    const hasDuplicate = params.mergedEmails.some(
      (email) => email.value === primaryEmailValue,
    );

    if (hasDuplicate) {
      return err(new Error("Merged emails must not duplicate primary email"));
    }

    // Business rule: All emails (primary + merged) must be unique
    const allEmailValues = [
      primaryEmailValue,
      ...params.mergedEmails.map((e) => e.value),
    ];
    const uniqueEmails = new Set(allEmailValues);

    if (uniqueEmails.size !== allEmailValues.length) {
      return err(new Error("All emails must be unique"));
    }

    // Business rule: Activity timeline must be sorted chronologically
    const timeline = params.activityTimeline;
    for (let i = 1; i < timeline.length; i++) {
      if (timeline[i]!.date < timeline[i - 1]!.date) {
        return err(
          new Error("Activity timeline must be sorted chronologically"),
        );
      }
    }

    return ok(
      new Contributor(
        params.id,
        params.primaryEmail,
        params.mergedEmails,
        params.displayName,
        params.implementationActivity,
        params.reviewActivity,
        params.activityTimeline,
      ),
    );
  }

  get allEmails(): Email[] {
    return [this.primaryEmail, ...this.mergedEmails];
  }
}
