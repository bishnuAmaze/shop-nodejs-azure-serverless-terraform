import { CosmosClient } from "@azure/cosmos";
import { AzureFunction, Context, HttpRequest } from "@azure/functions";

// Set up connection string
const cosmosClient = new CosmosClient(process.env.COSMOSDB_CONNECTION_STRING);

// Prepare database and collections
let database = cosmosClient.database("product-details");
let stocksContainer = database.container("Stocks");

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  // Get stocks
  const stocks = await stocksContainer.items.readAll().fetchAll();

  // Calculate total quantity
  const total = stocks.resources.reduce(
    (sum, stock) => sum + (stock.count || 0),
    0
  );

  // Log info about the incoming request
  context.log(`Incoming request for total products, total count is ${total}`);

  context.res = {
    status: 200,
    body: { total },
  };
};

export default httpTrigger;
