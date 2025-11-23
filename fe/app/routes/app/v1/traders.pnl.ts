import type { LoaderFunctionArgs } from "react-router";
import { getEnvContext } from "~/context";
import {
  listTraderPnl,
  parseListTraderPnlQuery,
  type TraderPnlApiDeps,
} from "~/features/traders/api/pnl";

function getDeps(context: LoaderFunctionArgs["context"]): TraderPnlApiDeps {
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
  const url = new URL(request.url);
  const parsedQuery = parseListTraderPnlQuery(url.searchParams);

  if (!parsedQuery.success) {
    return Response.json(
      {
        success: false,
        error: "Invalid query parameters",
        code: "VALIDATION_ERROR",
        details: parsedQuery.error,
      },
      { status: 400 }
    );
  }

  const result = await listTraderPnl(deps, parsedQuery.data);

  return Response.json({
    success: true,
    data: result,
  });
}
