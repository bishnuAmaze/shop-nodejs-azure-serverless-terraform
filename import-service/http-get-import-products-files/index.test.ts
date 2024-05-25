import { HttpRequest } from "@azure/functions";
import httpTrigger from "./index";

describe("HTTP Blob SAS Token Generation", () => {
  let req: Partial<HttpRequest>;

  beforeEach(() => {
    process.env.ACCOUNT_NAME = "testAccount";
    process.env.ACCOUNT_KEY = "testAccountKey";
    process.env.CONTAINER_NAME = "testContainerName";

    req = {
      query: { name: "testFile.csv" },
      body: {},
    };
  });

  it("generates SAS token when name query parameter is provided", async () => {
    const context = {
      res: {},
      log: jest.fn(),
    };
    await httpTrigger(context as any, req as HttpRequest);
    const account = process.env.ACCOUNT_NAME;
    const containerName = process.env.CONTAINER_NAME;

    // Check if SAS URL was generated and status is 200
    expect(context.res).toEqual({
      body: {
        sasURL: expect.stringContaining(
          `https://${account}.blob.core.windows.net/${containerName}/${req.query.name}?testFile.csv`
        ),
      },
      status: 200,
    });

    // Check if log was called with correct argument
    expect(context.log).toHaveBeenCalledWith(
      "Generated SAS token for file: testFile.csv"
    );
  });

  it("returns bad request when name parameter is not provided", async () => {
    delete req.query.name;
    const context = {
      res: {},
      log: jest.fn(),
    };
    await httpTrigger(context as any, req as HttpRequest);

    // Check if status is 400
    expect(context.res).toEqual({
      status: 400,
      body: "Please provide a name parameter in the query string or in the request body",
    });
  });
});
