// Wildcard route - handle all unmatched paths
export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);

  // For developer tools and other special paths, return 404 instead of error
  if (
    url.pathname.startsWith("/.well-known/") ||
    url.pathname.startsWith("/favicon.ico") ||
    url.pathname.startsWith("/__vite") ||
    url.pathname.includes("devtools")
  ) {
    return new Response(null, { status: 404 });
  }

  // For other paths, can return friendly 404 page
  throw new Response("Page not found", { status: 404 });
}

// Default export a simple 404 component (although it usually won't be rendered, because we threw Response in loader)
export default function CatchAll() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-gray-600 mb-4">Page not found</p>
        <a href="/" className="text-blue-600 hover:text-blue-800 underline">
          Back to home
        </a>
      </div>
    </div>
  );
}
