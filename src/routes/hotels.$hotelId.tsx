import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/hotels/$hotelId")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});
