import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders the food donation dashboard title", () => {
  render(<App />);
  expect(screen.getByText(/food donation dashboard/i)).toBeInTheDocument();
});
