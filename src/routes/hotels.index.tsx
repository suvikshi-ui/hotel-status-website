import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/hotels/")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});
