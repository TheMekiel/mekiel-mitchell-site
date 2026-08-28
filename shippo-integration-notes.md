# Shippo Integration Notes

## Verified test-mode behavior

Source: [Shippo — How to use Test Mode](https://docs.goshippo.com/guides/testing)

Shippo test mode requires a key beginning with `shippo_test_`. Shippo recommends real, verifiable addresses even during testing. Test labels are watermarked and cannot be mailed. Test-mode rates may differ from live rates, and test tracking numbers do not receive tracking updates. Test and live data are isolated; carrier accounts may also need to be connected separately for test and live use.

## Architecture selected for this project

The website will use deterministic server-side API handlers for rate quotes and webhook events. Buyer destination details will be collected in the purchase drawer and submitted to the server. The Shippo API key will remain server-side. A validated shipment request will combine the buyer destination, the owner-provided fulfillment origin, and product parcel data. Live labels and tracking updates will not be activated until the user supplies the live Shippo key, origin/return address, and parcel weights/dimensions.

The current test key is sufficient to validate authentication and request/response handling, but a real fulfillment origin and parcel definitions are still required to verify meaningful live-rate quotes. No fabricated origin address or package measurements will be committed.
