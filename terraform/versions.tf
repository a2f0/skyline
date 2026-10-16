terraform {
  required_version = ">= 1.11, < 2.0"

  # State lives in Skyline's own Cloudflare R2 bucket (S3-compatible).
  # scripts/terraform.sh maps the production tier's TF_STATE_* key to the AWS
  # variables this backend reads.
  backend "s3" {
    bucket = "skyline-terraform-state"
    key    = "terraform.tfstate"
    region = "auto"
    endpoints = {
      s3 = "https://0be508e6c4caa573595c5f94e11900e4.r2.cloudflarestorage.com"
    }
    use_lockfile                = true
    use_path_style              = true
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
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
