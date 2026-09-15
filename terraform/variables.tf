# sensitive only redacts CLI output; a saved plan (plan -out) would still embed
# the token. ephemeral keeps it out of saved plans and state entirely.
variable "cloudflare_api_token" {
  type      = string
  sensitive = true
  ephemeral = true
}

variable "cloudflare_account_id" {
  type = string
}

variable "domain" {
  type        = string
  description = "Cloudflare zone that owns the hostname."
  default     = "devopsrockstars.com"
}

variable "hostname" {
  type        = string
  description = "Public hostname served by the Worker."
  default     = "skyline.devopsrockstars.com"
}

variable "worker_name" {
  type        = string
  description = "Worker that wrangler publishes. Must match the name in wrangler.jsonc."
  default     = "devopsrockstars-skyline-prod"
}
