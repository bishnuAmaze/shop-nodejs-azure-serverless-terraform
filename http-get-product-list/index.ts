import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { Products } from "../products";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.res = {
        status: 200,
        body: Products
    };

};

export default httpTrigger;