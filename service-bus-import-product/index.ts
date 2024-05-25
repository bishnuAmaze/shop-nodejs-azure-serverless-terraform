import { CosmosClient } from "@azure/cosmos";
import { AzureFunction, Context } from "@azure/functions";

const cosmosClient = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
const database = cosmosClient.database("product-details");
const container = database.container("Product");

const httpTrigger: AzureFunction = async function (
  context: Context,
  mySbMsg: string
): Promise<void> {
  context.log("ServiceBus queue trigger function processed message", mySbMsg);

  let product = JSON.parse(mySbMsg); // adjust if necessary
  await container.items.create(product);
};
export default httpTrigger;
