import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | RallyBase",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <article className="space-y-10 text-sm leading-relaxed text-text-2">

        <header>
          <h1 className="text-2xl font-bold text-text-1">PRIVACY POLICY</h1>
          <p className="mt-1">Last updated April 07, 2026</p>
        </header>

        <section>
          <p>
            This Privacy Notice for <strong>RallyBase</strong> (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) describes how and why we might access, collect, store, use, and/or share (&ldquo;process&rdquo;) your personal information when you use our services (&ldquo;Services&rdquo;), including when you:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-6">
            <li>Visit our website at <a href="https://rally-base.vercel.app" className="text-accent hover:underline">https://rally-base.vercel.app</a> or any website of ours that links to this Privacy Notice</li>
            <li>Use RallyBase &mdash; a platform for managing table tennis tournaments and player ratings</li>
            <li>Engage with us in other related ways, including any sales, marketing, or events</li>
          </ul>
          <p className="mt-4">
            <strong>Questions or concerns?</strong> Reading this Privacy Notice will help you understand your privacy rights and choices. If you do not agree with our policies and practices, please do not use our Services. If you still have any questions or concerns, please contact us at{" "}
            <a href="mailto:rallybase.admin@gmail.com" className="text-accent hover:underline">rallybase.admin@gmail.com</a>.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-1">SUMMARY OF KEY POINTS</h2>
          <div className="mt-3 space-y-3">
            <p><strong>What personal information do we process?</strong> When you visit, use, or navigate our Services, we may process personal information depending on how you interact with us and the Services and the choices you make.</p>
            <p><strong>Do we process any sensitive personal information?</strong> We do not process sensitive personal information.</p>
            <p><strong>Do we collect any information from third parties?</strong> We do not collect any information from third parties.</p>
            <p><strong>How do we process your information?</strong> We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law.</p>
            <p><strong>In what situations and with which parties do we share personal information?</strong> We may share information in specific situations and with specific third parties.</p>
            <p><strong>How do we keep your information safe?</strong> We have adequate organizational and technical processes in place to protect your personal information. However, no electronic transmission over the internet can be guaranteed to be 100% secure.</p>
            <p><strong>What are your rights?</strong> Depending on where you are located geographically, the applicable privacy law may mean you have certain rights regarding your personal information.</p>
            <p>
              <strong>How do you exercise your rights?</strong> The easiest way is by submitting a{" "}
              <a href="https://app.termly.io/dsar/02fc2028-0190-4f0d-97ce-d405fbbe2cf2" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">data subject access request</a>{" "}
              or by contacting us. We will consider and act upon any request in accordance with applicable data protection laws.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-1">TABLE OF CONTENTS</h2>
          <ol className="mt-3 list-decimal space-y-1 pl-6">
            {[
              ["#infocollect", "WHAT INFORMATION DO WE COLLECT?"],
              ["#infouse", "HOW DO WE PROCESS YOUR INFORMATION?"],
              ["#whoshare", "WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?"],
              ["#sociallogins", "HOW DO WE HANDLE YOUR SOCIAL LOGINS?"],
              ["#inforetain", "HOW LONG DO WE KEEP YOUR INFORMATION?"],
              ["#infosafe", "HOW DO WE KEEP YOUR INFORMATION SAFE?"],
              ["#infominors", "DO WE COLLECT INFORMATION FROM MINORS?"],
              ["#privacyrights", "WHAT ARE YOUR PRIVACY RIGHTS?"],
              ["#DNT", "CONTROLS FOR DO-NOT-TRACK FEATURES"],
              ["#uslaws", "DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?"],
              ["#policyupdates", "DO WE MAKE UPDATES TO THIS NOTICE?"],
              ["#contact", "HOW CAN YOU CONTACT US ABOUT THIS NOTICE?"],
              ["#request", "HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?"],
            ].map(([href, label]) => (
              <li key={href}><a href={href} className="text-accent hover:underline">{label}</a></li>
            ))}
          </ol>
        </section>

        <section id="infocollect">
          <h2 className="text-base font-semibold text-text-1">1. WHAT INFORMATION DO WE COLLECT?</h2>

          <h3 className="mt-5 font-semibold text-text-1">Personal information you disclose to us</h3>
          <p className="mt-2"><em>We collect personal information that you provide to us.</em></p>
          <p className="mt-3">We collect personal information that you voluntarily provide to us when you register on the Services or otherwise when you contact us.</p>
          <p className="mt-3"><strong>Personal Information Provided by You.</strong> The personal information we collect may include:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>names</li>
            <li>email addresses</li>
            <li>display names</li>
            <li>dates of birth</li>
            <li>gender (optional)</li>
            <li>biographical information (optional)</li>
          </ul>
          <p className="mt-3"><strong>Sensitive Information.</strong> We do not process sensitive information.</p>
          <p className="mt-3">
            <strong>Social Media Login Data.</strong> We may provide you with the option to register with us using your existing social media account details. If you choose to register in this way, we will collect certain profile information about you from the social media provider, as described in the section &ldquo;<a href="#sociallogins" className="text-accent hover:underline">HOW DO WE HANDLE YOUR SOCIAL LOGINS?</a>&rdquo; below.
          </p>
          <p className="mt-3">All personal information that you provide to us must be true, complete, and accurate, and you must notify us of any changes to such personal information.</p>

          <h3 className="mt-6 font-semibold text-text-1">Information automatically collected</h3>
          <p className="mt-2"><em>Some information &mdash; such as your Internet Protocol (IP) address and/or browser and device characteristics &mdash; is collected automatically when you visit our Services.</em></p>
          <p className="mt-3">We automatically collect certain information when you visit, use, or navigate the Services. This information does not reveal your specific identity but may include device and usage information, such as your IP address, browser and device characteristics, operating system, language preferences, referring URLs, country, location, and information about how and when you use our Services.</p>
          <p className="mt-3">The information we collect includes:</p>
          <ul className="mt-2 list-disc pl-6">
            <li><em>Log and Usage Data.</em> Service-related, diagnostic, usage, and performance information our servers automatically collect when you access or use our Services, including your IP address, device information, browser type, activity timestamps, pages viewed, and other actions you take.</li>
          </ul>

          <h3 className="mt-6 font-semibold text-text-1">Google API</h3>
          <p className="mt-2">
            Our use of information received from Google APIs will adhere to the{" "}
            <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Google API Services User Data Policy</a>, including the{" "}
            <a href="https://developers.google.com/terms/api-services-user-data-policy#limited-use" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Limited Use requirements</a>.
          </p>
        </section>

        <section id="infouse">
          <h2 className="text-base font-semibold text-text-1">2. HOW DO WE PROCESS YOUR INFORMATION?</h2>
          <p className="mt-3"><em><strong>In Short:</strong> We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law. We may also process your information for other purposes with your consent.</em></p>
          <p className="mt-3"><strong>We process your personal information for a variety of reasons, including:</strong></p>
          <ul className="mt-2 list-disc space-y-2 pl-6">
            <li><strong>To facilitate account creation and authentication and otherwise manage user accounts.</strong></li>
            <li><strong>To deliver and facilitate delivery of services to the user.</strong></li>
            <li><strong>To respond to user inquiries/offer support to users.</strong></li>
            <li><strong>To send administrative information to you</strong> &mdash; details about our products and services, changes to our terms and policies, and other similar information.</li>
            <li><strong>To request feedback.</strong></li>
            <li><strong>To evaluate and improve our Services, products, marketing, and your experience.</strong></li>
            <li><strong>To identify usage trends.</strong></li>
            <li><strong>To comply with our legal obligations.</strong></li>
          </ul>
        </section>

        <section id="whoshare">
          <h2 className="text-base font-semibold text-text-1">3. WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?</h2>
          <p className="mt-3"><em><strong>In Short:</strong> We may share information in specific situations described in this section and/or with the following third parties.</em></p>
          <p className="mt-3">We may need to share your personal information in the following situations:</p>
          <ul className="mt-2 list-disc pl-6">
            <li><strong>Business Transfers.</strong> We may share or transfer your information in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company.</li>
          </ul>
        </section>

        <section id="sociallogins">
          <h2 className="text-base font-semibold text-text-1">4. HOW DO WE HANDLE YOUR SOCIAL LOGINS?</h2>
          <p className="mt-3"><em><strong>In Short:</strong> If you choose to register or log in to our Services using a social media account, we may have access to certain information about you.</em></p>
          <p className="mt-3">Our Services offer you the ability to register and log in using your third-party social media account details (like your Google login). Where you choose to do this, we will receive certain profile information about you from your social media provider. The profile information we receive may vary depending on the social media provider but will often include your name, email address, and profile picture.</p>
          <p className="mt-3">We will use the information we receive only for the purposes described in this Privacy Notice. We do not control, and are not responsible for, other uses of your personal information by your third-party social media provider. We recommend that you review their privacy notice to understand how they collect, use, and share your personal information.</p>
        </section>

        <section id="inforetain">
          <h2 className="text-base font-semibold text-text-1">5. HOW LONG DO WE KEEP YOUR INFORMATION?</h2>
          <p className="mt-3"><em><strong>In Short:</strong> We keep your information for as long as necessary to fulfill the purposes outlined in this Privacy Notice unless otherwise required by law.</em></p>
          <p className="mt-3">We will only keep your personal information for as long as it is necessary for the purposes set out in this Privacy Notice, unless a longer retention period is required or permitted by law. No purpose in this notice will require us keeping your personal information for longer than the period of time in which users have an account with us.</p>
          <p className="mt-3">When we have no ongoing legitimate business need to process your personal information, we will either delete or anonymize such information, or, if this is not possible (for example, because your personal information has been stored in backup archives), we will securely store your personal information and isolate it from any further processing until deletion is possible.</p>
        </section>

        <section id="infosafe">
          <h2 className="text-base font-semibold text-text-1">6. HOW DO WE KEEP YOUR INFORMATION SAFE?</h2>
          <p className="mt-3"><em><strong>In Short:</strong> We aim to protect your personal information through a system of organizational and technical security measures.</em></p>
          <p className="mt-3">We have implemented appropriate and reasonable technical and organizational security measures designed to protect the security of any personal information we process. However, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure, so we cannot promise or guarantee that hackers, cybercriminals, or other unauthorized third parties will not be able to defeat our security and improperly collect, access, steal, or modify your information. You should only access the Services within a secure environment.</p>
        </section>

        <section id="infominors">
          <h2 className="text-base font-semibold text-text-1">7. DO WE COLLECT INFORMATION FROM MINORS?</h2>
          <p className="mt-3"><em><strong>In Short:</strong> We do not knowingly collect data from or market to children under 18 years of age.</em></p>
          <p className="mt-3">
            We do not knowingly collect, solicit data from, or market to children under 18 years of age. By using the Services, you represent that you are at least 18 or that you are the parent or guardian of such a minor and consent to such minor dependent&rsquo;s use of the Services. If we learn that personal information from users less than 18 years of age has been collected, we will deactivate the account and take reasonable measures to promptly delete such data from our records. If you become aware of any data we may have collected from children under age 18, please contact us at{" "}
            <a href="mailto:rallybase.admin@gmail.com" className="text-accent hover:underline">rallybase.admin@gmail.com</a>.
          </p>
        </section>

        <section id="privacyrights">
          <h2 className="text-base font-semibold text-text-1">8. WHAT ARE YOUR PRIVACY RIGHTS?</h2>
          <p className="mt-3"><em><strong>In Short:</strong> You may review, change, or terminate your account at any time, depending on your country, province, or state of residence.</em></p>
          <p className="mt-3">
            <strong>Withdrawing your consent:</strong> If we are relying on your consent to process your personal information, you have the right to withdraw your consent at any time by contacting us using the contact details provided in &ldquo;<a href="#contact" className="text-accent hover:underline">HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</a>&rdquo; below.
          </p>
          <p className="mt-3">However, please note that this will not affect the lawfulness of the processing before its withdrawal nor, when applicable law allows, will it affect the processing of your personal information conducted in reliance on lawful processing grounds other than consent.</p>

          <h3 className="mt-6 font-semibold text-text-1">Account Information</h3>
          <p className="mt-2">If you would at any time like to review or change the information in your account or terminate your account, you can log in to your account settings and update your user account.</p>
          <p className="mt-3">Upon your request to terminate your account, we will deactivate or delete your account and information from our active databases. However, we may retain some information in our files to prevent fraud, troubleshoot problems, assist with any investigations, enforce our legal terms and/or comply with applicable legal requirements.</p>
          <p className="mt-3">
            If you have questions or comments about your privacy rights, you may email us at{" "}
            <a href="mailto:rallybase.admin@gmail.com" className="text-accent hover:underline">rallybase.admin@gmail.com</a>.
          </p>
        </section>

        <section id="DNT">
          <h2 className="text-base font-semibold text-text-1">9. CONTROLS FOR DO-NOT-TRACK FEATURES</h2>
          <p className="mt-3">Most web browsers and some mobile operating systems include a Do-Not-Track (&ldquo;DNT&rdquo;) feature or setting you can activate to signal your privacy preference not to have data about your online browsing activities monitored and collected. At this stage, no uniform technology standard for recognizing and implementing DNT signals has been finalized. As such, we do not currently respond to DNT browser signals or any other mechanism that automatically communicates your choice not to be tracked online. If a standard for online tracking is adopted that we must follow in the future, we will inform you about that practice in a revised version of this Privacy Notice.</p>
          <p className="mt-3">California law requires us to let you know how we respond to web browser DNT signals. Because there currently is not an industry or legal standard for recognizing or honoring DNT signals, we do not respond to them at this time.</p>
        </section>

        <section id="uslaws">
          <h2 className="text-base font-semibold text-text-1">10. DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?</h2>
          <p className="mt-3"><em><strong>In Short:</strong> If you are a resident of California, Colorado, Connecticut, Delaware, Florida, Indiana, Iowa, Kentucky, Maryland, Minnesota, Montana, Nebraska, New Hampshire, New Jersey, Oregon, Rhode Island, Tennessee, Texas, Utah, or Virginia, you may have the right to request access to and receive details about the personal information we maintain about you and how we have processed it, correct inaccuracies, get a copy of, or delete your personal information.</em></p>

          <h3 className="mt-6 font-semibold text-text-1">Categories of Personal Information We Collect</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-surface-hover">
                  <th className="border border-border p-2 text-left font-medium text-text-1">Category</th>
                  <th className="border border-border p-2 text-left font-medium text-text-1">Examples</th>
                  <th className="border border-border p-2 text-center font-medium text-text-1">Collected</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["A. Identifiers", "Real name, online identifier, Internet Protocol address, email address, account name", "YES"],
                  ["B. Personal information (California Customer Records statute)", "Name and contact information", "YES"],
                  ["C. Protected classification characteristics under state or federal law", "Gender, age, date of birth", "YES"],
                  ["D. Commercial information", "Transaction information, purchase history, financial details", "NO"],
                  ["E. Biometric information", "Fingerprints and voiceprints", "NO"],
                  ["F. Internet or other similar network activity", "Browsing history, search history, online behavior, interest data", "NO"],
                  ["G. Geolocation data", "Device location", "NO"],
                  ["H. Audio, electronic, sensory, or similar information", "Images and audio, video or call recordings", "NO"],
                  ["I. Professional or employment-related information", "Business contact details, job title, work history", "NO"],
                  ["J. Education information", "Student records and directory information", "NO"],
                  ["K. Inferences drawn from collected personal information", "Inferences drawn to create a profile about an individual's preferences and characteristics", "NO"],
                  ["L. Sensitive personal information", "", "NO"],
                ].map(([cat, examples, collected]) => (
                  <tr key={cat}>
                    <td className="border border-border p-2 align-top">{cat}</td>
                    <td className="border border-border p-2 align-top">{examples}</td>
                    <td className="border border-border p-2 text-center align-top font-medium">{collected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4">We will use and retain the collected personal information as needed to provide the Services, or for as long as the user has an account with us (Categories A, B, C).</p>

          <h3 className="mt-6 font-semibold text-text-1">Sources of Personal Information</h3>
          <p className="mt-2">Learn more in &ldquo;<a href="#infocollect" className="text-accent hover:underline">WHAT INFORMATION DO WE COLLECT?</a>&rdquo;</p>

          <h3 className="mt-6 font-semibold text-text-1">How We Use and Share Personal Information</h3>
          <p className="mt-2">Learn more in &ldquo;<a href="#infouse" className="text-accent hover:underline">HOW DO WE PROCESS YOUR INFORMATION?</a>&rdquo; and &ldquo;<a href="#whoshare" className="text-accent hover:underline">WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?</a>&rdquo;</p>
          <p className="mt-3">We have not disclosed, sold, or shared any personal information to third parties for a business or commercial purpose in the preceding twelve (12) months. We will not sell or share personal information in the future belonging to website visitors, users, and other consumers.</p>

          <h3 className="mt-6 font-semibold text-text-1">Your Rights</h3>
          <p className="mt-2">You have rights under certain US state data protection laws. These rights include:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li><strong>Right to know</strong> whether or not we are processing your personal data</li>
            <li><strong>Right to access</strong> your personal data</li>
            <li><strong>Right to correct</strong> inaccuracies in your personal data</li>
            <li><strong>Right to request</strong> the deletion of your personal data</li>
            <li><strong>Right to obtain a copy</strong> of the personal data you previously shared with us</li>
            <li><strong>Right to non-discrimination</strong> for exercising your rights</li>
            <li><strong>Right to opt out</strong> of the processing of your personal data if it is used for targeted advertising, the sale of personal data, or profiling in furtherance of decisions that produce legal or similarly significant effects</li>
          </ul>
          <p className="mt-3">Depending upon the state where you live, you may also have additional rights including rights to access categories of personal data being processed, obtain lists of third parties to which personal data was disclosed, review how personal data has been profiled, and opt out of the collection of sensitive data.</p>

          <h3 className="mt-6 font-semibold text-text-1">How to Exercise Your Rights</h3>
          <p className="mt-2">
            To exercise these rights, you can contact us by submitting a{" "}
            <a href="https://app.termly.io/dsar/02fc2028-0190-4f0d-97ce-d405fbbe2cf2" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">data subject access request</a>,
            by emailing us at{" "}
            <a href="mailto:rallybase.admin@gmail.com" className="text-accent hover:underline">rallybase.admin@gmail.com</a>,
            or by referring to the contact details at the bottom of this document.
          </p>

          <h3 className="mt-6 font-semibold text-text-1">Request Verification</h3>
          <p className="mt-2">Upon receiving your request, we will need to verify your identity to determine you are the same person about whom we have the information in our system. We may request additional information for the purposes of verifying your identity and for security or fraud-prevention purposes.</p>

          <h3 className="mt-6 font-semibold text-text-1">Appeals</h3>
          <p className="mt-2">
            Under certain US state data protection laws, if we decline to take action regarding your request, you may appeal our decision by emailing us at{" "}
            <a href="mailto:rallybase.admin@gmail.com" className="text-accent hover:underline">rallybase.admin@gmail.com</a>.
            If your appeal is denied, you may submit a complaint to your state attorney general.
          </p>

          <h3 className="mt-6 font-semibold text-text-1">California &ldquo;Shine The Light&rdquo; Law</h3>
          <p className="mt-2">
            California Civil Code Section 1798.83 permits our users who are California residents to request and obtain from us, once a year and free of charge, information about categories of personal information (if any) we disclosed to third parties for direct marketing purposes. If you are a California resident and would like to make such a request, please contact us using the details in &ldquo;<a href="#contact" className="text-accent hover:underline">HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</a>&rdquo;
          </p>
        </section>

        <section id="policyupdates">
          <h2 className="text-base font-semibold text-text-1">11. DO WE MAKE UPDATES TO THIS NOTICE?</h2>
          <p className="mt-3"><em><strong>In Short:</strong> Yes, we will update this notice as necessary to stay compliant with relevant laws.</em></p>
          <p className="mt-3">We may update this Privacy Notice from time to time. The updated version will be indicated by an updated &ldquo;Revised&rdquo; date at the top of this Privacy Notice. If we make material changes to this Privacy Notice, we may notify you either by prominently posting a notice of such changes or by directly sending you a notification. We encourage you to review this Privacy Notice frequently.</p>
        </section>

        <section id="contact">
          <h2 className="text-base font-semibold text-text-1">12. HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</h2>
          <p className="mt-3">
            If you have questions or comments about this notice, you may email us at{" "}
            <a href="mailto:rallybase.admin@gmail.com" className="text-accent hover:underline">rallybase.admin@gmail.com</a>.
          </p>
        </section>

        <section id="request">
          <h2 className="text-base font-semibold text-text-1">13. HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?</h2>
          <p className="mt-3">
            Based on the applicable laws of your country or state of residence in the US, you may have the right to request access to the personal information we collect from you, details about how we have processed it, correct inaccuracies, or delete your personal information. To request to review, update, or delete your personal information, please fill out and submit a{" "}
            <a href="https://app.termly.io/dsar/02fc2028-0190-4f0d-97ce-d405fbbe2cf2" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">data subject access request</a>.
          </p>
        </section>

        <p className="text-xs opacity-50">
          This privacy policy was created using Termly&rsquo;s{" "}
          <a href="https://termly.io/products/privacy-policy-generator/" target="_blank" rel="noopener noreferrer" className="hover:underline">Privacy Policy Generator</a>.
        </p>

      </article>
    </div>
  );
}
