/**
 * Unit tests for CalculateDeploymentFrequency use case
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { CalculateDeploymentFrequency } from "../CalculateDeploymentFrequency";
import {
  IGitHubRepository,
  Release,
  Deployment,
  Tag,
} from "@/domain/interfaces/IGitHubRepository";
import { ok, err } from "@/lib/result";

// Mock IGitHubRepository
class MockGitHubRepository implements IGitHubRepository {
  getReleases = vi.fn();
  getDeployments = vi.fn();
  getTags = vi.fn();

  // Required stubs for IGitHubRepository interface
  validateAccess = vi.fn();
  getLog = vi.fn();
  getPullRequests = vi.fn();
  getReviewComments = vi.fn();
  getRateLimitStatus = vi.fn();
}

// Helper functions to create test data
function createRelease(
  tagName: string,
  publishedAt: string,
  isDraft = false,
): Release {
  return {
    name: tagName,
    tagName,
    createdAt: publishedAt,
    publishedAt,
    isPrerelease: false,
    isDraft,
  };
}

function createDeployment(
  id: string,
  ref: string,
  createdAt: string,
): Deployment {
  return {
    id,
    createdAt,
    environment: "production",
    state: "success",
    ref,
    latestStatus: {
      state: "success",
      createdAt,
    },
  };
}

function createTag(name: string, date: string): Tag {
  return {
    name,
    target: {
      committedDate: date,
    },
  };
}

describe("CalculateDeploymentFrequency", () => {
  let mockRepo: MockGitHubRepository;
  let useCase: CalculateDeploymentFrequency;

  beforeEach(() => {
    mockRepo = new MockGitHubRepository();
    useCase = new CalculateDeploymentFrequency(mockRepo as IGitHubRepository);
  });

  it("should fetch and aggregate deployment data from all sources", async () => {
    // Arrange
    const releases = [
      createRelease("v1.0.0", "2024-01-15T10:00:00Z"),
      createRelease("v1.0.1", "2024-01-20T10:00:00Z"),
    ];
    const deployments = [
      createDeployment("dep-1", "v1.0.2", "2024-01-25T10:00:00Z"),
    ];
    const tags = [createTag("v1.0.3", "2024-01-30T10:00:00Z")];

    mockRepo.getReleases.mockResolvedValue(ok(releases));
    mockRepo.getDeployments.mockResolvedValue(ok(deployments));
    mockRepo.getTags.mockResolvedValue(ok(tags));

    // Act
    const result = await useCase.execute("owner", "repo");

    // Assert
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.totalDeployments).toBe(4);
      expect(mockRepo.getReleases).toHaveBeenCalledWith(
        "owner",
        "repo",
        undefined,
      );
      expect(mockRepo.getDeployments).toHaveBeenCalledWith(
        "owner",
        "repo",
        undefined,
      );
      expect(mockRepo.getTags).toHaveBeenCalledWith("owner", "repo", undefined);
    }
  });

  it("should deduplicate events by normalized tag name", async () => {
    // Arrange - same version across different sources
    const releases = [createRelease("v1.0.0", "2024-01-15T10:00:00Z")];
    const deployments = [
      createDeployment("dep-1", "v1.0.0", "2024-01-15T10:00:00Z"),
    ];
    const tags = [createTag("v1.0.0", "2024-01-15T10:00:00Z")];

    mockRepo.getReleases.mockResolvedValue(ok(releases));
    mockRepo.getDeployments.mockResolvedValue(ok(deployments));
    mockRepo.getTags.mockResolvedValue(ok(tags));

    // Act
    const result = await useCase.execute("owner", "repo");

    // Assert
    expect(result.ok).toBe(true);
    if (result.ok) {
      // Should only count once due to deduplication
      expect(result.value.totalDeployments).toBe(1);
    }
  });

  it("should prioritize releases over deployments and tags in deduplication", async () => {
    // Arrange - same version across different sources with different timestamps
    const releases = [createRelease("v1.0.0", "2024-01-15T10:00:00Z")];
    const deployments = [
      createDeployment("dep-1", "v1.0.0", "2024-01-16T10:00:00Z"),
    ];
    const tags = [createTag("v1.0.0", "2024-01-17T10:00:00Z")];

    mockRepo.getReleases.mockResolvedValue(ok(releases));
    mockRepo.getDeployments.mockResolvedValue(ok(deployments));
    mockRepo.getTags.mockResolvedValue(ok(tags));

    // Act
    const result = await useCase.execute("owner", "repo");

    // Assert
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.totalDeployments).toBe(1);
      expect(result.value.recentDeployments[0]!.source).toBe("release");
    }
  });

  it("should filter out draft releases", async () => {
    // Arrange
    const releases = [
      createRelease("v1.0.0", "2024-01-15T10:00:00Z", false), // Not draft
      createRelease("v1.0.1", "2024-01-20T10:00:00Z", true), // Draft
    ];

    mockRepo.getReleases.mockResolvedValue(ok(releases));
    mockRepo.getDeployments.mockResolvedValue(ok([]));
    mockRepo.getTags.mockResolvedValue(ok([]));

    // Act
    const result = await useCase.execute("owner", "repo");

    // Assert
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.totalDeployments).toBe(1); // Only non-draft
    }
  });

  it("should continue with partial data if some sources fail", async () => {
    // Arrange
    const releases = [createRelease("v1.0.0", "2024-01-15T10:00:00Z")];

    mockRepo.getReleases.mockResolvedValue(ok(releases));
    mockRepo.getDeployments.mockResolvedValue(
      err(new Error("Deployments API failed")),
    );
    mockRepo.getTags.mockResolvedValue(err(new Error("Tags API failed")));

    // Act
    const result = await useCase.execute("owner", "repo");

    // Assert
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.totalDeployments).toBe(1); // Only releases
    }
  });

  it("should calculate DORA level based on deployment frequency", async () => {
    // Arrange - High frequency deployments (Elite level: 730+/year)
    const releases: Release[] = [];
    const startDate = new Date("2024-01-01T00:00:00Z");

    // Create 800 releases over ~365 days (Elite level)
    for (let i = 0; i < 800; i++) {
      const date = new Date(startDate);
      date.setHours(date.getHours() + i * 11); // Every ~11 hours
      releases.push(createRelease(`v${i + 1}.0.0`, date.toISOString()));
    }

    mockRepo.getReleases.mockResolvedValue(ok(releases));
    mockRepo.getDeployments.mockResolvedValue(ok([]));
    mockRepo.getTags.mockResolvedValue(ok([]));

    // Act
    const result = await useCase.execute("owner", "repo");

    // Assert
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.doraLevel.level).toBe("elite");
      expect(result.value.deploymentsPerYear).toBeGreaterThanOrEqual(730);
    }
  });

  it("should return insufficient_data level for zero deployments", async () => {
    // Arrange
    mockRepo.getReleases.mockResolvedValue(ok([]));
    mockRepo.getDeployments.mockResolvedValue(ok([]));
    mockRepo.getTags.mockResolvedValue(ok([]));

    // Act
    const result = await useCase.execute("owner", "repo");

    // Assert
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.totalDeployments).toBe(0);
      expect(result.value.doraLevel.level).toBe("insufficient_data");
    }
  });

  it("should calculate weekly and monthly aggregations", async () => {
    // Arrange - Releases spanning multiple weeks and months
    const releases = [
      createRelease("v1.0.0", "2024-01-15T10:00:00Z"),
      createRelease("v1.0.1", "2024-01-22T10:00:00Z"),
      createRelease("v1.0.2", "2024-02-10T10:00:00Z"),
    ];

    mockRepo.getReleases.mockResolvedValue(ok(releases));
    mockRepo.getDeployments.mockResolvedValue(ok([]));
    mockRepo.getTags.mockResolvedValue(ok([]));

    // Act
    const result = await useCase.execute("owner", "repo");

    // Assert
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.weeklyData.length).toBeGreaterThan(0);
      expect(result.value.monthlyData.length).toBeGreaterThan(0);
      expect(result.value.monthlyData).toHaveLength(2); // January and February
    }
  });

  it("should include recent deployments in result", async () => {
    // Arrange
    const releases = [
      createRelease("v1.0.0", "2024-01-15T10:00:00Z"),
      createRelease("v1.0.1", "2024-01-20T10:00:00Z"),
    ];

    mockRepo.getReleases.mockResolvedValue(ok(releases));
    mockRepo.getDeployments.mockResolvedValue(ok([]));
    mockRepo.getTags.mockResolvedValue(ok([]));

    // Act
    const result = await useCase.execute("owner", "repo");

    // Assert
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.recentDeployments).toHaveLength(2);
      expect(result.value.recentDeployments[0]!.displayName).toBe("v1.0.1"); // Newest first
    }
  });

  it("should respect sinceDate parameter", async () => {
    // Arrange
    const sinceDate = new Date("2024-01-20T00:00:00Z");

    mockRepo.getReleases.mockResolvedValue(ok([]));
    mockRepo.getDeployments.mockResolvedValue(ok([]));
    mockRepo.getTags.mockResolvedValue(ok([]));

    // Act
    await useCase.execute("owner", "repo", sinceDate);

    // Assert
    expect(mockRepo.getReleases).toHaveBeenCalledWith(
      "owner",
      "repo",
      sinceDate,
    );
    expect(mockRepo.getDeployments).toHaveBeenCalledWith(
      "owner",
      "repo",
      sinceDate,
    );
    expect(mockRepo.getTags).toHaveBeenCalledWith("owner", "repo", sinceDate);
  });

  it("should handle errors gracefully", async () => {
    // Arrange
    mockRepo.getReleases.mockRejectedValue(new Error("Network error"));
    mockRepo.getDeployments.mockResolvedValue(ok([]));
    mockRepo.getTags.mockResolvedValue(ok([]));

    // Act
    const result = await useCase.execute("owner", "repo");

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain(
        "Failed to calculate deployment frequency",
      );
    }
  });
});
