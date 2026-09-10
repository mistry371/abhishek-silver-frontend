import Script from "next/script";
import { siteConfig } from "@/config/site";

/** Google Analytics 4 — only loads when NEXT_PUBLIC_GA_MEASUREMENT_ID is configured. */
export function Analytics() {
  const id = siteConfig.analytics.gaMeasurementId;
  if (!id) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id.replace(/[^A-Z0-9-]/gi, "")}',{anonymize_ip:true});`}
      </Script>
    </>
  );
}
