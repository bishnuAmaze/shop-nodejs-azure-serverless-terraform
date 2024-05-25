import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { Products } from "../products";
import { Product } from "../common/product.interface";
import { CosmosClient } from "@azure/cosmos";

// Set up connection string
const cosmosClient = new CosmosClient(process.env.COSMOSDB_CONNECTION_STRING);

// Prepare database and collections
let database = cosmosClient.database("product-details");
let productsContainer = database.container("Product");
let stocksContainer = database.container("Stocks");

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  const productId = context.bindingData.productId;

  // Get product
  const { resource: product } = await productsContainer
    .item(productId, productId)
    .read();

  // Get stock
  const { resource: productStock } = await stocksContainer
    .item(productId, productId)
    .read();

  // Combine product and stock
  const combinedData = {
    ...product,
    count: productStock ? productStock.count : 0,
  };

  // Log info about the incoming request
  context.log(`Incoming request for product with productId: ${productId}`);

  if (product) {
    context.res = {
      status: 200,
      body: combinedData,
    };
  } else {
    context.res = {
      status: 404,
      body: "Product not found",
    };
  }
};

export default httpTrigger;
