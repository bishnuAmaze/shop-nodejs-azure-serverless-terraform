import { AzureFunction, Context } from "@azure/functions";
import { Readable } from "stream";
import httpTrigger from "./index";

describe("CSV Processing Blob Trigger", () => {
  let func: AzureFunction;
  let context: Partial<Context>;
  let req: Readable;

  beforeEach(() => {
    context = {
      bindingData: { name: "test_file.csv", properties: { length: 100 } },
      log: jest.fn().mockImplementation(() => ({ error: jest.fn() })),
    } as any;
  });

  it("processes CSV file", async () => {
    const csvString = `name,age\nJohn,27\nJane,30`;
    req = Readable.from([csvString]);
    await httpTrigger(context as any, req);

    expect(context.log).toHaveBeenCalledWith(
      "Blob trigger function processed a blob \n Name:",
      "test_file.csv",
      "\n Blob Size:",
      100,
      "Bytes"
    );
    expect(context.log).toHaveBeenCalledWith(
      'Parsed row: {"name":"John","age":"27"}'
    );
    expect(context.log).toHaveBeenCalledWith(
      'Parsed row: {"name":"Jane","age":"30"}'
    );
    expect(context.log).toHaveBeenCalledWith("Finished reading CSV file");
  });

  // you could add more tests here for different scenarios...
});
