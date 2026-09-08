import Link from "next/link";

const sections = [
  { id: "about", label: "About this policy" },
  { id: "personal-information", label: "Personal information" },
  { id: "what-we-collect", label: "What we collect" },
  { id: "security", label: "Security" },
  { id: "other-websites", label: "Other websites" },
  { id: "controlling", label: "Controlling your data" },
  { id: "sharing", label: "Sharing with third parties" },
  { id: "media", label: "Media" },
  { id: "how-we-use", label: "How we use it" },
  { id: "cookies", label: "Cookies" },
  { id: "retention", label: "Retention" },
  { id: "rights", label: "Your rights" },
  { id: "controller", label: "Data controller" },
];

export function PrivacyPolicyDocument() {
  return (
    <div className="bg-white min-h-screen pt-24 font-montserrat pb-20">
      <section className="bg-[#0B1528] text-white py-16 sm:py-20 px-5 sm:px-8 text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto space-y-3 relative z-10">
          <span className="bg-white/10 text-[#D4541A] font-extrabold tracking-widest uppercase text-xs px-3.5 py-1.5 rounded-full inline-block">
            Data privacy & security
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase">
            Privacy <span className="text-[#D4541A]">Policy</span>
          </h1>
          <div className="w-16 h-1.5 bg-[#D4541A] rounded-full mx-auto my-3" />
          <p className="text-xs sm:text-sm text-zinc-300 font-semibold max-w-xl mx-auto leading-relaxed">
            This privacy policy describes what information we collect from you,
            how it is used, and what security measures we take to protect it.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-12 space-y-8">
        <nav
          aria-label="Privacy policy sections"
          className="flex flex-wrap gap-2 justify-center sm:justify-start"
        >
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wide px-3 py-1.5 rounded-full border border-zinc-200 text-[#0B1528] hover:border-[#D4541A] hover:text-[#D4541A] transition-colors"
            >
              {s.label}
            </a>
          ))}
        </nav>

        <div className="bg-white border border-zinc-200/90 rounded-[28px] p-6 sm:p-10 space-y-10">
          <section id="about" className="space-y-3 border-b border-zinc-100 pb-8 scroll-mt-28">
            <SectionHeading n="01" title="About this policy" />
            <div className="space-y-3 text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed pl-9">
              <p>
                Thank you for visiting{" "}
                <a
                  href="https://trrabb.com"
                  className="text-[#D4541A] font-bold underline underline-offset-2"
                >
                  https://trrabb.com
                </a>
                . The Website is owned and managed by TRRABB, The Company
                registered in India as GST number 24CRFPP3172G1ZT, having its
                registered address at 2ND FLOOR, BLOCK G, 225, TPS-14,113-114,
                SUMEL BUSINESS PARK-6, NR.DUDHESHWAR CIRCLE, OLD JUPITER MILL,
                AHMEDABAD, Ahmedabad, Gujarat, 380004.
              </p>
              <p>
                The Organization is authorized to use www.trrabb.com for
                commercial purposes by virtue of a Platform License Agreement.
              </p>
              <p>
                At TRRABB, we strongly believe in protecting consumer
                privacy. That's why we only ask you for information related to
                the services we provide. We never sell, rent, share, trade or
                give away any of your personal information to anyone. This
                privacy policy describes what information we collect from you,
                how it is used and what security measures we take to protect it.
              </p>
              <p>
                Trrabb provides online travel services through its own
                websites and mobile apps and through other online platforms such
                as partners' websites and social media. The information that
                follows applies to all of these platforms.
              </p>
            </div>
          </section>

          <section
            id="personal-information"
            className="space-y-3 border-b border-zinc-100 pb-8 scroll-mt-28"
          >
            <SectionHeading n="02" title="What kind of personal information does Trrabb use?" />
            <div className="space-y-3 text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed pl-9">
              <p>
                When you make a reservation, you'll be asked for your name,
                address, telephone number, email address, payment details, the
                names of guests traveling with you and your preferences for your
                stay. To make it easier to manage your reservations, you can
                open a user account. This allows you to save your personal
                settings, review previous bookings and manage future
                reservations. When you visit our website, even if you don't make
                a reservation, we may collect certain information, like your IP
                address, or browser, and information about your computer's
                operating system, application version, language settings and
                pages that have been shown to you. If you're using a mobile
                device, we might also collect data that identifies your mobile
                device, device-specific settings and characteristics and
                latitude/longitude details. We may also receive information
                about you when you use certain social media services.
              </p>
            </div>
          </section>

          <section
            id="what-we-collect"
            className="space-y-3 border-b border-zinc-100 pb-8 scroll-mt-28"
          >
            <SectionHeading n="03" title="What we collect" />
            <div className="space-y-3 text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed pl-9">
              <p>We may collect the following information:</p>
              <ul className="list-disc space-y-2 pl-4">
                <li>name and job title</li>
                <li>contact information including email address</li>
                <li>
                  demographic information such as postcode, preferences and
                  interests
                </li>
                <li>
                  other information relevant to customer surveys and/or offers
                </li>
              </ul>
            </div>
          </section>

          <section id="security" className="space-y-3 border-b border-zinc-100 pb-8 scroll-mt-28">
            <SectionHeading n="04" title="Security" />
            <div className="space-y-3 text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed pl-9">
              <p>
                We are committed to ensuring that your information is secure. In
                order to prevent the unauthorised access or disclosure we have
                put in place suitable physical, electronic and managerial
                procedures to safeguard and secure the information we collect
                online.
              </p>
            </div>
          </section>

          <section
            id="other-websites"
            className="space-y-3 border-b border-zinc-100 pb-8 scroll-mt-28"
          >
            <SectionHeading n="05" title="Links to other websites" />
            <div className="space-y-3 text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed pl-9">
              <p>
                Our website may contain links to other websites of interest.
                However, once you have used these links to leave our site, you
                should note that we do not have any control over that other
                website. Therefore, we cannot be responsible for the protection
                and privacy of any information which you provide whilst visiting
                such sites and such sites are not governed by this privacy
                statement. You should exercise caution and look at the privacy
                statement applicable to the website in question.
              </p>
            </div>
          </section>

          <section
            id="controlling"
            className="space-y-3 border-b border-zinc-100 pb-8 scroll-mt-28"
          >
            <SectionHeading n="06" title="Controlling your personal information" />
            <div className="space-y-3 text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed pl-9">
              <p>
                You may choose to restrict the collection or use of your
                personal information in the following ways:
              </p>
              <ul className="list-disc space-y-2 pl-4">
                <li>
                  whenever you are asked to fill in a form on the website, look
                  for the box that you can click to indicate that you do not
                  want the information to be used by anybody for direct
                  marketing purposes
                </li>
                <li>
                  if you have previously agreed to us using your personal
                  information for direct marketing purposes, you may change your
                  mind at any time by writing to or emailing us at{" "}
                  <a
                    href="mailto:contact@trrabb.com"
                    className="text-[#D4541A] font-bold underline underline-offset-2"
                  >
                    contact@trrabb.com
                  </a>
                </li>
              </ul>
              <p>
                We will not sell, distribute, or lease your personal information
                to third parties unless we have your permission or are required
                by law to do so. We may use your personal information to send
                you promotional information about third parties which we think
                you may find interesting if you tell us that you wish this to
                happen.
              </p>
              <p>
                You may request details of personal information which we hold
                about you under the Data Protection Act 1998. A small fee will
                be payable. If you would like a copy of the information held on
                you please write to{" "}
                <a
                  href="mailto:contact@trrabb.com"
                  className="text-[#D4541A] font-bold underline underline-offset-2"
                >
                  contact@trrabb.com
                </a>
                . If you believe that any information we are holding on you is
                incorrect or incomplete, please write to or email us as soon as
                possible, at the above address. We will promptly correct any
                information found to be incorrect.
              </p>
            </div>
          </section>

          <section id="contact" className="space-y-3 border-b border-zinc-100 pb-8 scroll-mt-28">
            <SectionHeading n="07" title="Contacting us" />
            <div className="space-y-3 text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed pl-9">
              <p>
                If there are any questions regarding this privacy policy, you
                may contact us using the information given above, or email{" "}
                <a
                  href="mailto:contact@trrabb.com"
                  className="text-[#D4541A] font-bold underline underline-offset-2"
                >
                  contact@trrabb.com
                </a>
                .
              </p>
            </div>
          </section>

          <section id="sharing" className="space-y-3 border-b border-zinc-100 pb-8 scroll-mt-28">
            <SectionHeading n="08" title="How does Trrabb share your data with third parties?" />
            <div className="space-y-3 text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed pl-9">
              <p>
                In certain circumstances, we may share your personal data with
                third parties.
              </p>
              <p>
                <span className="font-bold text-[#0B1528]">
                  The accommodation you booked:
                </span>{" "}
                In order to complete your reservation, we need to transfer
                relevant reservation details to the services
                (hotels/rentals/cars/cruises/tours/activities) you booked with.
                This may include information like your name, contact and payment
                details, the names of guests travelling with you and any
                preferences you specified when making a booking.
              </p>
              <p>
                <span className="font-bold text-[#0B1528]">
                  Your local TRRABB office:
                </span>{" "}
                In order to support you during the reservation process and
                throughout your stay, your details may be shared with Partners
                of Trrabb. Your information might also be shared with
                other members of the Trrabb group for analysis to provide
                you with travel-related offers that may be of interest to you
                and to offer you customized service.
              </p>
              <p>
                <span className="font-bold text-[#0B1528]">
                  Third-party service providers:
                </span>{" "}
                We may use third-party service providers to process your
                personal information on our behalf for the purposes specified
                above. For example, we may use service providers to send the
                reservation information on our behalf to the service item you
                just booked, or we may instruct third parties to contact you.
                When a reservation requires it, we may also work with
                third-party payment service providers to facilitate payment or
                payment guarantees. We also work with third-party advertisement
                networks to market our accommodation and services on other
                platforms or involve third-party providers for analytical
                purposes. These third parties involved in any of these services
                will be bound by confidentiality agreements and will not be
                allowed to use your personal information for any purposes other
                than those specified above.
              </p>
              <p>
                <span className="font-bold text-[#0B1528]">
                  Competent authorities:
                </span>{" "}
                We work with partner websites around the world to distribute the
                service items listed on our website and mobile apps
                (Hotels/Rentals/Cars/Cruises/Tour/Activities). When you make a
                reservation on one of these business partners' websites, certain
                personal information that you give them may be shared with us.
                Similarly, we may share information with this business partner,
                for example, as part of the administration of your account, in
                order to manage your reservation, so that they can address
                queries related to your reservation and for marketing purposes.
                In this context, your information is governed by the privacy
                policies of these business partners.
              </p>
            </div>
          </section>

          <section id="media" className="space-y-3 border-b border-zinc-100 pb-8 scroll-mt-28">
            <SectionHeading n="09" title="Media" />
            <div className="space-y-3 text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed pl-9">
              <p>
                If you upload images to the website, you should avoid uploading
                images with embedded location data (EXIF GPS) included. Visitors
                to the website can download and extract any location data from
                images on the website.
              </p>
            </div>
          </section>

          <section
            id="how-we-use"
            className="space-y-3 border-b border-zinc-100 pb-8 scroll-mt-28"
          >
            <SectionHeading n="10" title="What we do with the information we gather" />
            <div className="space-y-3 text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed pl-9">
              <p>
                We require this information to understand your needs and provide
                you with a better service, and, in particular, for the following
                reasons:
              </p>
              <ul className="list-disc space-y-2 pl-4">
                <li>Internal record keeping.</li>
                <li>
                  We may use the information to improve our products and
                  services.
                </li>
                <li>
                  We may periodically send promotional emails about new
                  products, special offers or other information which we think
                  you may find interesting using the email address which you
                  have provided.
                </li>
                <li>
                  From time to time, we may also use your information to contact
                  you for market research purposes. We may contact you by email,
                  phone, fax or mail. We may use the information to customise
                  the website according to your interests.
                </li>
              </ul>
            </div>
          </section>

          <section id="cookies" className="space-y-3 border-b border-zinc-100 pb-8 scroll-mt-28">
            <SectionHeading n="11" title="Cookies" />
            <div className="space-y-3 text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed pl-9">
              <p>
                If you leave a comment on our site you may opt-in to saving your
                name, email address and website in cookies. These are for your
                convenience so that you do not have to fill in your details
                again when you leave another comment. These cookies will last
                for one year.
              </p>
              <p>
                If you visit our login page, we will set a temporary cookie to
                determine if your browser accepts cookies. This cookie contains
                no personal data and is discarded when you close your browser.
              </p>
              <p>
                When you log in, we will also set up several cookies to save
                your login information and your screen display choices. Login
                cookies last for two days, and screen options cookies last for a
                year. If you select "Remember Me", your login will persist for
                two weeks. If you log out of your account, the login cookies
                will be removed.
              </p>
              <p>
                If you edit or publish an article, an additional cookie will be
                saved in your browser. This cookie includes no personal data and
                simply indicates the post ID of the article you just edited. It
                expires after 1 day.
              </p>
            </div>
          </section>

          <section
            id="retention"
            className="space-y-3 border-b border-zinc-100 pb-8 scroll-mt-28"
          >
            <SectionHeading n="12" title="How long we retain your data" />
            <div className="space-y-3 text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed pl-9">
              <p>
                If you leave a comment, the comment and its metadata are
                retained indefinitely. This is so we can recognize and approve
                any follow-up comments automatically instead of holding them in
                a moderation queue.
              </p>
              <p>
                For users that register on our website (if any), we also store
                the personal information they provide in their user profile. All
                users can see, edit, or delete their personal information at any
                time (except they cannot change their username). Website
                administrators can also see and edit that information.
              </p>
            </div>
          </section>

          <section id="rights" className="space-y-3 border-b border-zinc-100 pb-8 scroll-mt-28">
            <SectionHeading n="13" title="What rights you have over your data" />
            <div className="space-y-3 text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed pl-9">
              <p>
                If you have an account on this site, or have left comments, you
                can request to receive an exported file of the personal data we
                hold about you, including any data you have provided to us. You
                can also request that we erase any personal data we hold about
                you. This does not include any data we are obliged to keep for
                administrative, legal, or security purposes.
              </p>
            </div>
          </section>

          <section id="controller" className="space-y-3 scroll-mt-28">
            <SectionHeading n="14" title="Who is responsible for the processing of personal data?" />
            <div className="space-y-3 text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed pl-9">
              <p>
                Trrabb controls the processing of personal data on its
                websites and mobile apps. Trrabb is crafted by our Team.
                If you have any suggestions or comments about this privacy
                notice, please send an email to{" "}
                <a
                  href="mailto:contact@trrabb.com"
                  className="text-[#D4541A] font-bold underline underline-offset-2"
                >
                  contact@trrabb.com
                </a>
                .
              </p>
              <p>
                See also our{" "}
                <Link
                  href="/terms-and-conditions"
                  className="text-[#D4541A] font-bold underline underline-offset-2"
                >
                  Terms &amp; Conditions
                </Link>
                .
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ n, title }: { n: string; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-7 h-7 rounded-lg bg-orange-50 text-[#D4541A] font-black text-xs flex items-center justify-center shrink-0">
        {n}
      </span>
      <h2 className="text-lg sm:text-xl font-black text-[#0B1528] uppercase tracking-tight">
        {title}
      </h2>
    </div>
  );
}
