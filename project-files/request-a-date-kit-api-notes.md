# Request a Date — Kit API Notes

Kit’s official documentation states that custom fields must already exist before they are submitted with a form subscription. Custom-field HTML names are generated identifiers prefixed with `ck_field`; the account custom-fields endpoint exposes each field’s label, key, and HTML name.

| Purpose | Endpoint / source |
|---|---|
| List account forms | `GET /v3/forms` with the account API key |
| Add a subscriber to a form | `POST /v3/forms/{form_id}/subscribe` with email, first name, and existing custom fields |
| List account custom fields | `GET /v3/custom_fields` with the account API key |

## References

1. [Kit Developer Documentation — Forms](https://developers.kit.com/api-reference/v3/forms)
2. [Kit Developer Documentation — Custom Fields](https://developers.kit.com/api-reference/v3/custom_fields)
3. [Kit Developer Documentation — API Overview](https://developers.kit.com/api-reference/overview)
