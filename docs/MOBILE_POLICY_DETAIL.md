# Mobile Policy Detail Contract

`get_mobile_policy_detail(p_policy_id uuid, p_product_id uuid default null) → jsonb`

Shape:
```
{
  policy: { id, project_id, title, slug, summary, effective_from, effective_to,
    registration_deadline, is_featured, priority, published_at, version_number,
    derived_effective_status: 'effective' | 'upcoming' | 'expired' },
  project: { id, code, name, slug, cover_url, location_text },
  content_sections: [ { id?, title?, subtitle?, content?, note?, highlight?, items? } ],
  attachments: [ { id?, label?, url?, file_url?, mime_type?, file_type?, ... } ],
  applicability_summary: {
    scope: 'project_wide' | 'product_types' | 'products' | 'mixed',
    product_types: [{ id, name }],
    products: [{ id, product_code, product_name }],
    applies_to_current_product: boolean | null
  },
  primary_contact: MobilePrimaryContact | null
}
```

Runtime validated by `assertPolicyDetailShape` in `src/services/mobile/policies.service.ts`.
