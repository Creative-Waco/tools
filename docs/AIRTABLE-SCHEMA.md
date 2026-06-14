# CW Tools Airtable schema

CW Tools bootstraps these tables in your existing Airtable base. **Existing tables are never deleted or renamed** — only new `CW Tools — *` tables and missing fields are added.

## Required PAT scopes

- `data.records:read`
- `data.records:write`
- `schema.bases:read`
- `schema.bases:write`

The token user must have **base creator** access (required to create tables).

## Tables

### `CW Tools — Campaigns`

Parent campaign records (one `utm_campaign` slug per campaign).

| Field | Type |
|-------|------|
| Name | singleLineText (primary) |
| utm_campaign | singleLineText |
| landing_url | url |
| program | singleSelect |
| status | singleSelect (Draft, Active, Complete) |
| benchmark_sessions | number |
| benchmark_engagement_rate | percent |
| benchmark_bounce_rate | percent |
| notes | multilineText |
| created_by | email |
| created_at | dateTime |
| updated_at | dateTime |

### `CW Tools — Campaign Links`

Tagged URL variants linked to a campaign (multiple per campaign).

| Field | Type |
|-------|------|
| Name | singleLineText (primary) |
| Campaign | link → Campaigns |
| utm_source | singleLineText |
| utm_medium | singleLineText |
| utm_term | singleLineText |
| utm_content | singleLineText |
| utm_id | singleLineText |
| channel_preset | singleLineText |
| tagged_url | url |
| created_by | email |
| created_at | dateTime |

### `CW Tools — KPIs`

Scaffold for future org-wide KPI definitions (empty until used).

| Field | Type |
|-------|------|
| Name | singleLineText (primary) |
| slug | singleLineText |
| program | singleSelect |
| metric | singleLineText |
| target_value | number |
| unit | singleLineText |
| period | singleSelect |
| active | checkbox |
| notes | multilineText |

## Bootstrap

On first Campaign Builder API call, `ensureToolsSchema()` in `lib/airtable/schema.mjs`:

1. Reads the full base schema via Meta API
2. Creates any missing CW Tools tables
3. Adds any missing fields on CW Tools tables only

Verify with `GET /api/airtable/health/`.
