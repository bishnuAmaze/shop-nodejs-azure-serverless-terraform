import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";
import { v4 as uuidv4 } from 'uuid';

// Set up connection string
const cosmosClient = new CosmosClient(process.env.COSMOSDB_CONNECTION_STRING);

// Prepare database and collections
let database = cosmosClient.database("product-details");
let productsContainer = database.container("Product");

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  // Extract product info from request
  const newProduct = req.body;
  newProduct["id"] = uuidv4();

  // Validate newProduct details. This is a simple validation. You might want to enhance this as required.
  if (
    !newProduct ||
    !newProduct.id ||
    !newProduct.title ||
    !newProduct.description ||
    typeof newProduct.price !== "number"
  ) {
    context.res = {
      status: 400,
      body: "Invalid product data. Please check your request body.",
    };
    return;
  }

  // Log info about the incoming request
  context.log(
    `Incoming request to create a new product with id: ${newProduct.id}`
  );

  // Insert into DB
  await productsContainer.items.create(newProduct);

  context.res = {
    status: 201,
    body: newProduct,
  };
};

export default httpTrigger;
