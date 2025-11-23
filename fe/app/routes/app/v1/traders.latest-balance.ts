import type { LoaderFunctionArgs } from "react-router";
import { getEnvContext } from "~/context";
import {
  getLatestBalance,
  type LatestBalanceApiDeps,
} from "~/features/traders/api/latest-balance";

function getDeps(context: LoaderFunctionArgs["context"]): LatestBalanceApiDeps {
  const { db, cloudflare } = getEnvContext(context);
  return {
    db,
    env: cloudflare.env,
  };
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  // const authResult = await authenticate(request, context);
  // if (!authResult.success) {
  //   return Response.json(
  //     {
  //       success: false,
  //       error: authResult.error?.message ?? "Unauthorized",
  //       code: authResult.error?.code ?? "UNAUTHORIZED",
  //     },
  //     { status: 401 }
  //   );
  // }

  // setUserContext(context, authResult.user);

  const deps = getDeps(context);
  const result = await getLatestBalance(deps);

  return Response.json({
    success: true,
    data: result,
  });
}
