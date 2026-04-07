import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use | RallyBase",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <article className="space-y-10 text-sm leading-relaxed text-text-2">

        <header>
          <h1 className="text-2xl font-bold text-text-1">TERMS OF USE</h1>
          <p className="mt-1">Last updated April 07, 2026</p>
        </header>

        {/* 1 */}
        <section>
          <h2 className="text-base font-semibold text-text-1">1. Agreement to Terms</h2>
          <p className="mt-3">
            These Terms of Use (&ldquo;Terms&rdquo;) constitute a legally binding agreement between you and <strong>RallyBase</strong> (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) governing your access to and use of the website at{" "}
            <a href="https://rally-base.vercel.app" className="text-accent hover:underline">https://rally-base.vercel.app</a>{" "}
            and all related services (collectively, the &ldquo;Services&rdquo;).
          </p>
          <p className="mt-3">
            By accessing or using the Services, you confirm that you have read, understood, and agree to be bound by these Terms. If you do not agree, you must stop using the Services immediately.
          </p>
          <p className="mt-3">
            We reserve the right to update these Terms at any time. We will notify you of material changes by updating the &ldquo;Last updated&rdquo; date above. Your continued use of the Services after changes are posted constitutes acceptance of the revised Terms.
          </p>
        </section>

        {/* 2 */}
        <section>
          <h2 className="text-base font-semibold text-text-1">2. Eligibility</h2>
          <p className="mt-3">
            You must be at least 13 years of age to use the Services. By using the Services, you represent that you meet this age requirement. If you are under 18, you represent that you have obtained parental or guardian consent to use the Services.
          </p>
        </section>

        {/* 3 */}
        <section>
          <h2 className="text-base font-semibold text-text-1">3. User Accounts</h2>
          <p className="mt-3">
            To access certain features of the Services, you must create an account. You agree to:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-6">
            <li>Provide accurate and complete information during registration, including your real name, date of birth, and gender.</li>
            <li>Keep your account credentials secure and not share your password with anyone.</li>
            <li>Notify us immediately at{" "}
              <a href="mailto:rallybase.admin@gmail.com" className="text-accent hover:underline">rallybase.admin@gmail.com</a>{" "}
              if you suspect unauthorized use of your account.
            </li>
            <li>Maintain only one account per person. Duplicate accounts are not permitted.</li>
          </ul>
          <p className="mt-3">
            You are responsible for all activity that occurs under your account.
          </p>
        </section>

        {/* 4 */}
        <section>
          <h2 className="text-base font-semibold text-text-1">4. Acceptable Use</h2>
          <p className="mt-3">You agree to use the Services only for lawful purposes and in accordance with these Terms. You must not:</p>
          <ul className="mt-3 list-disc space-y-1 pl-6">
            <li>Submit false, fraudulent, or fabricated match results.</li>
            <li>Manipulate ratings or tournament standings through dishonest means.</li>
            <li>Impersonate another person or misrepresent your identity or affiliation.</li>
            <li>Harass, threaten, or abuse other users.</li>
            <li>Attempt to gain unauthorized access to any part of the Services or another user&rsquo;s account.</li>
            <li>Use automated tools (bots, scrapers, crawlers) to access the Services without our prior written consent.</li>
            <li>Interfere with or disrupt the integrity or performance of the Services.</li>
            <li>Use the Services for any commercial purpose without our express written consent.</li>
          </ul>
        </section>

        {/* 5 */}
        <section>
          <h2 className="text-base font-semibold text-text-1">5. Tournament Directors</h2>
          <p className="mt-3">
            Users granted Tournament Director (&ldquo;TD&rdquo;) privileges agree to additional responsibilities:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-6">
            <li>Tournaments must be created in good faith for real competitive play.</li>
            <li>TDs are responsible for the accuracy of tournament information, event settings, and results they directly submit or modify.</li>
            <li>TDs must not use administrative match-submission tools (TD submit, TD default) to manipulate ratings or outcomes outside of legitimate officiating circumstances.</li>
            <li>TD access may be revoked at any time if these Terms are violated.</li>
          </ul>
        </section>

        {/* 6 */}
        <section>
          <h2 className="text-base font-semibold text-text-1">6. Ratings and Rankings</h2>
          <p className="mt-3">
            Player ratings are computed algorithmically based on match results submitted through the Services. RallyBase provides ratings for informational and organizational purposes only. We make no representations or warranties regarding the accuracy, completeness, or fitness of ratings for any particular purpose, including but not limited to official competitive rankings or selection criteria.
          </p>
          <p className="mt-3">
            Ratings within one organization are completely independent of ratings in another organization and should not be compared across organizations.
          </p>
        </section>

        {/* 7 */}
        <section>
          <h2 className="text-base font-semibold text-text-1">7. Intellectual Property</h2>
          <p className="mt-3">
            The Services and their original content, features, and functionality are and will remain the exclusive property of RallyBase. You may not copy, modify, distribute, sell, or lease any part of the Services without our prior written permission.
          </p>
          <p className="mt-3">
            By submitting content to the Services (such as player profiles or match results), you grant RallyBase a non-exclusive, royalty-free license to use, store, and display that content solely for the purpose of operating and improving the Services.
          </p>
        </section>

        {/* 8 */}
        <section>
          <h2 className="text-base font-semibold text-text-1">8. Third-Party Services</h2>
          <p className="mt-3">
            The Services use third-party providers including Clerk (authentication), Neon (database), and Vercel (hosting). Your use of the Services is also subject to those providers&rsquo; terms and privacy policies. We are not responsible for the practices of third-party services.
          </p>
        </section>

        {/* 9 */}
        <section>
          <h2 className="text-base font-semibold text-text-1">9. Disclaimer of Warranties</h2>
          <p className="mt-3">
            THE SERVICES ARE PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>
          <p className="mt-3">
            We do not warrant that the Services will be uninterrupted, error-free, or free of viruses or other harmful components. We do not warrant that ratings, standings, or any other data displayed through the Services are accurate or up to date.
          </p>
        </section>

        {/* 10 */}
        <section>
          <h2 className="text-base font-semibold text-text-1">10. Limitation of Liability</h2>
          <p className="mt-3">
            TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, RALLYBASE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF DATA, LOSS OF PROFITS, OR LOSS OF GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF OR INABILITY TO USE THE SERVICES, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
          </p>
          <p className="mt-3">
            IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU EXCEED ONE HUNDRED U.S. DOLLARS ($100).
          </p>
        </section>

        {/* 11 */}
        <section>
          <h2 className="text-base font-semibold text-text-1">11. Termination</h2>
          <p className="mt-3">
            We reserve the right to suspend or terminate your account and access to the Services at any time, with or without notice, for any reason, including if we believe you have violated these Terms.
          </p>
          <p className="mt-3">
            You may delete your account at any time by submitting a data deletion request via the link in our{" "}
            <a href="/privacy" className="text-accent hover:underline">Privacy Policy</a>.
          </p>
        </section>

        {/* 12 */}
        <section>
          <h2 className="text-base font-semibold text-text-1">12. Governing Law</h2>
          <p className="mt-3">
            These Terms shall be governed by and construed in accordance with the laws of the State of New Jersey, United States, without regard to its conflict of law provisions. Any disputes arising from these Terms or your use of the Services shall be resolved in the courts located in New Jersey.
          </p>
        </section>

        {/* 13 */}
        <section>
          <h2 className="text-base font-semibold text-text-1">13. Contact Us</h2>
          <p className="mt-3">If you have any questions about these Terms, please contact us:</p>
          <div className="mt-3 space-y-1">
            <p><strong>RallyBase</strong></p>
            <p><a href="mailto:rallybase.admin@gmail.com" className="text-accent hover:underline">rallybase.admin@gmail.com</a></p>
            <p>Phone: 2018990984</p>
          </div>
        </section>

      </article>
    </div>
  );
}
