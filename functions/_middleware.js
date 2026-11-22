// Send www.damianflynn.com to the apex with a permanent redirect; every other host passes through.
export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (url.hostname === 'www.damianflynn.com') {
    url.hostname = 'damianflynn.com';
    return Response.redirect(url.toString(), 301);
  }
  return next();
}
