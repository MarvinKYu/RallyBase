import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy | RallyBase",
};

function CookieTable({
  cookies,
}: {
  cookies: {
    name: string;
    purpose?: string;
    provider: string;
    service?: string;
    serviceUrl?: string;
    type: string;
    expires: string;
  }[];
}) {
  return (
    <div className="mt-3 space-y-3">
      {cookies.map((c) => (
        <div key={c.name} className="rounded border border-border p-3 text-xs">
          <table className="w-full">
            <tbody className="space-y-1">
              <tr><th className="w-28 pr-3 text-right align-top font-medium text-text-1">Name:</th><td className="text-text-2">{c.name}</td></tr>
              {c.purpose && <tr><th className="pr-3 text-right align-top font-medium text-text-1">Purpose:</th><td className="text-text-2">{c.purpose}</td></tr>}
              <tr><th className="pr-3 text-right align-top font-medium text-text-1">Provider:</th><td className="text-text-2">{c.provider}</td></tr>
              {c.service && (
                <tr>
                  <th className="pr-3 text-right align-top font-medium text-text-1">Service:</th>
                  <td className="text-text-2">
                    {c.serviceUrl ? (
                      <><span>{c.service} </span><a href={c.serviceUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">View Service Privacy Policy</a></>
                    ) : c.service}
                  </td>
                </tr>
              )}
              <tr><th className="pr-3 text-right align-top font-medium text-text-1">Type:</th><td className="text-text-2">{c.type}</td></tr>
              <tr><th className="pr-3 text-right align-top font-medium text-text-1">Expires in:</th><td className="text-text-2">{c.expires}</td></tr>
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export default function CookiesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <article className="space-y-10 text-sm leading-relaxed text-text-2">

        <header>
          <h1 className="text-2xl font-bold text-text-1">COOKIE POLICY</h1>
          <p className="mt-1">Last updated April 07, 2026</p>
        </header>

        <section>
          <p>
            This Cookie Policy explains how <strong>RallyBase</strong> (&ldquo;Company,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; and &ldquo;our&rdquo;) uses cookies and similar technologies to recognize you when you visit our website at{" "}
            <a href="https://rally-base.vercel.app" className="text-accent hover:underline">https://rally-base.vercel.app</a>{" "}
            (&ldquo;Website&rdquo;). It explains what these technologies are and why we use them, as well as your rights to control our use of them.
          </p>
          <p className="mt-3">In some cases we may use cookies to collect personal information, or that becomes personal information if we combine it with other information.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-1">What are cookies?</h2>
          <p className="mt-3">Cookies are small data files that are placed on your computer or mobile device when you visit a website. Cookies are widely used by website owners in order to make their websites work, or to work more efficiently, as well as to provide reporting information.</p>
          <p className="mt-3">Cookies set by the website owner (in this case, RallyBase) are called &ldquo;first-party cookies.&rdquo; Cookies set by parties other than the website owner are called &ldquo;third-party cookies.&rdquo; Third-party cookies enable third-party features or functionality to be provided on or through the website (e.g., interactive content and analytics). The parties that set these third-party cookies can recognize your computer both when it visits the website in question and also when it visits certain other websites.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-1">Why do we use cookies?</h2>
          <p className="mt-3">We use first- and third-party cookies for several reasons. Some cookies are required for technical reasons in order for our Website to operate, and we refer to these as &ldquo;essential&rdquo; or &ldquo;strictly necessary&rdquo; cookies. Other cookies also enable us to track and target the interests of our users to enhance the experience on our Online Properties. Third parties serve cookies through our Website for analytics and other purposes. This is described in more detail below.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-1">How can I control cookies?</h2>
          <p className="mt-3">You have the right to decide whether to accept or reject cookies. You can exercise your cookie rights by setting your preferences in the Cookie Preference Center. The Cookie Preference Center allows you to select which categories of cookies you accept or reject. Essential cookies cannot be rejected as they are strictly necessary to provide you with services.</p>
          <p className="mt-3">The Cookie Preference Center can be found in the notification banner and on our Website. If you choose to reject cookies, you may still use our Website though your access to some functionality and areas of our Website may be restricted. You may also set or amend your web browser controls to accept or refuse cookies.</p>
          <p className="mt-3">The specific types of first- and third-party cookies served through our Website and the purposes they perform are described below.</p>
        </section>

        <section>
          <h3 className="font-semibold text-text-1">Essential website cookies</h3>
          <p className="mt-2 text-xs">These cookies are strictly necessary to provide you with services available through our Website and to use some of its features, such as access to secure areas.</p>
          <CookieTable
            cookies={[
              {
                name: "__cf_bm",
                purpose: "Cloudflare places this cookie on end-user devices that access customer sites protected by Bot Management or Bot Fight Mode.",
                provider: ".fun-ladybird-80.clerk.accounts.dev",
                service: "CloudFlare",
                serviceUrl: "https://www.cloudflare.com/privacypolicy/",
                type: "http_cookie",
                expires: "30 minutes",
              },
            ]}
          />
        </section>

        <section>
          <h3 className="font-semibold text-text-1">Performance and functionality cookies</h3>
          <p className="mt-2 text-xs">These cookies are used to enhance the performance and functionality of our Website but are non-essential to their use. However, without these cookies, certain functionality may become unavailable.</p>
          <CookieTable
            cookies={[
              {
                name: "_cfuvid",
                purpose: "This cookie is set by Cloudflare to enhance security and performance. It helps identify trusted web traffic and ensures a secure browsing experience for users.",
                provider: ".fun-ladybird-80.clerk.accounts.dev",
                service: "Cloudflare",
                serviceUrl: "https://developers.cloudflare.com/fundamentals/reference/policies-compliances/cloudflare-cookies/",
                type: "server_cookie",
                expires: "session",
              },
            ]}
          />
        </section>

        <section>
          <h3 className="font-semibold text-text-1">Unclassified cookies</h3>
          <p className="mt-2 text-xs">These are cookies that have not yet been categorized. We are in the process of classifying these cookies with the help of their providers.</p>
          <CookieTable
            cookies={[
              { name: "__client_uat_JMcEnlGw", provider: ".rally-base.vercel.app", type: "http_cookie", expires: "~1 year" },
              { name: "__clerk_db_jwt", provider: "rally-base.vercel.app", type: "server_cookie", expires: "~1 year" },
              { name: "__clerk_redirect_count", provider: "rally-base.vercel.app", type: "server_cookie", expires: "2 seconds" },
              { name: "__clerk_environment", provider: "rally-base.vercel.app", type: "html_local_storage", expires: "persistent" },
              { name: "__client_uat", provider: ".rally-base.vercel.app", type: "server_cookie", expires: "~10 years" },
              { name: "__clerk_db_jwt_JMcEnlGw", provider: "rally-base.vercel.app", type: "http_cookie", expires: "~1 year" },
            ]}
          />
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-1">How can I control cookies on my browser?</h2>
          <p className="mt-3">As the means by which you can refuse cookies through your web browser controls vary from browser to browser, you should visit your browser&rsquo;s help menu for more information. The following is information about how to manage cookies on the most popular browsers:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            {[
              ["Chrome", "https://support.google.com/chrome/answer/95647#zippy=%2Callow-or-block-cookies"],
              ["Internet Explorer", "https://support.microsoft.com/en-us/windows/delete-and-manage-cookies-168dab11-0753-043d-7c16-ede5947fc64d"],
              ["Firefox", "https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop"],
              ["Safari", "https://support.apple.com/en-ie/guide/safari/sfri11471/mac"],
              ["Edge", "https://support.microsoft.com/en-us/windows/microsoft-edge-browsing-data-and-privacy-bb8174ba-9d73-dcf2-9b4a-c582b4e640dd"],
              ["Opera", "https://help.opera.com/en/latest/web-preferences/"],
            ].map(([name, url]) => (
              <li key={name}><a href={url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{name}</a></li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-1">What about other tracking technologies, like web beacons?</h2>
          <p className="mt-3">Cookies are not the only way to recognize or track visitors to a website. We may use other, similar technologies from time to time, like web beacons (sometimes called &ldquo;tracking pixels&rdquo; or &ldquo;clear gifs&rdquo;). These are tiny graphics files that contain a unique identifier that enables us to recognize when someone has visited our Website. This allows us, for example, to monitor the traffic patterns of users from one page within a website to another, to understand whether you have come to the website from an online advertisement displayed on a third-party website, to improve site performance, and to measure the success of email marketing campaigns.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-1">Do you serve targeted advertising?</h2>
          <p className="mt-3">Third parties may serve cookies on your computer or mobile device to serve advertising through our Website. These companies may use information about your visits to this and other websites in order to provide relevant advertisements about goods and services that you may be interested in. The information collected through this process does not enable us or them to identify your name, contact details, or other details that directly identify you unless you choose to provide these.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-1">How often will you update this Cookie Policy?</h2>
          <p className="mt-3">We may update this Cookie Policy from time to time in order to reflect, for example, changes to the cookies we use or for other operational, legal, or regulatory reasons. Please therefore revisit this Cookie Policy regularly to stay informed about our use of cookies and related technologies. The date at the top of this Cookie Policy indicates when it was last updated.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-1">Where can I get further information?</h2>
          <p className="mt-3">If you have any questions about our use of cookies or other technologies, please contact us at:</p>
          <div className="mt-3 space-y-1">
            <p><strong>RallyBase</strong></p>
            <p><a href="mailto:rallybase.admin@gmail.com" className="text-accent hover:underline">rallybase.admin@gmail.com</a></p>
            <p>Phone: 2018990984</p>
          </div>
        </section>

        <p className="text-xs opacity-50">
          This cookie policy was created using Termly&rsquo;s{" "}
          <a href="https://termly.io/products/cookie-consent-manager/" target="_blank" rel="noopener noreferrer" className="hover:underline">Cookie Consent Manager</a>.
        </p>

      </article>
    </div>
  );
}
