import type { LoaderFunctionArgs } from "react-router";
import { getEnvContext } from "~/context";

export async function loader({ context }: LoaderFunctionArgs) {
  const { cloudflare } = getEnvContext(context);
  const initialAccountBalance = Number.parseFloat(
    cloudflare.env.INITIAL_ACCOUNT_BALANCE || "10000"
  );

  return Response.json({
    success: true,
    data: {
      initialAccountBalance,
    },
  });
}
