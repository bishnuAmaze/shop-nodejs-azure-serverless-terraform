import { AzureFunction, Context } from "@azure/functions";
import { ServiceBusClient } from "@azure/service-bus";
import {
  BlobServiceClient,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";
import csvParser = require("csv-parser");
import { Readable } from "stream";

const queueName = "csv_products_import_topic";

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: Readable
): Promise<void> {
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

  req
    .pipe(csvParser())
    .on("data", async (row) => {
      // Process each row
      let productAsMessage = JSON.stringify(row);
      const serviceBusClient = new ServiceBusClient(
        process.env.SERVICE_BUS_CONNECTION_ENDPOINT
      );
      const sender = serviceBusClient.createSender(queueName);
      await sender.sendMessages([{ body: productAsMessage }]);
      await sender.close();
    })
    .on("error", (error) => {
      context.log.error(`Error reading CSV file: ${error.message}`);
    })
    .on("end", async () => {
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
