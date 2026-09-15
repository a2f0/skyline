terraform {
  required_version = ">= 1.11, < 2.0"

  # State lives beside the other Cloudflare stacks for this account. Backend
  # settings that vary by operator stay in backend.hcl.
  backend "s3" {
    key = "skyline/website/terraform.tfstate"
  }

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.24"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}
