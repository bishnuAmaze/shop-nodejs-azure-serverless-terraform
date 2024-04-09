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
}

resource "azurerm_storage_share" "products_service_fa" {
  name  = "fa-products-service-share"
  quota = 2

  storage_account_name = azurerm_storage_account.products_service_fa.name
}

resource "azurerm_service_plan" "product_service_plan" {
  name     = "asp-product-service-sand-sea-001"
  location = "southeastasia"

  os_type  = "Windows"
  sku_name = "Y1"

  resource_group_name = azurerm_resource_group.product_service_rg.name
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

    application_insights_key               = azurerm_application_insights.products_service_fa.instrumentation_key
    application_insights_connection_string = azurerm_application_insights.products_service_fa.connection_string

    # For production systems set this to false, but consumption plan supports only 32bit workers
    use_32_bit_worker = true

    # Enable function invocations from Azure Portal.
    cors {
      allowed_origins = ["https://portal.azure.com"]
    }

    application_stack {
      node_version = "~16"
    }
  }

  resource "azurerm_app_configuration" "prod_app_config" {
  name                = "prod-app-config"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
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
  os_type                   = "windows"

  site_config {
    use_32_bit_worker              = true
    always_on                     = false
    application_stack {
      node_version                = "~16"
    }
    application_insights_key      = azurerm_application_insights.products_service_fa.instrumentation_key
    application_insights_connection_string  = azurerm_application_insights.products_service_fa.connection_string
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
      site_config["application_stack"], // workaround for a bug when azure just "kills" your app
      tags["hidden-link: /app-insights-instrumentation-key"],
      tags["hidden-link: /app-insights-resource-id"],
      tags["hidden-link: /app-insights-conn-string"]
    ]
  }
}