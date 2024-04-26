import { AzureFunction, Context, HttpRequest } from "@azure/functions";
// import { Products } from "../products";
import { CosmosClient } from "@azure/cosmos";

// Set up connection string
const cosmosClient = new CosmosClient(process.env.COSMOSDB_CONNECTION_STRING);

// Prepare database and collections
let database = cosmosClient.database("product-details");
let productsContainer = database.container("Product");
let stocksContainer = database.container("Stocks");

const httpTrigger: AzureFunction = async function (
  context: Context,
  _req: HttpRequest
): Promise<void> {
  // Get products
  const products = await productsContainer.items.readAll().fetchAll();

  // Get stocks
  const stocks = await stocksContainer.items.readAll().fetchAll();

  // Combine products and stocks
  const combinedData = products.resources.map((product) => {
    // Find corresponding stock for product
    const productStock = stocks.resources.find(
      (stock) => stock.product_id === product.id
    );

    return {
      ...product,
      count: productStock ? productStock.count : 0,
    };
  });

  // Log info about the incoming request
  context.log(
    `Incoming request for all products, found ${combinedData.length} products`
  );

  context.res = {
    status: 200,
    body: combinedData,
  };
};

export default httpTrigger;
