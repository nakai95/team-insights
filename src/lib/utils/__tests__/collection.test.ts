import { describe, expect, it } from "vitest";
import { groupBy } from "../collection";

describe("groupBy", () => {
  it("should group items by a numeric key", () => {
    const users = [
      { name: "Alice", age: 25 },
      { name: "Bob", age: 25 },
      { name: "Charlie", age: 30 },
    ];

    const result = groupBy(users, (user) => user.age);

    expect(result.size).toBe(2);
    expect(result.get(25)).toEqual([
      { name: "Alice", age: 25 },
      { name: "Bob", age: 25 },
    ]);
    expect(result.get(30)).toEqual([{ name: "Charlie", age: 30 }]);
  });

  it("should group items by a string key", () => {
    const commits = [
      { email: "alice@example.com", message: "fix" },
      { email: "bob@example.com", message: "feat" },
      { email: "alice@example.com", message: "docs" },
    ];

    const result = groupBy(commits, (commit) => commit.email.toLowerCase());

    expect(result.size).toBe(2);
    expect(result.get("alice@example.com")).toEqual([
      { email: "alice@example.com", message: "fix" },
      { email: "alice@example.com", message: "docs" },
    ]);
    expect(result.get("bob@example.com")).toEqual([
      { email: "bob@example.com", message: "feat" },
    ]);
  });

  it("should handle empty arrays", () => {
    const result = groupBy([], (item: { id: number }) => item.id);

    expect(result.size).toBe(0);
  });

  it("should handle single item", () => {
    const items = [{ id: 1, name: "Alice" }];

    const result = groupBy(items, (item) => item.id);

    expect(result.size).toBe(1);
    expect(result.get(1)).toEqual([{ id: 1, name: "Alice" }]);
  });

  it("should handle all items with same key", () => {
    const items = [
      { category: "food", item: "apple" },
      { category: "food", item: "banana" },
      { category: "food", item: "cherry" },
    ];

    const result = groupBy(items, (item) => item.category);

    expect(result.size).toBe(1);
    expect(result.get("food")).toEqual([
      { category: "food", item: "apple" },
      { category: "food", item: "banana" },
      { category: "food", item: "cherry" },
    ]);
  });

  it("should handle all items with unique keys", () => {
    const items = [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
      { id: 3, name: "Charlie" },
    ];

    const result = groupBy(items, (item) => item.id);

    expect(result.size).toBe(3);
    expect(result.get(1)).toEqual([{ id: 1, name: "Alice" }]);
    expect(result.get(2)).toEqual([{ id: 2, name: "Bob" }]);
    expect(result.get(3)).toEqual([{ id: 3, name: "Charlie" }]);
  });

  it("should support case-insensitive grouping", () => {
    const items = [
      { email: "Alice@example.com", count: 1 },
      { email: "alice@example.com", count: 2 },
      { email: "BOB@example.com", count: 3 },
    ];

    const result = groupBy(items, (item) => item.email.toLowerCase());

    expect(result.size).toBe(2);
    expect(result.get("alice@example.com")).toHaveLength(2);
    expect(result.get("bob@example.com")).toHaveLength(1);
  });

  it("should maintain insertion order within groups", () => {
    const items = [
      { group: "A", value: 1 },
      { group: "B", value: 2 },
      { group: "A", value: 3 },
      { group: "B", value: 4 },
      { group: "A", value: 5 },
    ];

    const result = groupBy(items, (item) => item.group);

    expect(result.get("A")).toEqual([
      { group: "A", value: 1 },
      { group: "A", value: 3 },
      { group: "A", value: 5 },
    ]);
    expect(result.get("B")).toEqual([
      { group: "B", value: 2 },
      { group: "B", value: 4 },
    ]);
  });
});
