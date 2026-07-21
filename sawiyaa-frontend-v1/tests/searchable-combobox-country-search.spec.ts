import { expect, test } from "@playwright/test";
import { filterSearchableComboboxOptions } from "../src/components/form/SearchableCombobox";

test.describe("SearchableCombobox country search contract", () => {
  const options = [
    {
      value: "EG",
      label: "Egypt (EG)",
      description: "مصر",
      searchText: "Egypt مصر EG",
    },
    {
      value: "SA",
      label: "Saudi Arabia (SA)",
      description: "السعودية",
      searchText: "Saudi Arabia السعودية SA",
    },
  ];

  test("matches Arabic, English, ISO, case-insensitive, and trimmed queries", () => {
    expect(filterSearchableComboboxOptions(options, "مصر").map((item) => item.value)).toEqual(["EG"]);
    expect(filterSearchableComboboxOptions(options, "Egypt").map((item) => item.value)).toEqual(["EG"]);
    expect(filterSearchableComboboxOptions(options, "EG").map((item) => item.value)).toEqual(["EG"]);
    expect(filterSearchableComboboxOptions(options, "  saudi arabia  ").map((item) => item.value)).toEqual(["SA"]);
    expect(filterSearchableComboboxOptions(options, "السعودية").map((item) => item.value)).toEqual(["SA"]);
  });

  test("returns all options for blank search", () => {
    expect(filterSearchableComboboxOptions(options, "   ")).toHaveLength(2);
  });
});