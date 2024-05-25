import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import {
  BlobSASPermissions,
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
} from "@azure/storage-blob";

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  const name = req.query.name || (req.body && req.body.name);

  // Check if name was provided
  if (!name) {
    context.res = {
      status: 400,
      body: "Please provide a name parameter in the query string or in the request body",
    };
    return;
  }

  // Get storage account connection string and account name from App Setting or Azure Key Vault
  const account = process.env.ACCOUNT_NAME;
  const accountKey = process.env.ACCOUNT_KEY;
  const containerName = process.env.CONTAINER_NAME;

  const sharedKeyCredential = new StorageSharedKeyCredential(
    account,
    accountKey
  );

  const permissions = BlobSASPermissions.parse("racwd"); // read, add, create, write, delete
  const startDate = new Date();
  const expiryDate = new Date(startDate);
  expiryDate.setMinutes(startDate.getMinutes() + 100);
  startDate.setMinutes(startDate.getMinutes() - 100);

  const sasQueryParameters = generateBlobSASQueryParameters(
    {
      containerName,
      blobName: name,
      permissions: permissions,
      startsOn: startDate,
      expiresOn: expiryDate,
    },
    sharedKeyCredential
  );

  const sasURL = `https://${account}.blob.core.windows.net/${containerName}/${name}?${sasQueryParameters.toString()}`;

  context.res = {
    body: {
      sasURL: sasURL,
    },
    status: 200,
  };

  context.log(`Generated SAS token for file: ${name}`);
};

export default httpTrigger;
