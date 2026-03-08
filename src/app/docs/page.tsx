import Script from 'next/script';

export default function ApiDocsPage() {
  return (
    <main style={{ padding: 16 }}>
      <Script
        src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"
        strategy="afterInteractive"
      />
      <Script id="redoc-init" strategy="afterInteractive">
        {`window.addEventListener('load', function () {
          if (window.Redoc) {
            window.Redoc.init('/api/openapi', {}, document.getElementById('redoc-container'));
          }
        });`}
      </Script>
      <div id="redoc-container" />
    </main>
  );
}
