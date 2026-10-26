import { LegalPage, H, UL } from '@/components/LegalPage'
import { LEGAL as L } from '@/lib/legal'

export const metadata = { title: `Privacy Policy · ${L.service}` }

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy">
      <p>{L.service} is a private family-tree service run by {L.operator} ({L.owner}), based in {L.country}. This policy explains what information we hold, who can see it, and what control you have. Questions or requests: <a className="text-[#d4af37] underline" href={`mailto:${L.contactEmail}`}>{L.contactEmail}</a>.</p>

      <H>1. The short version</H>
      <UL>
        <li>Everything you enter is visible to <b>every signed-in member of your family tree</b>, and to nobody outside it.</li>
        <li>We do not sell your data, show ads, or use tracking or analytics tools.</li>
        <li>Only the person who entered a card can edit or delete it. The tree’s founder can hide a flagged card but cannot change it.</li>
        <li>You can ask us to correct or delete your information at any time.</li>
      </UL>

      <H>2. What we collect</H>
      <UL>
        <li><b>Your account:</b> email address and password. Your password is handled by our authentication provider and stored only in hashed form; we cannot read it.</li>
        <li><b>Family information you enter:</b> names, gender, year of birth, notes, photos, and the relationships between people (parents, spouses, children).</li>
        <li><b>Records of who did what:</b> which account created or claimed each card, the invite links you create and use, and flags raised about entries, with the reason given.</li>
        <li><b>Technical data:</b> your sign-in session is kept in your browser’s local storage so you stay signed in. Our hosting and database providers may keep standard server logs (such as IP address and time of request) for security.</li>
      </UL>
      <p>We do not ask for, and you should not enter, identity-document numbers, bank details, passwords, health records or other sensitive information in notes.</p>

      <H>3. Why we use it</H>
      <UL>
        <li>To run the service: show the tree to its members, let you add and edit your own entries, and send you the account emails you request (such as email confirmation).</li>
        <li>To protect the service and its members: enforce who may edit what, review flagged entries, prevent abuse.</li>
        <li>On the basis of your consent (given when you create an account) and our need to provide the service you asked for.</li>
      </UL>

      <H>4. Who can see your information</H>
      <UL>
        <li><b>Members of your tree:</b> all members can see all non-hidden cards, including names, birth years, notes and photos, and who entered each card.</li>
        <li><b>The founder:</b> can also see hidden cards and flags raised in the tree.</li>
        <li><b>Service providers who process data for us:</b> Supabase (database and sign-in), Vercel (website hosting) and an email-sending service (account emails). They may only use data to provide their service to us.</li>
        <li>We may disclose information if the law requires it. We do not sell or rent information.</li>
      </UL>

      <H>5. Information about other people</H>
      <p>A family tree necessarily contains information about relatives. By adding someone you confirm that you have a good reason to hold the information (for example, they are your relative and know you are recording it, or they are deceased) and that it is accurate to the best of your knowledge.</p>
      <UL>
        <li><b>Living relatives</b> can ask to see, correct or remove their card. Use the invite link to claim it, or contact us.</li>
        <li><b>Children:</b> enter details of a child only if you are their parent or guardian or have the guardian’s agreement. We do not allow anyone under 18 to hold an account.</li>
        <li><b>Deceased people:</b> may be recorded, but a close relative can still ask us to correct or remove the entry.</li>
      </UL>

      <H>6. Invite links</H>
      <p>An invite link is tied to one card, works once, and expires after {L.inviteDays} days. Anyone who holds the link can claim the card and join the tree, so send it only to the person it is meant for. The person creating the link can replace it at any time, which cancels the old one.</p>

      <H>7. How long we keep it</H>
      <p>We keep your information while your account and its tree exist. You can delete your own account at any time under Network → Delete my account. Your login is deleted immediately. Cards you entered are deleted, except where another member’s card or marriage depends on them: those are kept as an anonymous “Removed person” with every detail wiped. Cards you entered that the person has since claimed are handed to that person, and your details are wiped from any card about you that someone else entered. Your flags and invite links are deleted. A founder who is not alone in a tree must first hand the founder role to another member or delete the whole tree, in which case all of its cards are deleted for everyone. Backups held by our providers are overwritten on their normal cycle.</p>

      <H>8. Your rights</H>
      <p>You may ask us to: give you a copy of your information; correct it; delete it; restrict or object to how we use it; and withdraw your consent. Email <a className="text-[#d4af37] underline" href={`mailto:${L.contactEmail}`}>{L.contactEmail}</a> from your account email address. We aim to reply within 30 days. If you are unhappy with our answer you may complain to the data-protection authority in your country. Our service is run from {L.country}, whose data-protection law we aim to follow, and we apply equivalent protections to relatives living elsewhere, including in the EU/UK.</p>

      <H>9. Security</H>
      <p>Data is transmitted over encrypted connections. Access rules are enforced in the database itself, so a member can only change the cards they are allowed to. No online service can promise absolute security, and you should use a strong, unique password. Tell us immediately if you think your account has been misused.</p>

      <H>10. International storage</H>
      <p>Our providers’ servers may be outside {L.country}. When you use the service your information may be processed there under the provider’s security commitments.</p>

      <H>11. Cookies and tracking</H>
      <p>We use only the browser storage needed to keep you signed in. We do not use advertising or analytics cookies.</p>

      <H>12. Changes</H>
      <p>If we make important changes we will update the date at the top and, where appropriate, notify members by email.</p>
    </LegalPage>
  )
}
