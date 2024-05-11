provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "product_service_rg" {
  name     = "rg-shop-product-service-sand-sea-001"
  location = "southeastasia"
}

resource "azurerm_storage_account" "products_service_fa" {
  name     = "stgshopproductsfasea002"
  location = "southeastasia"

  account_replication_type = "LRS"
  account_tier             = "Standard"
  account_kind             = "StorageV2"

  resource_group_name = azurerm_resource_group.product_service_rg.name

  access_tier                      = "Cool"
  public_network_access_enabled    = true
  shared_access_key_enabled        = true
  allow_nested_items_to_be_public  = true
  enable_https_traffic_only        = true
}

resource "azurerm_storage_share" "products_service_fa" {
  name  = "fa-products-service-share"
  quota = 2

  storage_account_name = azurerm_storage_account.products_service_fa.name
}

resource "azurerm_service_plan" "product_service_plan" {
  name     = "asp-product-service-sand-sea-001"
  location = "southeastasia"

  sku_name = "Y1"

  resource_group_name = azurerm_resource_group.product_service_rg.name
  os_type  = "Windows"
}

resource "azurerm_application_insights" "products_service_fa" {
  name             = "appins-fa-products-service-sand-sea-001"
  application_type = "web"
  location         = "southeastasia"


  resource_group_name = azurerm_resource_group.product_service_rg.name
}


resource "azurerm_windows_function_app" "products_service" {
  name     = "fa-shop-products-service-sea-001"
  location = "southeastasia"

  service_plan_id     = azurerm_service_plan.product_service_plan.id
  resource_group_name = azurerm_resource_group.product_service_rg.name

  storage_account_name       = azurerm_storage_account.products_service_fa.name
  storage_account_access_key = azurerm_storage_account.products_service_fa.primary_access_key

  functions_extension_version = "~4"
  builtin_logging_enabled     = false

  site_config {
    always_on = false


    # For production systems set this to false, but consumption plan supports only 32bit workers

    # Enable function invocations from Azure Portal.
    cors {
      allowed_origins = ["https://portal.azure.com"]
    }
  }
}

  resource "azurerm_app_configuration" "prod_app_config" {
  name                = "prod-app-config"
  location            = azurerm_resource_group.product_service_rg.location
  resource_group_name = azurerm_resource_group.product_service_rg.name
  sku                 = "standard"
}

  resource "azurerm_function_app_slot" "staging" {
  name                      = "staging"
  location                  = azurerm_resource_group.product_service_rg.location
  resource_group_name       = azurerm_resource_group.product_service_rg.name
  app_service_plan_id       = azurerm_service_plan.product_service_plan.id
  function_app_name         = azurerm_windows_function_app.products_service.name
  storage_account_name      = azurerm_storage_account.products_service_fa.name
  storage_account_access_key= azurerm_storage_account.products_service_fa.primary_access_key

  site_config {
    always_on                     = false
    cors {
      allowed_origins             = [ "https://portal.azure.com" ]
    }
  }

  identity {
    type = "SystemAssigned"
  }

  app_settings = {
    WEBSITE_CONTENTAZUREFILECONNECTIONSTRING = azurerm_storage_account.products_service_fa.primary_connection_string
    WEBSITE_CONTENTSHARE                     = azurerm_storage_share.products_service_fa.name
  }

  # The app settings changes cause downtime on the Function App. e.g. with Azure Function App Slots
  # Therefore it is better to ignore those changes and manage app settings separately off the Terraform.
  lifecycle {
    ignore_changes = [
      app_settings,
      tags["hidden-link: /app-insights-instrumentation-key"],
      tags["hidden-link: /app-insights-resource-id"],
      tags["hidden-link: /app-insights-conn-string"]
    ]
  }
}

resource "azurerm_cosmosdb_account" "bkb_cosmos_account" {
  name                = "product-cosmos-account"
  location            = azurerm_resource_group.product_service_rg.location
  resource_group_name = azurerm_resource_group.product_service_rg.name
  offer_type          = "Standard"
  kind                = "MongoDB"

  capabilities {
    name = "EnableMongo"
  }

  geo_location {
    failover_priority = 0
    location          = "North Europe"
  }

  consistency_policy {
    consistency_level = "Eventual"
  }
}

resource "azurerm_cosmosdb_mongo_database" "bkb_cosmos_db" {
  name                = "product-details"
  resource_group_name = azurerm_resource_group.product_service_rg.name
  account_name        = azurerm_cosmosdb_account.bkb_cosmos_account.name
}

resource "azurerm_cosmosdb_mongo_collection" "product_collection" {
  name                = "Product"
  resource_group_name = azurerm_resource_group.product_service_rg.name
  account_name        = azurerm_cosmosdb_account.bkb_cosmos_account.name
  database_name       = azurerm_cosmosdb_mongo_database.bkb_cosmos_db.name

  shard_key           = "id"

  throughput = 400
}

resource "azurerm_cosmosdb_mongo_collection" "stock_collection" {
  name                = "Stocks"
  resource_group_name = azurerm_resource_group.product_service_rg.name
  account_name        = azurerm_cosmosdb_account.bkb_cosmos_account.name
  database_name       = azurerm_cosmosdb_mongo_database.bkb_cosmos_db.name

  shard_key           = "product_id"

  throughput = 400
}

resource "azurerm_storage_container" "bkb_uploaded" {
  name                  = "uploaded-container"
  storage_account_name  = azurerm_storage_account.products_service_fa.name
  container_access_type = "private"
}