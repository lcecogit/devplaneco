import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/partner/profile/ProfileForm";
import { PhotoUploadField } from "@/components/partner/profile/PhotoUploadField";
import { DocumentUploadField } from "@/components/partner/profile/DocumentUploadField";
import { InsuranceCoverageForm } from "@/components/partner/profile/InsuranceCoverageForm";
import { PaymentDetailsForm } from "@/components/partner/profile/PaymentDetailsForm";

export const metadata: Metadata = { title: "Profile" };

export default async function PartnerProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: partner } = await supabase
    .from("transport_partners")
    .select(
      "id, business_name, business_description, company_type, trade_associations, allow_bid_invitations, published, profile_photo_url, goods_in_transit_insurance_doc_url, cmr_insurance_doc_url, goods_in_transit_cover_amount, cmr_cover_amount, category_preferences, notify_email, notify_sms"
    )
    .eq("profile_id", user!.id)
    .single();

  const { data: paymentDetails } = await supabase
    .from("transport_partner_payment_details")
    .select("bank_account_name, bank_sort_code, bank_account_number, vat_number, payment_methods_accepted")
    .eq("transport_partner_id", partner!.id)
    .maybeSingle();

  const [goodsInTransitSignedUrl, cmrSignedUrl] = await Promise.all([
    partner?.goods_in_transit_insurance_doc_url
      ? supabase.storage
          .from("partner-documents")
          .createSignedUrl(partner.goods_in_transit_insurance_doc_url, 60)
          .then((r) => r.data?.signedUrl ?? null)
      : Promise.resolve(null),
    partner?.cmr_insurance_doc_url
      ? supabase.storage
          .from("partner-documents")
          .createSignedUrl(partner.cmr_insurance_doc_url, 60)
          .then((r) => r.data?.signedUrl ?? null)
      : Promise.resolve(null),
  ]);

  return (
    <div className="max-w-2xl">
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">Profile</h1>
      <p className="mt-1 text-sm text-ink-700">
        This is how customers and Movers Now will see your business.
      </p>

      <div className="mt-6 rounded-2xl border border-brand-100 bg-white p-6">
        <h2 className="font-heading text-base font-bold text-ink-900">Profile photo</h2>
        <div className="mt-3">
          <PhotoUploadField
            transportPartnerId={partner!.id}
            currentUrl={partner!.profile_photo_url}
          />
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-brand-100 bg-white p-6">
        <h2 className="font-heading text-base font-bold text-ink-900">Business details</h2>
        <div className="mt-4">
          <ProfileForm partner={partner!} />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-brand-100 bg-white p-6">
        <h2 className="font-heading text-base font-bold text-ink-900">Insurance documents</h2>
        <InsuranceCoverageForm
          transportPartnerId={partner!.id}
          goodsInTransitCoverAmount={partner!.goods_in_transit_cover_amount}
          cmrCoverAmount={partner!.cmr_cover_amount}
        />
        <DocumentUploadField
          label="Goods in transit insurance"
          transportPartnerId={partner!.id}
          column="goods_in_transit_insurance_doc_url"
          currentSignedUrl={goodsInTransitSignedUrl}
          hasCurrentFile={Boolean(partner!.goods_in_transit_insurance_doc_url)}
        />
        <DocumentUploadField
          label="CMR insurance"
          transportPartnerId={partner!.id}
          column="cmr_insurance_doc_url"
          currentSignedUrl={cmrSignedUrl}
          hasCurrentFile={Boolean(partner!.cmr_insurance_doc_url)}
        />
      </div>

      <div className="mt-6 rounded-2xl border border-brand-100 bg-white p-6">
        <h2 className="font-heading text-base font-bold text-ink-900">Payment details</h2>
        <div className="mt-4">
          <PaymentDetailsForm transportPartnerId={partner!.id} details={paymentDetails ?? null} />
        </div>
      </div>
    </div>
  );
}
