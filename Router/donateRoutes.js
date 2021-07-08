var paypal = require('paypal-rest-sdk');
var easyinvoice = require('easyinvoice');
const express = require('express')
const util = require('../util')
const Router = express.Router();
var fs = require('fs');
const key = require('../configkey')

paypal.configure({
    'mode': 'sandbox', //sandbox or live
    'client_id': key.clientID,
    'client_secret': key.clientSecret,
    'headers': {
      'custom': 'header'
    }
  });


var amount = 0

Router.post('/sendmoney', (req, res) => {
  console.log(req.body)
  amount = req.body.amount;
  const create_payment_json = {
    "intent": "sale",
    "payer": {
      "payment_method": "paypal"
    },
    "redirect_urls": {
      "return_url": "http://localhost:3000/donate/success",
      "cancel_url": "http://localhost:3000/donate/cancel"
    },
    "transactions": [{
      "item_list": {
        "items": [{
          "name": req.body.orderName,
          "sku": req.body.orderId,
          "price": req.body.amount,
          "currency": "USD",
          "quantity": 1
        }]
      },
      "amount": {
        "currency": "USD",
        "total": req.body.amount
      },
      "description": req.body.desc
    }]
  };

  paypal.payment.create(create_payment_json, function (error, payment) {
    if (error) {
      throw error;
    } else {
      console.log(payment);
      for (let i = 0; i < payment.links.length; i++) {
        if (payment.links[i].rel === 'approval_url') {
          res.redirect(payment.links[i].href);
        }
      }
    }
  });

});


Router.get('/success', (req, res) => {
  const payerId = req.query.PayerID;
  const paymentId = req.query.paymentId;

  const invoiceData = {}

  const execute_payment_json = {
    "payer_id": payerId,
    "transactions": [{
      "amount": {
        "currency": "USD",
        "total": amount
      }
    }]
  };

  paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
    if (error) {
      console.log(error.response);
      throw error;
    } else {
      console.log(JSON.stringify(payment));



      console.log(payment.id,payment.transactions[0].amount.total)
      var create_invoice_json = {
        "merchant_info": {
          "email": "sb-ft2cf6223430@business.example.com",
          "first_name": "John",
          "last_name": "Doe",
          "business_name": "Medical Professionals, LLC",
          "phone": {
            "country_code": "+91",
            "national_number": "2035394687"
          },
          "address": {
            "line1": "1234 Main St.",
            "city": "Portland",
            "state": "OR",
            "postal_code": "97217",
            "country_code": "US"
          }
        },
        "billing_info": [{
          "email": "example@example.com"
        }],
        "items": [{
          "name": "Sutures",
          "quantity": 1,
          "unit_price": {
            "currency": "USD",
            "value": payment.transactions[0].amount.total
          }
        }],
        "note": "Medical Invoice 16 Jul, 2013 PST",
        "payment_term": {
          "term_type": "NET_45"
        },
        "shipping_info": {
          "first_name": "Sally",
          "last_name": "Patient",
          "business_name": "Not applicable",
          "phone": {
            "country_code": "001",
            "national_number": "5039871234"
          },
          "address": {
            "line1": "1234 Broad St.",
            "city": "Portland",
            "state": "OR",
            "postal_code": "97216",
            "country_code": "US"
          }
        },
        "tax_inclusive": false,
        "total_amount": {
          "currency": "USD",
          "value": "500.00"
        }
      };




      paypal.invoice.create(create_invoice_json, function (error, invoice) {
        if (error) {
          throw error;
        } else {
          console.log("Create Invoice Response");
          console.log(invoice, 'is the invoice');
            invoiceData[0]=invoice;
          //getting the invoice         
          var invoiceId = invoice.id;

          paypal.invoice.get(invoiceId, function (error, invoice) {
            if (error) {
              throw error;
            } else {
              console.log("Get Invoice Response");
              console.log(JSON.stringify(invoice));
            }
          });
        }
      });

      paypal.invoiceTemplate.create(util.invoice_template_json(), function (error, invoice_template) {
        paypal.invoiceTemplate.get(invoice_template.template_id, function (error, invoice_template) {
          if (error) {
            throw error;
          } else {
            console.log("Get Invoice Template Response:");
            console.log('--->',invoiceData[0].id);


            //printing invoices all data 
            var data = {
              //"documentTitle": "RECEIPT", //Defaults to INVOICE
              //"locale": "de-DE", //Defaults to en-US, used for number formatting (see docs)
              "currency": "USD", //See documentation 'Locales and Currency' for more info
              "taxNotation": "GST", //or gst
              "marginTop": 25,
              "marginRight": 25,
              "marginLeft": 25,
              "marginBottom": 25,
              "logo": "https://public.easyinvoice.cloud/img/logo_en_original.png", 
              "background": "https://public.easyinvoice.cloud/img/watermark-draft.jpg", 
              "sender": {
                "company": invoiceData[0].merchant_info.email,
                "address": "Sample Street 123",
                "zip": "1234 AB",
                "city": "Sampletown",
                "country": 'invoice_template.merchant_info.address.country_code'
                //"custom1": "custom value 1",
                //"custom2": "custom value 2",
                //"custom3": "custom value 3"
              },
              "client": {
                "company": "Client Corp",
                "address": "Clientstreet 456",
                "zip": "4567 CD",
                "city": "Clientcity",
                "country": "Clientcountry"
                //"custom1": "custom value 1",
                //"custom2": "custom value 2",
                //"custom3": "custom value 3"
              },

              "invoiceNumber": invoice_template,
              "invoiceDate": "",
              "products": [
                {
                  "quantity": invoiceData[0].items[0].quantity,
                  "description": "Donation",
                  "tax": 6,
                  "price": invoiceData[0].items[0].unit_price.value
                },
                
              ],
              "bottomNotice": "Kindly pay your invoice within 15 days.",
              //Used for translating the headers to your preferred language
              //Defaults to English. Below example is translated to Dutch
              // "translate": { 
              //     "invoiceNumber": "Factuurnummer",
              //     "invoiceDate": "Factuurdatum",
              //     "products": "Producten", 
              //     "quantity": "Aantal", 
              //     "price": "Prijs",
              //     "subtotal": "Subtotaal",
              //     "total": "Totaal" 
              // }
            };

            //Create your invoice! Easy!
            easyinvoice.createInvoice(data, async function async(result) {
              
              await fs.writeFileSync("invoice.pdf", result.pdf, 'base64');
              res.download('./invoice.pdf')
            
            });

          }
        });
      });
    }
  });
});

Router.get('/cancel', (req, res) => res.send('cancel'))

module.exports = Router;