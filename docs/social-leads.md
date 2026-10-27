# Social enquiries and orders

Vercel Web Analytics is mounted once in `src/app/layout.tsx` via `@vercel/analytics/next`. Enable Web Analytics for the Vercel project to view visits.

The storefront links to https://www.facebook.com/bdchuricanvas and Messenger. TikTok shows “Coming soon” until a profile is enabled in Admin → Social studio.

Share `/enquire?source=facebook` on Facebook and `/enquire?source=tiktok` on TikTok. The form records the selected platform, customer name, normalized Bangladesh mobile number, enquiry, and contact consent. Public responses contain no lead or order details. Submissions are limited to ten per IP per hour on Vercel.

In Admin → Social studio, copy enquiry links, add conversations with customer consent, search/filter leads, and record private follow-up notes. Statuses are New, Contacted, Qualified, Lost, and Converted. Confirmed leads can become COD orders by selecting an available piece, size, quantity, address and delivery zone. Order creation uses inventory pricing and delivery fees, deducts stock transactionally, preserves platform attribution and links the lead to the order. Retrying conversion returns the same order. Manage fulfilment in Orders.

This implementation collects enquiries submitted through the website or entered by staff. It does not import Facebook/TikTok inbox messages or advertising leads automatically. Existing profile/post sync remains separate and requires platform access tokens. No external messages are sent by the lead workflow.

Lead data uses the existing transactional store (Postgres in production, local JSON in demo mode). Older saved stores gain an empty lead collection without a SQL schema migration. Tests use in-memory stores and do not write production data.
