import { MongoClient, MongoClientOptions } from "mongodb";
import { fakerDE as faker } from "@faker-js/faker";
import * as dotenv from "dotenv";
dotenv.config();

const options: MongoClientOptions = {};

type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
};

type Stock = {
  product_id: string;
  count: number;
};

async function seedCollection() {
  let client: MongoClient | undefined;
  try {
    client = await MongoClient.connect(
      process.env.COSMOSDB_CONNECTION_STRING || "",
      options
    );

    const db = client.db(process.env.COSMOSDB_DB_NAME || "");
    const collection = db.collection(
      process.env.COSMOSDB_COLLECTION_NAME || ""
    );

    for (let i = 0; i < 10; i++) {
      let item: Product | Stock;

      if (process.env.IS_PRODUCTS === "true") {
        item = {
          id: faker.string.uuid(),
          title: faker.commerce.productName(),
          description: faker.commerce.productDescription(),
          price: parseFloat(faker.commerce.price()),
        };
      } else {
        item = {
          product_id: faker.string.uuid(),
          count: faker.number.int(),
        };
      }

      await collection.insertOne(item);
    }

    console.log("Seed data inserted successfully");
  } catch (err) {
    console.error(err);
  } finally {
    if (client) {
      client.close();
    }
  }
}

seedCollection();
