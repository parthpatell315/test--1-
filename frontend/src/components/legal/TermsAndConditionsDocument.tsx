import Link from "next/link";
import { RefundSchedule } from "@/components/legal/RefundSchedule";
import { brandConfig } from "@/config/brand.config";

const sections = [
  { id: "declaration", label: "Declaration" },
  { id: "liability", label: "Liability" },
  { id: "booking-payments", label: "Booking & Payments" },
  { id: "communication", label: "Communication" },
  { id: "transportation", label: "Transportation" },
  { id: "cancellation", label: "Cancellation & Refund" },
  { id: "content", label: "Trip Content" },
  { id: "jurisdiction", label: "Jurisdiction" },
];

export function TermsAndConditionsDocument() {
  return (
    <div className="bg-[#F5F6F8] min-h-screen pt-24 sm:pt-28 font-sans pb-24">
      {/* 1. HEADER (Avian Style) */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 text-center pt-6 pb-8">
        <span className="text-xs font-bold uppercase tracking-widest text-[#EC1D24] bg-red-50 px-3.5 py-1.5 rounded-full inline-block mb-3">
          Policies & Guidelines
        </span>
        <h1 className="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight mb-2">
          Terms & <span className="text-[#EC1D24]">Conditions</span>
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 max-w-xl mx-auto leading-relaxed font-normal">
          Please read these terms carefully before booking any trip with {brandConfig.name}. By confirming your booking, you agree to these operating policies.
        </p>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 space-y-6">
        <nav
          aria-label="Terms sections"
          className="flex flex-wrap gap-2 justify-center sm:justify-start"
        >
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="text-xs font-bold px-4 py-1.5 rounded-full border border-gray-200 bg-white text-gray-700 hover:border-[#EC1D24] hover:text-[#EC1D24] transition-colors shadow-xs"
            >
              {s.label}
            </a>
          ))}
        </nav>

        <div className="bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-10 shadow-md space-y-10">
          <section id="declaration" className="space-y-3 border-b border-zinc-100 pb-8 scroll-mt-28">
            <SectionHeading n="01" title="Declaration" />
            <div className="space-y-3 text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed pl-9">
              <p>
                I hereby agree that I am participating in this Adventure &amp;
                leisure trip with proper medical advice on my own will &amp;
                risk. I am solely responsible for any injury or accident
                (minor/fatal) that takes place during the trip. {brandConfig.name} is
                not responsible for any such cases, incidents, or accidents
                related to the above-mentioned subject. I also understand the
                risk from wild animals and the dangerous state of water bodies
                nearby the campsite. I have agreed to the Terms and Conditions
                attached with this form.
              </p>
            </div>
          </section>

          <section id="liability" className="space-y-3 border-b border-zinc-100 pb-8 scroll-mt-28">
            <SectionHeading n="02" title="Company liability & conduct" />
            <div className="space-y-3 text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed pl-9">
              <p>
                {brandConfig.name} is a modern adventure travel company that organizes
                and arranges adventure trips to the mountains, which carry the
                risk of accidents, loss of life, bodily injury, financial
                repercussions, and similar outcomes. Neither {brandConfig.name} nor
                its agents or affiliated entities shall be responsible or liable
                for any accident, bodily injury, illness or death, loss or
                damage to baggage or property, or for any damages or claims
                whatsoever arising from loss (including loss of possessions and
                loss of enjoyment), negligence or delay from the act, error,
                omission, default or negligence of any person who is not its
                direct employee or under its exclusive control.
              </p>
              <p>
                No act of misconduct or indiscipline shall be tolerated on the
                tours. We are a cordial travel community and we aspire to bring
                you a hassle-free and memorable experience.
              </p>
            </div>
          </section>

          <section id="booking-payments" className="space-y-3 border-b border-zinc-100 pb-8 scroll-mt-28">
            <SectionHeading n="03" title="Booking & payments" />
            <div className="space-y-3 text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed pl-9">
              <ul className="list-disc space-y-2 pl-4">
                <li>Bookings are accepted through the online website.</li>
                <li>
                  Currently, we do not accept payments on our website. Current
                  account details and barcode are mentioned on our website. We
                  only accept payment in our current account and cash at our
                  office.
                </li>
                <li>
                  The final receipt of the payment will be sent to you by email
                  or the WhatsApp number you mentioned while booking.
                </li>
                <li>
                  If there are fewer than 10 persons in a batch, the driver will
                  guide the group. There is no separate guide for groups of
                  fewer than 10 persons.
                </li>
                <li>
                  {brandConfig.name} does not accept any kind of payment through any
                  3rd party portals, agents, booking offices, mobile
                  applications, etc.
                </li>
                <li>
                  In case of advance payment, if any modification in schedule or
                  planning is made due to unavoidable circumstances, the
                  participant will have to agree with it and bear the extra
                  charges with the remaining payment.
                </li>
                <li>
                  Full payment of the trip cost must be made before 15 days of
                  trip departure. Pending payments may eventually lead to
                  cancellation of the trip.
                </li>
              </ul>
            </div>
          </section>

          <section id="communication" className="space-y-3 border-b border-zinc-100 pb-8 scroll-mt-28">
            <SectionHeading n="04" title="Communication" />
            <div className="space-y-3 text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed pl-9">
              <p>
                Enquiry and registration channels are active via our official
                email concierge at{" "}
                <a
                  href="mailto:contact@trrabb.com"
                  className="text-[#2563EB] font-bold underline underline-offset-2"
                >
                  contact@trrabb.com
                </a>
                .
              </p>
              <p>
                Information available on the website is considered final in case
                of any miscommunication or misinterpretation over the helplines.
              </p>
              <p>
                In case of any disputes, you can raise a complaint by sending
                mail to{" "}
                <a
                  href="mailto:contact@trrabb.com"
                  className="text-[#2563EB] font-bold underline underline-offset-2"
                >
                  contact@trrabb.com
                </a>
                .
              </p>
            </div>
          </section>

          <section id="transportation" className="space-y-3 border-b border-zinc-100 pb-8 scroll-mt-28">
            <SectionHeading n="05" title="Transportation" />
            <div className="space-y-3 text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed pl-9">
              <ul className="list-disc space-y-2 pl-4">
                <li>
                  Train tickets are booked subject to availability. {brandConfig.name}
                  does not possess a right to change the status for waiting or
                  RAC tickets. However, the status will be conveyed to
                  participants while booking tickets.
                </li>
                <li>
                  In case of unforeseen circumstances such as getting stuck at a
                  place due to natural calamity, being unable to board the
                  transport vehicle on schedule, etc., the expenditure of extra
                  accommodation facilities, new transport arrangements, etc.
                  will have to be borne by the participants themselves. No such
                  responsibility would be on part of {brandConfig.name}.
                </li>
                <li>
                  Before boarding the vehicle, the traveler needs to check their
                  vehicle seats/windows. In case of damage, he/she must inform
                  the respective representative of {brandConfig.name}. If not informed
                  and found damaged, the traveler needs to pay the repairing
                  cost for the same.
                </li>
                <li>We don't provide AC in vehicles during the journey.</li>
                <li>
                  Please note: if you book a package from Mumbai, Vadodara, or
                  Surat, inter railway station transfers are not provided by
                  {brandConfig.name}.
                </li>
              </ul>
            </div>
          </section>

          <section id="cancellation" className="space-y-3 border-b border-zinc-100 pb-8 scroll-mt-28">
            <SectionHeading n="06" title="Cancellation & refund policy" />
            <div className="space-y-4 text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed pl-9">
              <p>
                The cancellation policy is mentioned on every trip page. If not
                mentioned specifically, this policy would be considered final.
              </p>
              <p>
                Cancellation would be granted by the Higher Authorities on
                receiving a cancellation request through registered mail ID
                only. The cancellation amount below mentioned will be counted on
                total fees only.
              </p>
              <p>
                The refund amount will be paid in 7 to 12 working days through a
                bank transfer.
              </p>
              <RefundSchedule />
              <ul className="list-disc space-y-2 pl-4">
                <li>The above charges will be applied on the total package cost.</li>
                <li>
                  Full payment has to be done before 15 days of trip departure.
                  If not paid, participation will be cancelled.
                </li>
                <li>
                  If the trip is called off by management due to a natural
                  calamity or unforeseen circumstances, we will issue a refund
                  of fees after deducting train tickets cancellation charges.
                </li>
              </ul>
              <p>
                See also the standalone{" "}
                <Link
                  href="/cancellation-policy"
                  className="text-[#2563EB] font-bold underline underline-offset-2"
                >
                  Cancellation &amp; Refund Policy
                </Link>
                .
              </p>
            </div>
          </section>

          <section id="content" className="space-y-3 border-b border-zinc-100 pb-8 scroll-mt-28">
            <SectionHeading n="07" title="Content of trip" />
            <div className="space-y-3 text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed pl-9">
              <p>
                Photos and videos created on {brandConfig.name}'s trip (by
                {brandConfig.name}'s content creators or clients) are the property of
                {brandConfig.name} and can only be used by {brandConfig.name} for
                advertising across media platforms. None of the digital content
                can be used by anyone without obtaining the rightful permissions
                from {brandConfig.name}.
              </p>
            </div>
          </section>

          <section id="jurisdiction" className="space-y-3 scroll-mt-28">
            <SectionHeading n="08" title="Jurisdiction" />
            <div className="space-y-3 text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed pl-9">
              <p>
                Any type of dispute will be addressed under Ahmedabad
                Jurisdiction only.
              </p>
              <p>
                All travelers have to follow the laws formed by local
                authorities and governments. If anyone is found in violation of
                law, the local administration or government may take legal
                action. {brandConfig.name} will not be held responsible in such cases.
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
      <span className="w-7 h-7 rounded-lg bg-red-50 text-[#EC1D24] font-black text-xs flex items-center justify-center shrink-0 border border-red-200/60">
        {n}
      </span>
      <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
        {title}
      </h2>
    </div>
  );
}
