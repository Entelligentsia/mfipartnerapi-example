let STAGE = process.env.mygold_stage ? process.env.mygold_stage : "dev";
const config = require("../../../config/credentials.json")[STAGE];
const DvaraGold = require("../../../cliient/dvaragold");
const extCustomerId = "EXT0";
const bullion = {
  bullionShortName: "G22K",
  bullionName: "Gold",
  purity: { displayValue: "22Kt - (91.6%)", value: "916" },
  status: "available",
  isBaseBullion: false,
  id: "G3",
};

const order = {

  agent: { extAgentId: 'EXTAGT02', name: { first: "Koshi", middle: "Venkateshwara", last: "Shaikh" } },
  // "orderTotalValueInr": 10,
  "jewelleryItems": [
    {
      "coinId": "e0066110-dd2e-11ea-88f6-8bd81abcab40",
      "quantity": 1,
      "bullionRateId": "string",
      // "totalPriceInr": 0,
      // "chargesAmountInr": 0,
      // "taxAmountInr": 0
    }
  ],
  "paymentPlan": {
    "useBullionBalance": [
      {
        "bullion": bullion,
        "maxBullionWtGm": 1
      }
    ],
    "alternatePaymentMode": "partnercollect",
  },
  "shipment": {
    "shippingAddress": {
      "houseNumber": "string",
      "streetName": "string",
      "area": "string",
      "cityOrVillage": "string",
      "postOffice": "string",
      "district": "string",
      "pinCode": 0,
      "state": "IN-AN",
      "stdCode": 0,
      "landmark": "string",
      "country": "string"
    },
    "shippingCharges": [
      {
        "type": "making",
        "chargesInr": 0,
        "taxTotalInr": 0,
        "taxes": [
          {
            "taxName": "gst, cess etc",
            "taxCode": "igst, sgst, cgst, utst etc",
            "taxRatePercent": 0,
            "taxAmountInr": 0
          }
        ]
      }
    ]
  },

  "extReferenceId": "string",
  "orderdetail": {
    "additionalProp1": "string",
    "additionalProp2": "string",
    "additionalProp3": "string"
  }


};
const filterProducts = {
  category: 'coin',

}

async function test() {
  let client = await DvaraGold.Client(config);
  let jewellery = await client.getProducts(filterProducts, extCustomerId);
  order.jewelleryItems[0].coinId = jewellery[0].id;
  order.jewelleryItems[0].bullionRateId = jewellery[0].bullionRateId;
  order.paymentPlan.useBullionBalance[0].maxBullionWtGm = jewellery[0].weightInGm;
  return await client.createCoinOrder(extCustomerId, order);

}
test()
  .then((result) => {
    console.dir(result);
  })
  .catch((err) => {
    console.error(JSON.stringify(err));
  })
  .finally(() => {
    process.exit(0);
  });
