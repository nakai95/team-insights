import { Result, ok, err } from "@/lib/result";

export class RepositoryUrl {
  private constructor(
    public readonly value: string,
    public readonly owner: string,
    public readonly repo: string,
  ) {}

  static create(url: string): Result<RepositoryUrl> {
    // Trim whitespace
    const trimmed = url.trim();

    // Check maximum length
    if (trimmed.length > 500) {
      return err(
        new Error("Repository URL exceeds maximum length of 500 characters"),
      );
    }

    // Validate GitHub HTTPS format
    const githubUrlRegex = /^https:\/\/github\.com\/([\w-]+)\/([\w-]+)$/;
    const match = trimmed.match(githubUrlRegex);

    if (!match) {
      return err(
        new Error(
          "Invalid GitHub repository URL format. Expected: https://github.com/{owner}/{repo}",
        ),
      );
    }

    const owner = match[1];
    const repo = match[2];

    if (!owner || !repo) {
      return err(
        new Error(
          "Repository URL must contain valid owner and repository names",
        ),
      );
    }

    return ok(new RepositoryUrl(trimmed, owner, repo));
  }

  get apiBase(): string {
    return `https://api.github.com/repos/${this.owner}/${this.repo}`;
  }

  equals(other: RepositoryUrl): boolean {
    return this.value === other.value;
  }
}
