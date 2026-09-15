data "cloudflare_zone" "website" {
  filter = {
    account = { id = var.cloudflare_account_id }
    name    = var.domain
  }
}

# Attaching the domain does not create the Worker. `npm run deploy` publishes the
# Worker with wrangler first, so a first apply has something to point at.
resource "cloudflare_workers_custom_domain" "website" {
  account_id = var.cloudflare_account_id
  zone_id    = data.cloudflare_zone.website.id
  hostname   = var.hostname
  service    = var.worker_name
}
