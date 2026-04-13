import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import App from "@/App";

describe("AGP web shell", () => {
  it("renders dashboard route", async () => {
    window.history.pushState({}, "", "/dashboard");
    render(<App />);
    expect(await screen.findByRole("heading", { name: /dashboard/i })).toBeInTheDocument();
  });
});
