import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/book/$hotelId")({
  beforeLoad: () => {
    throw redirect({ to: "/contact" });
  },
});
