import { LegalPage, H, UL } from '@/components/LegalPage'
import { LEGAL as L } from '@/lib/legal'

export const metadata = { title: `Terms of Service · ${L.service}` }

export default function Terms() {
  return (
    <LegalPage title="Terms of Service">
      <p>These terms govern your use of {L.service}, operated by {L.operator} ({L.owner}), {L.country} (“we”, “us”). By creating an account or joining a tree you agree to them and to our <a className="text-[#d4af37] underline" href="/privacy">Privacy Policy</a>.</p>

      <H>1. The service</H>
      <p>{L.service} lets families build a shared tree. A <b>founder</b> creates a tree and invites relatives through single-use invite links. Each relative claims a card, adds their own family and may invite others.</p>

      <H>2. Your account</H>
      <UL>
        <li>You must be 18 or older and give a real email address.</li>
        <li>Keep your password private. You are responsible for activity under your account.</li>
        <li>One account claims one card in a tree.</li>
      </UL>

      <H>3. Who can change what</H>
      <UL>
        <li>A card can be edited only by the account that created it, or by the person who has claimed it (for their own card).</li>
        <li>A card can be deleted only by the account that created it. Deleting a card does not delete cards created by others, but links to it are removed.</li>
        <li>The founder cannot edit or delete other members’ cards. The founder may <b>hide</b> a flagged card and may restore it.</li>
        <li>Any member may flag a card they believe is false, abusive or harmful. Flags are reviewed by the founder.</li>
      </UL>

      <H>4. What you may enter</H>
      <p>You are responsible for what you enter. You agree that you will:</p>
      <UL>
        <li>enter information that is true to the best of your knowledge;</li>
        <li>record living people only where you have a good reason and, where reasonable, their agreement;</li>
        <li>enter details of children only if you are their parent or guardian or have the guardian’s agreement;</li>
        <li>not enter anything unlawful, defamatory, hateful, harassing or sexually explicit, or anyone’s identity-document numbers, bank details or passwords;</li>
        <li>not upload photos you have no right to share;</li>
        <li>not impersonate others, share invite links with people they are not meant for, or try to bypass the access rules.</li>
      </UL>

      <H>5. Your content and our permission to host it</H>
      <p>You keep ownership of what you enter. You give us permission to store it and show it to the other members of your tree for the purpose of running the service. We do not use your family information for advertising or sell it.</p>

      <H>6. Removing content and accounts</H>
      <p>We or the founder may hide an entry that breaks these terms. We may suspend or end an account that repeatedly breaks them, abuses the service or puts others at risk. You may stop using the service at any time and can delete your account yourself under Network → Delete my account (see the Privacy Policy for what happens to your entries). Deleting an account cannot be undone.</p>

      <H>7. Availability and backups</H>
      <p>We work to keep the service running but do not promise it will always be available or error-free. Keep your own copy of important family information; the app lets you export your tree from the export buttons.</p>

      <H>8. No warranties, limited liability</H>
      <p>The service is provided “as is”. We are not responsible for the accuracy of information entered by members. To the fullest extent the law allows, we are not liable for indirect or consequential loss, or for loss of data caused by events outside our reasonable control. Nothing in these terms limits liability that cannot lawfully be limited.</p>

      <H>9. Paid features</H>
      <p>If we introduce paid plans, the price and what you get will be shown before you pay, and any refund terms will be stated at purchase.</p>

      <H>10. Changes and law</H>
      <p>We may update these terms; the date above shows the latest version, and continued use after a change means you accept it. These terms are governed by the laws of {L.country}.</p>

      <H>11. Contact</H>
      <p><a className="text-[#d4af37] underline" href={`mailto:${L.contactEmail}`}>{L.contactEmail}</a></p>
    </LegalPage>
  )
}
