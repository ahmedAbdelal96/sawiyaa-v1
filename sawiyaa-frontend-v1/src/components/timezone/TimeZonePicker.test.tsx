import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TimeZonePicker from "./TimeZonePicker";

vi.mock("next-intl", () => ({ useLocale: () => "en" }));

describe("TimeZonePicker", () => {
  it("opens a searchable list and emits the selected IANA value", () => {
    const onChange = vi.fn();
    render(
      <TimeZonePicker
        id="timezone"
        value=""
        onChange={onChange}
        placeholder="Choose timezone"
      />,
    );

    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "riyadh" },
    });
    fireEvent.click(screen.getByRole("option", { name: /Riyadh/ }));

    expect(onChange).toHaveBeenCalledWith("Asia/Riyadh");
  });

  it("supports keyboard selection", () => {
    const onChange = vi.fn();
    render(
      <TimeZonePicker id="timezone-keyboard" value="" onChange={onChange} />,
    );

    fireEvent.click(screen.getByRole("combobox"));
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "cairo" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith("Africa/Cairo");
  });
});
