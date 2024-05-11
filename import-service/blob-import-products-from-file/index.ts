import { AzureFunction, Context } from "@azure/functions";
import {
  BlobServiceClient,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";
import csvParser = require("csv-parser");
import { Readable } from "stream";

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: Readable
): Promise<void> {
  context.log(
    "Blob trigger function processed a blob \n Name:",
    context.bindingData.name,
    "\n Blob Size:",
    context.bindingData.properties.length,
    "Bytes"
  );

  const name = context.bindingData.name;

  const account = process.env.ACCOUNT_NAME;
  const accountKey = process.env.ACCOUNT_KEY;
  const sharedKeyCredential = new StorageSharedKeyCredential(
    account,
    accountKey
  );
  const blobServiceClient = new BlobServiceClient(
    `https://${account}.blob.core.windows.net`,
    sharedKeyCredential
  );

  // Assuming myBlob stream is a CSV file
  req
    .pipe(csvParser())
    .on("data", (row) => {
      // Process each row
      context.log(`Parsed row: ${JSON.stringify(row)}`);
    })
    .on("error", (error) => {
      // Handle error
      context.log.error(`Error reading CSV file: ${error.message}`);
    })
    .on("end", async () => {
      context.log("Finished reading CSV file");

      // Move blob to 'parsed' container
      const sourceContainerClient =
        blobServiceClient.getContainerClient("uploaded");
      const destContainerClient =
        blobServiceClient.getContainerClient("parsed");
      const sourceBlobClient = sourceContainerClient.getBlobClient(name);
      const destBlobClient = destContainerClient.getBlobClient(name);

      // Copy blob to 'parsed' container
      await destBlobClient.beginCopyFromURL(sourceBlobClient.url);
      // Delete blob from 'uploaded' container
      await sourceBlobClient.deleteIfExists();
    });
};

export default httpTrigger;
