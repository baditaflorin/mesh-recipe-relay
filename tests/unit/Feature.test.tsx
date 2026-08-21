import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMockRoom } from "@baditaflorin/mesh-common/testing";
import { Feature, isValidStep } from "../../src/Feature";
import { config } from "../../src/config";
describe("recipe relay", () => {
  it("validates a useful step", () => {
    expect(isValidStep({ text: "Toast cumin", submittedAt: 1 })).toBe(true);
    expect(isValidStep({ text: "x", submittedAt: 1 })).toBe(false);
  });
  it("renders text controls", () => {
    render(<Feature room={createMockRoom()} config={config} />);
    expect(
      screen.getByRole("heading", { name: "Pass the spoon. Build dinner together." }),
    ).toBeInTheDocument();
  });
});
