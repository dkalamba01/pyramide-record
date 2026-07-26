// This app serves a static site from /public.
// The homepage is /public/index.html — this component just redirects to it
// so that visiting the root URL loads the static site.
export default function Home() {
  return null;
}

export async function getServerSideProps({ res }) {
  res.writeHead(302, { Location: '/index.html' });
  res.end();
  return { props: {} };
}
