import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { Products } from "../products";
import { Product } from "../common/product.interface";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const productId = context.bindingData.productId;

    const product: Product | undefined = Products.find(p => p.id === productId);

    if (product) {
        context.res = {
            status: 200,
            body: product
        };
    } else {
        context.res = {
            status: 404,
            body: "Product not found"
        };
    }

};

export default httpTrigger;